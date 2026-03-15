/**
 * Task Dispatcher — the missing link between OpenClaw agents and competition engines.
 *
 * Completes the race loop:
 *   deploy SOUL.md → dispatch TASK.md → agent executes → collect SUBMISSION.md → judge
 *
 * Design principles:
 * 1. File protocol: no HTTP required from agents, just file read/write
 * 2. Pluggable I/O: swap FileWorkspaceIO for remote/memory backends
 * 3. Event-driven: all lifecycle stages emit events via the org EventBus
 * 4. Timeout-aware: agents that fail to submit within timeLimit are marked as timed out
 * 5. Fault-tolerant: partial dispatch failures don't crash the whole pipeline
 */

import type { WorkspaceIO } from './workspace-io.js';
import type { EventBus } from '../core/event-bus.js';

// ─── Types ──────────────────────────────────────

export interface EvaluationCriterion {
  name: string;
  weight: number;
  description: string;
}

export interface DispatchTask {
  /** Unique task ID */
  id: string;
  /** Human-readable title */
  title: string;
  /** Full task description for agents */
  description: string;
  /** Evaluation criteria (passed through to judge) */
  criteria: EvaluationCriterion[];
  /** Maximum time allowed for submissions (ms) */
  timeoutMs: number;
  /** Agent IDs that should participate */
  participants: string[];
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface AgentSubmission {
  agentId: string;
  output: string;
  submittedAt: string;
  /** Time from dispatch to submission (ms) */
  duration: number;
}

export interface DispatchResult {
  taskId: string;
  taskTitle: string;
  dispatchedAt: string;
  collectedAt: string;
  submissions: AgentSubmission[];
  /** Agents that did not submit in time */
  timedOut: string[];
  /** Agents that failed during dispatch (TASK.md could not be written) */
  dispatchFailed: string[];
}

export interface DispatcherOptions {
  /** Polling interval for checking submissions (ms, default: 2000) */
  pollIntervalMs?: number;
  /** Whether to clean up TASK.md and SUBMISSION.md after collection (default: true) */
  cleanup?: boolean;
  /** Optional EventBus for emitting race lifecycle events */
  eventBus?: EventBus;
}

// ─── Task Markdown Generator ────────────────────

function generateTaskMarkdown(task: DispatchTask, agentId: string): string {
  const lines: string[] = [
    `# 📋 Task: ${task.title}`,
    '',
    `> **Task ID**: \`${task.id}\``,
    `> **Participant**: \`${agentId}\``,
    `> **Time Limit**: ${Math.round(task.timeoutMs / 1000)}s`,
    '',
    '---',
    '',
    '## Description',
    '',
    task.description,
    '',
  ];

  if (task.criteria.length > 0) {
    lines.push('## Evaluation Criteria', '');
    lines.push('| Criterion | Weight | Description |');
    lines.push('|-----------|--------|-------------|');
    for (const c of task.criteria) {
      lines.push(`| ${c.name} | ${c.weight} | ${c.description} |`);
    }
    lines.push('');
  }

  lines.push(
    '## How to Submit',
    '',
    'Write your response to a file named `SUBMISSION.md` in this workspace directory.',
    'The dispatcher will automatically collect your submission.',
    '',
    '---',
    `*Dispatched at: ${new Date().toISOString()}*`,
  );

  return lines.join('\n');
}

// ─── Submission Parser ──────────────────────────

function parseSubmission(raw: string): string {
  // For now, the entire SUBMISSION.md content is the output.
  // Future: support structured frontmatter (confidence, reasoning, etc.)
  return raw.trim();
}

// ─── TaskDispatcher ─────────────────────────────

/**
 * Dispatches tasks to agent workspaces and collects their submissions.
 *
 * Usage:
 * ```typescript
 * const io = new FileWorkspaceIO();
 * const dispatcher = new TaskDispatcher(io, { eventBus: universe.events });
 *
 * const result = await dispatcher.run({
 *   id: 'race-001',
 *   title: '撰写一篇策论',
 *   description: '就"如何提升协作效率"撰写500字策论',
 *   criteria: [{ name: '质量', weight: 0.6, description: '...' }],
 *   timeoutMs: 60000,
 *   participants: ['zhenhuan', 'huafei', 'anlingrong'],
 * });
 * ```
 */
export class TaskDispatcher {
  private readonly io: WorkspaceIO;
  private readonly pollIntervalMs: number;
  private readonly cleanup: boolean;
  private readonly eventBus?: EventBus;

  constructor(io: WorkspaceIO, options: DispatcherOptions = {}) {
    this.io = io;
    this.pollIntervalMs = options.pollIntervalMs ?? 2000;
    this.cleanup = options.cleanup ?? true;
    this.eventBus = options.eventBus;
  }

  /**
   * Dispatch a task to all participants' workspaces.
   * Writes TASK.md to each agent's workspace directory.
   * Returns the list of agent IDs that failed to receive the task.
   */
  async dispatch(task: DispatchTask): Promise<string[]> {
    const failed: string[] = [];

    // Clear any stale submissions first (best effort)
    for (const agentId of task.participants) {
      try {
        await this.io.clearSubmission(agentId);
        await this.io.clearTask(agentId);
      } catch {
        // Stale cleanup is best-effort; if it fails, continue
      }
    }

    // Write task to each workspace
    for (const agentId of task.participants) {
      try {
        const markdown = generateTaskMarkdown(task, agentId);
        await this.io.writeTask(agentId, markdown);
      } catch (err) {
        failed.push(agentId);
        console.warn(
          `[TaskDispatcher] Failed to dispatch TASK.md to ${agentId}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    // Emit event
    if (this.eventBus) {
      const dispatched = task.participants.filter(id => !failed.includes(id));
      await this.eventBus.emitSimple(
        'race.dispatched',
        dispatched,
        `任务「${task.title}」已下发给 ${dispatched.length} 名参赛者` +
          (failed.length > 0 ? `（${failed.length} 名下发失败）` : ''),
        { taskId: task.id, participants: dispatched, failed }
      );
    }

    return failed;
  }

  /**
   * Collect submissions from participants, polling until timeout.
   * Returns all collected submissions and which agents timed out.
   */
  async collect(
    task: DispatchTask,
    dispatchedAt: string,
    excludeAgents: string[] = []
  ): Promise<DispatchResult> {
    const startTime = Date.now();
    // Only wait for agents that actually received the task
    const activeParticipants = task.participants.filter(id => !excludeAgents.includes(id));
    const remaining = new Set(activeParticipants);
    const submissions: AgentSubmission[] = [];

    // Poll for submissions
    while (remaining.size > 0) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= task.timeoutMs) break;

      for (const agentId of [...remaining]) {
        try {
          const raw = await this.io.readSubmission(agentId);
          if (raw !== null) {
            const output = parseSubmission(raw);
            submissions.push({
              agentId,
              output,
              submittedAt: new Date().toISOString(),
              duration: Date.now() - startTime,
            });
            remaining.delete(agentId);

            // Emit per-agent submission event
            if (this.eventBus) {
              await this.eventBus.emitSimple(
                'race.submitted',
                [agentId],
                `${agentId} 已提交赛马结果`,
                { taskId: task.id, agentId, duration: Date.now() - startTime }
              );
            }
          }
        } catch {
          // Read failure is transient (file being written); retry on next poll
        }
      }

      if (remaining.size === 0) break;

      // Wait before next poll (but don't exceed timeout)
      const remainingMs = task.timeoutMs - (Date.now() - startTime);
      if (remainingMs <= 0) break;
      await sleep(Math.min(this.pollIntervalMs, remainingMs));
    }

    const timedOut = [...remaining];
    const collectedAt = new Date().toISOString();

    // Cleanup files (best effort)
    if (this.cleanup) {
      for (const agentId of task.participants) {
        try {
          await this.io.clearTask(agentId);
          await this.io.clearSubmission(agentId);
        } catch {
          // Cleanup is best-effort
        }
      }
    }

    // Emit collection complete event
    if (this.eventBus) {
      await this.eventBus.emitSimple(
        'race.collected',
        task.participants,
        `任务「${task.title}」收集完成: ${submissions.length} 份提交, ${timedOut.length} 超时`,
        { taskId: task.id, submitted: submissions.length, timedOut }
      );
    }

    return {
      taskId: task.id,
      taskTitle: task.title,
      dispatchedAt,
      collectedAt,
      submissions,
      timedOut,
      dispatchFailed: excludeAgents,
    };
  }

  /**
   * Run a complete dispatch-collect cycle: dispatch task, wait for submissions, return results.
   * This is the primary high-level API.
   *
   * Agents that fail to receive the task are excluded from collection
   * and reported in `dispatchFailed`.
   */
  async run(task: DispatchTask): Promise<DispatchResult> {
    if (task.participants.length === 0) {
      return {
        taskId: task.id,
        taskTitle: task.title,
        dispatchedAt: new Date().toISOString(),
        collectedAt: new Date().toISOString(),
        submissions: [],
        timedOut: [],
        dispatchFailed: [],
      };
    }

    const dispatchedAt = new Date().toISOString();
    const failed = await this.dispatch(task);
    return this.collect(task, dispatchedAt, failed);
  }
}

// ─── Helpers ────────────────────────────────────

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
