/**
 * Workspace I/O — file-based communication protocol between dispatcher and agents.
 *
 * Design principle: agents communicate through files, not HTTP.
 * This aligns with OpenClaw's file-driven model where each agent has a workspace
 * directory. The dispatcher writes TASK.md, the agent reads it, executes, and
 * writes SUBMISSION.md. Simple, debuggable, zero infrastructure.
 *
 * File protocol:
 *   TASK.md       — written by dispatcher, read by agent
 *   SUBMISSION.md — written by agent, read by dispatcher
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// ─── Interface ──────────────────────────────────

/**
 * Abstract workspace I/O — can be swapped for remote, in-memory, or custom backends.
 */
export interface WorkspaceIO {
  /** Write a task file to an agent's workspace */
  writeTask(agentId: string, content: string): Promise<void>;

  /** Read the submission from an agent's workspace. Returns null if not yet submitted. */
  readSubmission(agentId: string): Promise<string | null>;

  /** Remove the task file after collection */
  clearTask(agentId: string): Promise<void>;

  /** Remove the submission file after collection */
  clearSubmission(agentId: string): Promise<void>;

  /** Check if a submission exists without reading its content */
  hasSubmission(agentId: string): Promise<boolean>;
}

// ─── File Implementation ────────────────────────

const TASK_FILENAME = 'TASK.md';
const SUBMISSION_FILENAME = 'SUBMISSION.md';

export interface FileWorkspaceIOOptions {
  /** Base directory for OpenClaw workspaces (default: ~/.openclaw) */
  openclawDir?: string;
  /** Workspace directory name pattern (default: workspace-{agentId}) */
  workspacePattern?: string;
}

/**
 * Default file-system implementation of WorkspaceIO.
 *
 * Reads and writes to ~/.openclaw/workspace-{agentId}/ by default.
 */
export class FileWorkspaceIO implements WorkspaceIO {
  private readonly baseDir: string;
  private readonly pattern: string;

  constructor(options: FileWorkspaceIOOptions = {}) {
    this.baseDir = options.openclawDir ?? join(
      process.env.HOME ?? process.env.USERPROFILE ?? '.',
      '.openclaw'
    );
    this.pattern = options.workspacePattern ?? 'workspace-{agentId}';
  }

  private workspacePath(agentId: string): string {
    const dirName = this.pattern.replace('{agentId}', agentId);
    return join(this.baseDir, dirName);
  }

  async writeTask(agentId: string, content: string): Promise<void> {
    const dir = this.workspacePath(agentId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, TASK_FILENAME), content, 'utf-8');
  }

  async readSubmission(agentId: string): Promise<string | null> {
    const filePath = join(this.workspacePath(agentId), SUBMISSION_FILENAME);
    if (!existsSync(filePath)) return null;
    try {
      return readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  async clearTask(agentId: string): Promise<void> {
    const filePath = join(this.workspacePath(agentId), TASK_FILENAME);
    if (existsSync(filePath)) {
      try { unlinkSync(filePath); } catch { /* ignore */ }
    }
  }

  async clearSubmission(agentId: string): Promise<void> {
    const filePath = join(this.workspacePath(agentId), SUBMISSION_FILENAME);
    if (existsSync(filePath)) {
      try { unlinkSync(filePath); } catch { /* ignore */ }
    }
  }

  async hasSubmission(agentId: string): Promise<boolean> {
    return existsSync(join(this.workspacePath(agentId), SUBMISSION_FILENAME));
  }
}

// ─── In-Memory Implementation (for testing) ─────

/**
 * In-memory WorkspaceIO for unit tests — no file system needed.
 */
export class MemoryWorkspaceIO implements WorkspaceIO {
  readonly tasks = new Map<string, string>();
  readonly submissions = new Map<string, string>();

  async writeTask(agentId: string, content: string): Promise<void> {
    this.tasks.set(agentId, content);
  }

  async readSubmission(agentId: string): Promise<string | null> {
    return this.submissions.get(agentId) ?? null;
  }

  async clearTask(agentId: string): Promise<void> {
    this.tasks.delete(agentId);
  }

  async clearSubmission(agentId: string): Promise<void> {
    this.submissions.delete(agentId);
  }

  async hasSubmission(agentId: string): Promise<boolean> {
    return this.submissions.has(agentId);
  }

  /** Test helper: simulate an agent submitting work */
  simulateSubmission(agentId: string, output: string): void {
    this.submissions.set(agentId, output);
  }
}
