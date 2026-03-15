/**
 * Config Sync — synchronizes universe spec changes to running OpenClaw instances.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { UniverseConfig } from '../types/index.js';

export interface SyncResult {
  synced: string[];
  skipped: string[];
  errors: Array<{ agentId: string; error: string }>;
}

/**
 * Check which agents have OpenClaw workspaces already set up.
 */
export function checkWorkspaces(
  universe: UniverseConfig,
  openclawDir?: string
): { existing: string[]; missing: string[] } {
  const dir = openclawDir ?? join(
    process.env.HOME ?? process.env.USERPROFILE ?? '.',
    '.openclaw'
  );

  const existing: string[] = [];
  const missing: string[] = [];

  for (const agent of universe.agents) {
    const workspacePath = join(dir, `workspace-${agent.id}`);
    if (existsSync(workspacePath)) {
      existing.push(agent.id);
    } else {
      missing.push(agent.id);
    }
  }

  return { existing, missing };
}

/**
 * Read the current openclaw.json config if it exists.
 */
export function readOpenClawConfig(openclawDir?: string): Record<string, unknown> | null {
  const dir = openclawDir ?? join(
    process.env.HOME ?? process.env.USERPROFILE ?? '.',
    '.openclaw'
  );
  const configPath = join(dir, 'openclaw.json');

  if (!existsSync(configPath)) return null;

  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return null;
  }
}
