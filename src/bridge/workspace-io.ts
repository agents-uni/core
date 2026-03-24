/**
 * Workspace I/O — file-based communication protocol between dispatcher and agents.
 *
 * Design principle: agents communicate through files, not HTTP.
 * This aligns with OpenClaw's file-driven model where each agent has a workspace
 * directory. The dispatcher writes TASK.md, the agent reads it, executes, and
 * writes SUBMISSION.md. Simple, debuggable, zero infrastructure.
 *
 * File protocol:
 *   TASK.md            — written by dispatcher, read by agent
 *   SUBMISSION.md      — written by agent, read by dispatcher
 *   .SUBMISSION_DONE   — empty sentinel written by agent after SUBMISSION.md is complete
 *   REVIEW_TASK.md     — written by review dispatcher, read by agent
 *   REVIEW.md          — written by agent (review), read by review dispatcher
 *   .REVIEW_DONE       — empty sentinel written by agent after REVIEW.md is complete
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

  /** Check if the .SUBMISSION_DONE marker exists (agent finished writing) */
  hasSubmissionDone(agentId: string): Promise<boolean>;

  /** Remove the .SUBMISSION_DONE marker */
  clearSubmissionDone(agentId: string): Promise<void>;

  /** Write a review task file to an agent's workspace */
  writeReviewTask(agentId: string, content: string): Promise<void>;

  /** Read the review from an agent's workspace. Returns null if not yet submitted. */
  readReview(agentId: string): Promise<string | null>;

  /** Remove the review task file after collection */
  clearReviewTask(agentId: string): Promise<void>;

  /** Remove the review file after collection */
  clearReview(agentId: string): Promise<void>;
}

// ─── File Implementation ────────────────────────

const TASK_FILENAME = 'TASK.md';
const SUBMISSION_FILENAME = 'SUBMISSION.md';
const SUBMISSION_DONE_FILENAME = '.SUBMISSION_DONE';
const REVIEW_TASK_FILENAME = 'REVIEW_TASK.md';
const REVIEW_FILENAME = 'REVIEW.md';
const REVIEW_DONE_FILENAME = '.REVIEW_DONE';

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
    const dir = this.workspacePath(agentId);
    const donePath = join(dir, SUBMISSION_DONE_FILENAME);
    // Only read if the done marker exists — prevents reading half-written files
    if (!existsSync(donePath)) return null;
    const filePath = join(dir, SUBMISSION_FILENAME);
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
    const dir = this.workspacePath(agentId);
    const filePath = join(dir, SUBMISSION_FILENAME);
    if (existsSync(filePath)) {
      try { unlinkSync(filePath); } catch { /* ignore */ }
    }
    // Also clean up the done marker
    const donePath = join(dir, SUBMISSION_DONE_FILENAME);
    if (existsSync(donePath)) {
      try { unlinkSync(donePath); } catch { /* ignore */ }
    }
  }

  async hasSubmission(agentId: string): Promise<boolean> {
    return existsSync(join(this.workspacePath(agentId), SUBMISSION_FILENAME));
  }

  async hasSubmissionDone(agentId: string): Promise<boolean> {
    return existsSync(join(this.workspacePath(agentId), SUBMISSION_DONE_FILENAME));
  }

  async clearSubmissionDone(agentId: string): Promise<void> {
    const filePath = join(this.workspacePath(agentId), SUBMISSION_DONE_FILENAME);
    if (existsSync(filePath)) {
      try { unlinkSync(filePath); } catch { /* ignore */ }
    }
  }

  async writeReviewTask(agentId: string, content: string): Promise<void> {
    const dir = this.workspacePath(agentId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, REVIEW_TASK_FILENAME), content, 'utf-8');
  }

  async readReview(agentId: string): Promise<string | null> {
    const dir = this.workspacePath(agentId);
    const donePath = join(dir, REVIEW_DONE_FILENAME);
    if (!existsSync(donePath)) return null;
    const filePath = join(dir, REVIEW_FILENAME);
    if (!existsSync(filePath)) return null;
    try {
      return readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  async clearReviewTask(agentId: string): Promise<void> {
    const filePath = join(this.workspacePath(agentId), REVIEW_TASK_FILENAME);
    if (existsSync(filePath)) {
      try { unlinkSync(filePath); } catch { /* ignore */ }
    }
  }

  async clearReview(agentId: string): Promise<void> {
    const dir = this.workspacePath(agentId);
    for (const name of [REVIEW_FILENAME, REVIEW_DONE_FILENAME]) {
      const filePath = join(dir, name);
      if (existsSync(filePath)) {
        try { unlinkSync(filePath); } catch { /* ignore */ }
      }
    }
  }
}

// ─── In-Memory Implementation (for testing) ─────

/**
 * In-memory WorkspaceIO for unit tests — no file system needed.
 */
export class MemoryWorkspaceIO implements WorkspaceIO {
  readonly tasks = new Map<string, string>();
  readonly submissions = new Map<string, string>();
  readonly doneMarkers = new Set<string>();
  readonly reviewTasks = new Map<string, string>();
  readonly reviews = new Map<string, string>();
  readonly reviewDoneMarkers = new Set<string>();

  async writeTask(agentId: string, content: string): Promise<void> {
    this.tasks.set(agentId, content);
  }

  async readSubmission(agentId: string): Promise<string | null> {
    // Respect done marker — match FileWorkspaceIO behavior
    if (!this.doneMarkers.has(agentId)) return null;
    return this.submissions.get(agentId) ?? null;
  }

  async clearTask(agentId: string): Promise<void> {
    this.tasks.delete(agentId);
  }

  async clearSubmission(agentId: string): Promise<void> {
    this.submissions.delete(agentId);
    this.doneMarkers.delete(agentId);
  }

  async hasSubmission(agentId: string): Promise<boolean> {
    return this.submissions.has(agentId);
  }

  async hasSubmissionDone(agentId: string): Promise<boolean> {
    return this.doneMarkers.has(agentId);
  }

  async clearSubmissionDone(agentId: string): Promise<void> {
    this.doneMarkers.delete(agentId);
  }

  /** Test helper: simulate an agent submitting work (auto-sets done marker) */
  simulateSubmission(agentId: string, output: string): void {
    this.submissions.set(agentId, output);
    this.doneMarkers.add(agentId);
  }

  /** Test helper: simulate a half-written submission (no done marker) */
  simulateSubmissionWithoutDone(agentId: string, output: string): void {
    this.submissions.set(agentId, output);
  }

  async writeReviewTask(agentId: string, content: string): Promise<void> {
    this.reviewTasks.set(agentId, content);
  }

  async readReview(agentId: string): Promise<string | null> {
    if (!this.reviewDoneMarkers.has(agentId)) return null;
    return this.reviews.get(agentId) ?? null;
  }

  async clearReviewTask(agentId: string): Promise<void> {
    this.reviewTasks.delete(agentId);
  }

  async clearReview(agentId: string): Promise<void> {
    this.reviews.delete(agentId);
    this.reviewDoneMarkers.delete(agentId);
  }

  /** Test helper: simulate an agent submitting a review (auto-sets done marker) */
  simulateReview(agentId: string, content: string): void {
    this.reviews.set(agentId, content);
    this.reviewDoneMarkers.add(agentId);
  }
}
