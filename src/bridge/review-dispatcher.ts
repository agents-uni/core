/**
 * Review Dispatcher — adds agent-to-agent negotiation/feedback to the task flow.
 *
 * Extends the standard dispatch pipeline with an optional review round:
 *   TASK.md → SUBMISSION.md → REVIEW_TASK.md → REVIEW.md → RelationshipEvents
 *
 * After initial submissions are collected, agents can review each other's work,
 * generating real interaction data for relationship evolution.
 *
 * This is opt-in and backward compatible — existing dispatch flows are unchanged.
 */

import type { WorkspaceIO } from './workspace-io.js';
import type { EventBus } from '../core/event-bus.js';
import type { DispatchTask, AgentSubmission } from './task-dispatcher.js';
import type { EvolutionEngine } from '@agents-uni/rel';

// ─── Types ──────────────────────────────────────

export interface ReviewConfig {
  /** Custom prompt for the review task (default: standard review prompt) */
  reviewPrompt?: string;
  /** Max time for agents to submit reviews (ms, default: 60000) */
  reviewTimeoutMs?: number;
  /** Whether agents should score each other (default: true) */
  includeScoring?: boolean;
  /** Whether to exclude an agent's own submission from their review (default: true) */
  excludeSelfSubmission?: boolean;
}

export interface AgentReview {
  reviewerId: string;
  reviews: SingleReview[];
  submittedAt: string;
  duration: number;
}

export interface SingleReview {
  targetAgentId: string;
  score?: number;
  feedback: string;
}

export interface ReviewResult {
  taskId: string;
  reviews: AgentReview[];
  timedOut: string[];
  dispatchFailed: string[];
}

export interface ReviewDispatcherOptions {
  pollIntervalMs?: number;
  cleanup?: boolean;
  eventBus?: EventBus;
  /** If provided, review events are automatically applied to the evolution engine */
  evolutionEngine?: EvolutionEngine;
}

// ─── File Names ─────────────────────────────────

const REVIEW_TASK_FILENAME = 'REVIEW_TASK.md';
const REVIEW_FILENAME = 'REVIEW.md';

// ─── Review Task Markdown Generator ─────────────

function generateReviewTaskMarkdown(
  originalTask: DispatchTask,
  reviewerAgentId: string,
  submissions: AgentSubmission[],
  config: ReviewConfig
): string {
  const lines: string[] = [
    '# 📝 Review Task',
    '',
    `> **Original Task**: \`${originalTask.title}\``,
    `> **Task ID**: \`${originalTask.id}\``,
    `> **Reviewer**: \`${reviewerAgentId}\``,
    `> **Time Limit**: ${Math.round((config.reviewTimeoutMs ?? 60_000) / 1000)}s`,
    '',
    '---',
    '',
    '## Original Task Description',
    '',
    originalTask.description,
    '',
    '---',
    '',
    '## Submissions to Review',
    '',
  ];

  const filteredSubmissions = config.excludeSelfSubmission !== false
    ? submissions.filter(s => s.agentId !== reviewerAgentId)
    : submissions;

  for (const submission of filteredSubmissions) {
    lines.push(`### Agent: \`${submission.agentId}\``);
    lines.push('');
    lines.push(submission.output);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Review instructions
  lines.push('## Review Instructions');
  lines.push('');

  if (config.reviewPrompt) {
    lines.push(config.reviewPrompt);
  } else {
    lines.push('Please review each submission above and provide your feedback.');
    lines.push('');
    lines.push('For each submission, include:');
    if (config.includeScoring !== false) {
      lines.push('- **Score**: A score from 1-10');
    }
    lines.push('- **Feedback**: Your constructive feedback');
    lines.push('- **Strengths**: What was done well');
    lines.push('- **Improvements**: What could be improved');
  }

  lines.push('');
  lines.push('## How to Submit');
  lines.push('');
  lines.push('Write your review to `REVIEW.md` in this workspace directory.');
  lines.push('After writing REVIEW.md, create an empty file named `.REVIEW_DONE` to signal completion.');
  lines.push('');
  lines.push('---');
  lines.push(`*Review dispatched at: ${new Date().toISOString()}*`);

  return lines.join('\n');
}

// ─── Review Parser ──────────────────────────────

function parseReviewSubmission(
  raw: string,
  reviewerId: string,
  availableTargets: string[]
): AgentReview {
  const reviews: SingleReview[] = [];

  // Try to parse structured reviews (agent-by-agent)
  for (const targetId of availableTargets) {
    if (targetId === reviewerId) continue;

    // Look for mentions of the target agent in the review
    const regex = new RegExp(`(?:agent|Agent)[:\\s]*\`?${escapeRegExp(targetId)}\`?`, 'i');
    if (regex.test(raw)) {
      // Extract score if present (look for "Score: N" or "N/10" patterns near the agent mention)
      const scoreMatch = raw.match(new RegExp(
        `${escapeRegExp(targetId)}[\\s\\S]{0,200}?(?:score|Score)[:\\s]*([0-9]+(?:\\.[0-9]+)?)`,
        'i'
      ));
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : undefined;

      reviews.push({
        targetAgentId: targetId,
        score: score !== undefined && score >= 0 && score <= 10 ? score : undefined,
        feedback: raw, // MVP: full review text as feedback
      });
    }
  }

  // If no structured reviews found, create a generic review for all targets
  if (reviews.length === 0) {
    for (const targetId of availableTargets) {
      if (targetId === reviewerId) continue;
      reviews.push({
        targetAgentId: targetId,
        feedback: raw.trim(),
      });
    }
  }

  return {
    reviewerId,
    reviews,
    submittedAt: new Date().toISOString(),
    duration: 0, // Will be set by caller
  };
}

// ─── Extended WorkspaceIO Methods ───────────────

async function writeReviewTask(io: WorkspaceIO, agentId: string, content: string): Promise<void> {
  await io.writeReviewTask(agentId, content);
}

async function readReview(io: WorkspaceIO, agentId: string): Promise<string | null> {
  return io.readReview(agentId);
}

// ─── ReviewDispatcher ───────────────────────────

/**
 * Dispatches review tasks to agents after initial submissions are collected.
 *
 * Usage:
 * ```typescript
 * const reviewer = new ReviewDispatcher(io);
 *
 * // After initial task dispatch and collection:
 * const reviewResult = await reviewer.dispatchReviews(
 *   originalTask,
 *   dispatchResult.submissions,
 *   { reviewTimeoutMs: 60000 }
 * );
 * ```
 */
export class ReviewDispatcher {
  private readonly io: WorkspaceIO;
  private readonly pollIntervalMs: number;
  private readonly cleanup: boolean;
  private readonly eventBus?: EventBus;
  private readonly evolutionEngine?: EvolutionEngine;

  constructor(io: WorkspaceIO, options: ReviewDispatcherOptions = {}) {
    this.io = io;
    this.pollIntervalMs = options.pollIntervalMs ?? 2000;
    this.cleanup = options.cleanup ?? true;
    this.eventBus = options.eventBus;
    this.evolutionEngine = options.evolutionEngine;
  }

  /**
   * Dispatch review tasks to all agents that submitted, and collect their reviews.
   *
   * Each agent receives a REVIEW_TASK.md containing:
   * - The original task description
   * - All other agents' submissions
   * - Instructions to review and provide feedback
   *
   * Returns parsed reviews with sentiment signals for relationship evolution.
   */
  async dispatchReviews(
    originalTask: DispatchTask,
    submissions: AgentSubmission[],
    config: ReviewConfig = {}
  ): Promise<ReviewResult> {
    const reviewerIds = submissions.map(s => s.agentId);
    const dispatchFailed: string[] = [];
    const reviewTimeoutMs = config.reviewTimeoutMs ?? 60_000;

    // Clear stale files
    for (const agentId of reviewerIds) {
      try {
        await this.io.clearReview(agentId);
        await this.io.clearReviewTask(agentId);
      } catch {
        // best-effort
      }
    }

    // Write review tasks
    for (const agentId of reviewerIds) {
      try {
        const markdown = generateReviewTaskMarkdown(
          originalTask, agentId, submissions, config
        );
        await writeReviewTask(this.io, agentId, markdown);
      } catch (err) {
        dispatchFailed.push(agentId);
        console.warn(
          `[ReviewDispatcher] Failed to dispatch review to ${agentId}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    // Emit event
    if (this.eventBus) {
      const dispatched = reviewerIds.filter(id => !dispatchFailed.includes(id));
      await this.eventBus.emitSimple(
        'review.dispatched',
        dispatched,
        `Review task for「${originalTask.title}」dispatched to ${dispatched.length} agents`,
        { taskId: originalTask.id, reviewers: dispatched }
      );
    }

    // Poll for reviews
    const startTime = Date.now();
    const remaining = new Set(
      reviewerIds.filter(id => !dispatchFailed.includes(id))
    );
    const reviews: AgentReview[] = [];

    while (remaining.size > 0) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= reviewTimeoutMs) break;

      for (const agentId of [...remaining]) {
        try {
          const raw = await readReview(this.io, agentId);
          if (raw !== null) {
            const review = parseReviewSubmission(raw, agentId, reviewerIds);
            review.duration = Date.now() - startTime;
            reviews.push(review);
            remaining.delete(agentId);
          }
        } catch {
          // transient failure, retry
        }
      }

      if (remaining.size === 0) break;

      const remainingMs = reviewTimeoutMs - (Date.now() - startTime);
      if (remainingMs <= 0) break;
      await sleep(Math.min(this.pollIntervalMs, remainingMs));
    }

    // Cleanup
    if (this.cleanup) {
      for (const agentId of reviewerIds) {
        try {
          await this.io.clearReviewTask(agentId);
          await this.io.clearReview(agentId);
        } catch {
          // best-effort
        }
      }
    }

    // Emit completion event
    if (this.eventBus) {
      await this.eventBus.emitSimple(
        'race.collected',
        reviewerIds,
        `Reviews for「${originalTask.title}」collected: ${reviews.length} reviews, ${remaining.size} timed out`,
        { taskId: originalTask.id, collected: reviews.length, timedOut: [...remaining] }
      );
    }

    const result: ReviewResult = {
      taskId: originalTask.id,
      reviews,
      timedOut: [...remaining],
      dispatchFailed,
    };

    // Auto-wire review events to evolution engine if configured
    if (this.evolutionEngine) {
      const events = this.inferRelationshipEvents(result);
      for (const event of events) {
        try {
          this.evolutionEngine.processEvent(
            event.from,
            event.to,
            event.type,
            { description: event.description }
          );
        } catch {
          // Evolution processing failure is non-fatal
        }
      }
    }

    return result;
  }

  /**
   * Infer relationship events from review results.
   *
   * Returns events that can be fed to @agents-uni/rel EvolutionEngine.
   */
  inferRelationshipEvents(result: ReviewResult): Array<{
    from: string;
    to: string;
    type: string;
    impact: Record<string, number>;
    description: string;
  }> {
    const events: Array<{
      from: string;
      to: string;
      type: string;
      impact: Record<string, number>;
      description: string;
    }> = [];

    for (const review of result.reviews) {
      for (const singleReview of review.reviews) {
        // Determine event type based on score and feedback
        if (singleReview.score !== undefined) {
          if (singleReview.score >= 7) {
            events.push({
              from: review.reviewerId,
              to: singleReview.targetAgentId,
              type: 'review.positive',
              impact: { trust: 0.05, respect: 0.03 },
              description: `${review.reviewerId} gave positive review (${singleReview.score}/10) to ${singleReview.targetAgentId}`,
            });
          } else if (singleReview.score <= 4) {
            events.push({
              from: review.reviewerId,
              to: singleReview.targetAgentId,
              type: 'review.critical',
              impact: { scrutiny: 0.05, rivalry: 0.02 },
              description: `${review.reviewerId} gave critical review (${singleReview.score}/10) to ${singleReview.targetAgentId}`,
            });
          } else {
            events.push({
              from: review.reviewerId,
              to: singleReview.targetAgentId,
              type: 'review.constructive',
              impact: { respect: 0.03, trust: 0.01 },
              description: `${review.reviewerId} gave constructive review (${singleReview.score}/10) to ${singleReview.targetAgentId}`,
            });
          }
        } else {
          // No score, infer from keywords
          const feedback = singleReview.feedback.toLowerCase();
          const isPositive = /excellent|great|impressive|well done|agree|strong/i.test(feedback);
          const isNegative = /weak|poor|disagree|incorrect|lacks|missing/i.test(feedback);

          if (isPositive) {
            events.push({
              from: review.reviewerId,
              to: singleReview.targetAgentId,
              type: 'review.positive',
              impact: { trust: 0.04, respect: 0.02 },
              description: `${review.reviewerId} reviewed ${singleReview.targetAgentId} positively`,
            });
          } else if (isNegative) {
            events.push({
              from: review.reviewerId,
              to: singleReview.targetAgentId,
              type: 'review.critical',
              impact: { scrutiny: 0.04, rivalry: 0.01 },
              description: `${review.reviewerId} reviewed ${singleReview.targetAgentId} critically`,
            });
          } else {
            events.push({
              from: review.reviewerId,
              to: singleReview.targetAgentId,
              type: 'review.constructive',
              impact: { respect: 0.02 },
              description: `${review.reviewerId} reviewed ${singleReview.targetAgentId}`,
            });
          }
        }
      }
    }

    return events;
  }
}

// ─── Helpers ────────────────────────────────────

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
