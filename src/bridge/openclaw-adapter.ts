/**
 * OpenClaw Adapter — bridges agents-uni-core universes to OpenClaw runtime.
 *
 * Generates SOUL.md files, workspace structures, and registers agents
 * in openclaw.json so they're immediately usable.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import type { UniverseConfig } from '../types/index.js';
import { generateAllSouls, type SoulGeneratorOptions } from './soul-generator.js';
import { registerUni } from './uni-registry.js';

export interface DeployOptions {
  /** Base directory for OpenClaw workspaces (default: ~/.openclaw) */
  openclawDir?: string;
  /** Path to the universe spec file (for uni-registry tracking) */
  specPath?: string;
  /** SOUL.md generation options */
  soulOptions?: SoulGeneratorOptions;
  /** Dry run — don't write files, just return what would be written */
  dryRun?: boolean;
  /** Skip auto-registration of agents in openclaw.json (default: false) */
  skipRegister?: boolean;
}

export interface DeployResult {
  /** Files that were written (or would be written in dry run) */
  files: Array<{ path: string; content: string }>;
  /** Agents that were deployed */
  agents: string[];
  /** Agents that were newly registered in openclaw.json */
  registered: string[];
  /** Agent runtime directories created (agents/{id}/agent/) */
  agentDirs: string[];
  /** Universe ID registered in uni-registry */
  uniId: string;
  /** Warnings */
  warnings: string[];
}

/**
 * Deploy a universe spec to OpenClaw workspace structure.
 * Generates SOUL.md files AND registers agents in openclaw.json.
 */
export function deployToOpenClaw(
  universe: UniverseConfig,
  options: DeployOptions = {}
): DeployResult {
  const openclawDir = options.openclawDir ?? join(
    process.env.HOME ?? process.env.USERPROFILE ?? '.',
    '.openclaw'
  );

  const souls = generateAllSouls(universe, options.soulOptions);
  const files: Array<{ path: string; content: string }> = [];
  const agentDirs: string[] = [];
  const warnings: string[] = [];

  // Generate workspace directories, SOUL.md files, and agent runtime directories
  for (const agent of universe.agents) {
    const workspaceName = `workspace-${agent.id}`;
    const workspacePath = join(openclawDir, workspaceName);
    const soulPath = join(workspacePath, 'SOUL.md');
    const soulContent = souls.get(agent.id) ?? '';

    files.push({ path: soulPath, content: soulContent });

    // Create agent runtime directory structure (agents/{id}/agent/ and sessions/)
    // This mirrors OpenClaw's native structure: ~/.openclaw/agents/{id}/agent/
    const agentDir = join(openclawDir, 'agents', agent.id, 'agent');
    const sessionsDir = join(openclawDir, 'agents', agent.id, 'sessions');
    agentDirs.push(agentDir);

    if (!options.dryRun) {
      mkdirSync(agentDir, { recursive: true });
      mkdirSync(sessionsDir, { recursive: true });
    }
  }

  // Generate permission matrix as a reference file
  const permMatrixContent = generatePermissionReference(universe);
  files.push({
    path: join(openclawDir, `${universe.name}-permissions.md`),
    content: permMatrixContent,
  });

  // Write files (unless dry run)
  if (!options.dryRun) {
    for (const file of files) {
      const dir = dirname(file.path);
      mkdirSync(dir, { recursive: true });
      writeFileSync(file.path, file.content, 'utf-8');
    }
  }

  // Auto-register agents in openclaw.json (unless dry run or explicitly skipped)
  let registered: string[] = [];
  if (!options.dryRun && !options.skipRegister) {
    registered = registerAgentsInOpenClaw(universe, openclawDir);
  }

  // Auto-register universe in uni-registry (unless dry run)
  if (!options.dryRun) {
    const specPath = options.specPath ?? 'unknown';
    registerUni(universe, resolve(specPath), openclawDir);
  }

  return {
    files,
    agents: universe.agents.map(a => a.id),
    registered,
    agentDirs,
    uniId: universe.name,
    warnings,
  };
}

/**
 * Register universe agents in openclaw.json so OpenClaw knows about them.
 * Reads the existing config, merges in new agents (skips duplicates), writes back.
 * Returns the list of newly registered agent IDs.
 */
export function registerAgentsInOpenClaw(
  universe: UniverseConfig,
  openclawDir?: string
): string[] {
  const dir = openclawDir ?? join(
    process.env.HOME ?? process.env.USERPROFILE ?? '.',
    '.openclaw'
  );
  const configPath = join(dir, 'openclaw.json');

  // Read existing config, or create a new one if it doesn't exist
  let config: Record<string, unknown>;
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      return []; // Can't parse, don't touch it
    }
  } else {
    // Create a new openclaw.json with sensible defaults
    config = {
      version: '1.0.0',
      agents: { list: [] },
    };
  }

  // Ensure agents section exists (initialize if missing)
  if (!config.agents) {
    config.agents = { list: [] };
  }
  const agents = config.agents as Record<string, unknown>;
  if (!agents.list) {
    agents.list = [];
  }

  const list = agents.list as Array<Record<string, unknown>>;
  const existingIds = new Set(list.map(a => a.id as string));

  const newlyRegistered: string[] = [];

  for (const agent of universe.agents) {
    if (existingIds.has(agent.id)) continue; // Already registered, skip

    const workspacePath = join(dir, `workspace-${agent.id}`);
    const agentDir = join(dir, 'agents', agent.id, 'agent');
    list.push({
      id: agent.id,
      name: agent.name,
      workspace: workspacePath,
      agentDir,
    });
    newlyRegistered.push(agent.id);
  }

  if (newlyRegistered.length > 0) {
    agents.list = list;
    config.agents = agents;
    // Ensure the directory exists before writing
    mkdirSync(dir, { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  }

  return newlyRegistered;
}

function generatePermissionReference(universe: UniverseConfig): string {
  const lines: string[] = [
    `# ${universe.name} Permission Matrix`,
    '',
    `Generated from universe spec v${universe.version}`,
    '',
    '## Permission Entries',
    '',
    '| Actor | Target | Actions |',
    '|-------|--------|---------|',
  ];

  for (const entry of universe.governance.permissionMatrix) {
    lines.push(`| ${entry.actor} | ${entry.target} | ${entry.actions.join(', ')} |`);
  }

  lines.push('');
  lines.push('## Review Policy');
  lines.push('');
  lines.push(`- Mandatory: ${universe.governance.reviewPolicy.mandatory}`);
  lines.push(`- Reviewers: ${universe.governance.reviewPolicy.reviewers.join(', ')}`);
  lines.push(`- Max Rounds: ${universe.governance.reviewPolicy.maxRounds}`);

  return lines.join('\n');
}
