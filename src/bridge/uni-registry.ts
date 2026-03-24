/**
 * Uni Registry — manages multiple universe deployments.
 *
 * Tracks which universes are deployed to OpenClaw, their agents,
 * and provides lifecycle operations (register, update, reset, cleanup).
 *
 * Storage: ~/.openclaw/uni-registry.json
 */

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';
import type { UniverseConfig, UniverseType } from '../types/index.js';
import { generateAllSouls, type SoulGeneratorOptions } from './soul-generator.js';
import { readOpenClawConfig } from './config-sync.js';

// ─── Types ────────────────────────────────────────

export interface UniRegistryEntry {
  /** Universe identifier (from config.name) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Absolute path to the universe.yaml spec file */
  specPath: string;
  /** Organization type */
  type: UniverseType;
  /** Agent IDs belonging to this uni */
  agentIds: string[];
  /** First deployment timestamp */
  deployedAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Spec version */
  version: string;
  /** Description */
  description: string;
}

export interface UniRegistry {
  version: string;
  unis: UniRegistryEntry[];
}

// ─── Helpers ──────────────────────────────────────

function getOpenClawDir(openclawDir?: string): string {
  return openclawDir ?? join(
    process.env.HOME ?? process.env.USERPROFILE ?? '.',
    '.openclaw'
  );
}

function getRegistryPath(openclawDir?: string): string {
  return join(getOpenClawDir(openclawDir), 'uni-registry.json');
}

function readRegistry(openclawDir?: string): UniRegistry {
  const path = getRegistryPath(openclawDir);
  if (!existsSync(path)) {
    return { version: '1.0.0', unis: [] };
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return { version: '1.0.0', unis: [] };
  }
}

function writeRegistry(registry: UniRegistry, openclawDir?: string): void {
  const dir = getOpenClawDir(openclawDir);
  mkdirSync(dir, { recursive: true });
  const path = getRegistryPath(openclawDir);
  writeFileSync(path, JSON.stringify(registry, null, 2) + '\n', 'utf-8');
}

// ─── Public API ───────────────────────────────────

/**
 * Register a universe in the registry.
 * If already registered, updates the existing entry.
 */
export function registerUni(
  config: UniverseConfig,
  specPath: string,
  openclawDir?: string
): UniRegistryEntry {
  const registry = readRegistry(openclawDir);
  const now = new Date().toISOString();

  const existing = registry.unis.find(u => u.id === config.name);
  if (existing) {
    // Update existing entry
    existing.name = config.description || config.name;
    existing.specPath = specPath;
    existing.type = config.type;
    existing.agentIds = config.agents.map(a => a.id);
    existing.updatedAt = now;
    existing.version = config.version;
    existing.description = config.description;
    writeRegistry(registry, openclawDir);
    return existing;
  }

  // New entry
  const entry: UniRegistryEntry = {
    id: config.name,
    name: config.description || config.name,
    specPath,
    type: config.type,
    agentIds: config.agents.map(a => a.id),
    deployedAt: now,
    updatedAt: now,
    version: config.version,
    description: config.description,
  };

  registry.unis.push(entry);
  writeRegistry(registry, openclawDir);
  return entry;
}

/**
 * List all registered universes.
 */
export function listUnis(openclawDir?: string): UniRegistryEntry[] {
  return readRegistry(openclawDir).unis;
}

/**
 * Get a specific universe by ID.
 */
export function getUni(id: string, openclawDir?: string): UniRegistryEntry | null {
  const registry = readRegistry(openclawDir);
  return registry.unis.find(u => u.id === id) ?? null;
}

/**
 * Remove a universe from the registry (does NOT delete files).
 */
export function unregisterUni(id: string, openclawDir?: string): boolean {
  const registry = readRegistry(openclawDir);
  const idx = registry.unis.findIndex(u => u.id === id);
  if (idx === -1) return false;
  registry.unis.splice(idx, 1);
  writeRegistry(registry, openclawDir);
  return true;
}

/**
 * Fully clean up a universe:
 * 1. Delete all workspace-{agentId}/ directories
 * 2. Delete all agents/{agentId}/ directories
 * 3. Remove agents from openclaw.json
 * 4. Delete the {uni}-permissions.md file
 * 5. Remove from uni-registry.json
 */
export function cleanupUni(id: string, openclawDir?: string): {
  removedWorkspaces: string[];
  removedAgentDirs: string[];
  removedFromConfig: string[];
} {
  const dir = getOpenClawDir(openclawDir);
  const entry = getUni(id, openclawDir);
  if (!entry) {
    return { removedWorkspaces: [], removedAgentDirs: [], removedFromConfig: [] };
  }

  const removedWorkspaces: string[] = [];
  const removedAgentDirs: string[] = [];

  // Delete workspace and agent directories
  for (const agentId of entry.agentIds) {
    const workspacePath = join(dir, `workspace-${agentId}`);
    if (existsSync(workspacePath)) {
      rmSync(workspacePath, { recursive: true, force: true });
      removedWorkspaces.push(workspacePath);
    }

    const agentPath = join(dir, 'agents', agentId);
    if (existsSync(agentPath)) {
      rmSync(agentPath, { recursive: true, force: true });
      removedAgentDirs.push(agentPath);
    }
  }

  // Remove agents from openclaw.json
  const removedFromConfig = removeAgentsFromOpenClawConfig(entry.agentIds, openclawDir);

  // Delete permissions file
  const permPath = join(dir, `${id}-permissions.md`);
  if (existsSync(permPath)) {
    rmSync(permPath, { force: true });
  }

  // Remove from registry
  unregisterUni(id, openclawDir);

  return { removedWorkspaces, removedAgentDirs, removedFromConfig };
}

/**
 * Update a universe: regenerate SOUL.md files for all agents,
 * handle added/removed agents, update registry.
 */
export function updateUni(
  id: string,
  config: UniverseConfig,
  specPath: string,
  soulOptions?: SoulGeneratorOptions,
  openclawDir?: string
): {
  added: string[];
  removed: string[];
  updated: string[];
} {
  const dir = getOpenClawDir(openclawDir);
  const entry = getUni(id, openclawDir);
  const oldAgentIds = entry ? new Set(entry.agentIds) : new Set<string>();
  const newAgentIds = new Set(config.agents.map(a => a.id));

  const added: string[] = [];
  const removed: string[] = [];
  const updated: string[] = [];

  // Generate new SOUL.md files
  const souls = generateAllSouls(config, soulOptions);

  for (const agent of config.agents) {
    const workspacePath = join(dir, `workspace-${agent.id}`);
    const agentDir = join(dir, 'agents', agent.id, 'agent');
    const sessionsDir = join(dir, 'agents', agent.id, 'sessions');

    mkdirSync(workspacePath, { recursive: true });
    mkdirSync(agentDir, { recursive: true });
    mkdirSync(sessionsDir, { recursive: true });

    const soulContent = souls.get(agent.id) ?? '';
    writeFileSync(join(workspacePath, 'SOUL.md'), soulContent, 'utf-8');

    if (oldAgentIds.has(agent.id)) {
      updated.push(agent.id);
    } else {
      added.push(agent.id);
    }
  }

  // Clean up removed agents
  for (const oldId of oldAgentIds) {
    if (!newAgentIds.has(oldId)) {
      const workspacePath = join(dir, `workspace-${oldId}`);
      const agentPath = join(dir, 'agents', oldId);
      if (existsSync(workspacePath)) rmSync(workspacePath, { recursive: true, force: true });
      if (existsSync(agentPath)) rmSync(agentPath, { recursive: true, force: true });
      removed.push(oldId);
    }
  }

  // Update openclaw.json (remove old, add new)
  if (removed.length > 0) {
    removeAgentsFromOpenClawConfig(removed, openclawDir);
  }

  // Update registry entry
  registerUni(config, specPath, openclawDir);

  return { added, removed, updated };
}

/**
 * Reset a universe: clear runtime data (sessions, TASK.md, SUBMISSION.md)
 * but preserve SOUL.md and configuration.
 */
export function resetUni(id: string, openclawDir?: string): {
  clearedSessions: string[];
  clearedTasks: string[];
} {
  const dir = getOpenClawDir(openclawDir);
  const entry = getUni(id, openclawDir);
  if (!entry) {
    return { clearedSessions: [], clearedTasks: [] };
  }

  const clearedSessions: string[] = [];
  const clearedTasks: string[] = [];

  for (const agentId of entry.agentIds) {
    // Clear sessions
    const sessionsDir = join(dir, 'agents', agentId, 'sessions');
    if (existsSync(sessionsDir)) {
      const files = readdirSync(sessionsDir);
      for (const file of files) {
        rmSync(join(sessionsDir, file), { force: true });
      }
      if (files.length > 0) clearedSessions.push(agentId);
    }

    // Clear TASK.md and SUBMISSION.md from workspace
    const workspacePath = join(dir, `workspace-${agentId}`);
    for (const runtimeFile of ['TASK.md', 'SUBMISSION.md', '.SUBMISSION_DONE', 'REVIEW_TASK.md', 'REVIEW.md', '.REVIEW_DONE']) {
      const filePath = join(workspacePath, runtimeFile);
      if (existsSync(filePath)) {
        rmSync(filePath, { force: true });
        clearedTasks.push(`${agentId}/${runtimeFile}`);
      }
    }
  }

  // Update registry timestamp
  const registry = readRegistry(openclawDir);
  const entryRef = registry.unis.find(u => u.id === id);
  if (entryRef) {
    entryRef.updatedAt = new Date().toISOString();
    writeRegistry(registry, openclawDir);
  }

  return { clearedSessions, clearedTasks };
}

// ─── Internal Helpers ─────────────────────────────

function removeAgentsFromOpenClawConfig(
  agentIds: string[],
  openclawDir?: string
): string[] {
  const dir = getOpenClawDir(openclawDir);
  const configPath = join(dir, 'openclaw.json');
  if (!existsSync(configPath)) return [];

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const agents = config.agents as Record<string, unknown> | undefined;
    if (!agents) return [];

    const list = (agents.list ?? []) as Array<Record<string, unknown>>;
    const idsToRemove = new Set(agentIds);
    const removed: string[] = [];

    agents.list = list.filter(a => {
      const id = a.id as string;
      if (idsToRemove.has(id)) {
        removed.push(id);
        return false;
      }
      return true;
    });

    config.agents = agents;
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    return removed;
  } catch {
    return [];
  }
}
