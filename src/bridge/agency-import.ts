/**
 * Agency-Agents Bridge
 *
 * 导入 agency-agents 项目的 Agent .md 文件，转换为 agents-uni 的
 * AgentDefinition + SOUL.md 格式，让 193 个高质量 Agent 人格为我所用。
 *
 * 支持两种用法：
 * 1. CLI: `uni import ./path/to/agency-agents/engineering/ --name my-team`
 * 2. API: `importAgencyAgents('./engineering/', { name: 'my-team' })`
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import type { AgentDefinition, UniverseConfig } from '../types/index.js';

// ─── Types ───────────────────────────────────

export interface AgencyAgentFrontmatter {
  name: string;
  description: string;
  emoji?: string;
  color?: string;
  vibe?: string;
  services?: Array<{ name: string; url: string; tier: string }>;
}

export interface AgencyAgentFile {
  /** File path */
  filePath: string;
  /** Parsed YAML frontmatter */
  frontmatter: AgencyAgentFrontmatter;
  /** Full markdown body (after frontmatter) */
  body: string;
  /** Extracted sections by header */
  sections: Map<string, string>;
  /** Derived agent ID (from filename) */
  id: string;
}

export interface ImportOptions {
  /** Universe name */
  name?: string;
  /** Universe type */
  type?: 'hierarchical' | 'flat' | 'competitive' | 'hybrid';
  /** Default rank for imported agents (0-100) */
  defaultRank?: number;
  /** Category/department to assign (derived from directory name if omitted) */
  department?: string;
  /** Whether to infer traits from agent content */
  inferTraits?: boolean;
  /** Language for generated content */
  language?: 'zh' | 'en';
  /** Relationship strategy between imported agents */
  relationships?: 'none' | 'peer' | 'competitive';
}

export interface ImportResult {
  /** Generated UniverseConfig */
  config: UniverseConfig;
  /** Parsed agent files (for SOUL.md generation) */
  agents: AgencyAgentFile[];
  /** Warnings encountered during import */
  warnings: string[];
}

// ─── Parsing ─────────────────────────────────

/**
 * Parse a single agency-agents .md file
 */
export function parseAgencyAgentFile(filePath: string): AgencyAgentFile {
  const raw = readFileSync(filePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(raw);
  const sections = parseSections(body);

  // Derive ID from filename: "engineering-backend-architect.md" → "backend-architect"
  let id = basename(filePath, extname(filePath));
  // Strip common prefixes (engineering-, design-, marketing-, etc.)
  id = id.replace(
    /^(engineering|design|marketing|sales|product|testing|support|specialized|spatial-computing|game-development|strategy|academic|paid-media|project-management)-/,
    ''
  );

  return { filePath, frontmatter, body, sections, id };
}

/**
 * Parse YAML frontmatter from markdown
 */
function parseFrontmatter(raw: string): {
  frontmatter: AgencyAgentFrontmatter;
  body: string;
} {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return {
      frontmatter: { name: 'Unknown', description: '' },
      body: raw,
    };
  }

  const yamlBlock = match[1];
  const body = match[2];

  // Simple YAML parser for flat key-value (avoids dependency)
  const fm: Record<string, string> = {};
  for (const line of yamlBlock.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      fm[kv[1]] = kv[2].trim();
    }
  }

  return {
    frontmatter: {
      name: fm.name ?? 'Unknown',
      description: fm.description ?? '',
      emoji: fm.emoji,
      color: fm.color,
      vibe: fm.vibe,
    },
    body,
  };
}

/**
 * Extract sections by H2 headers
 */
function parseSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = body.split('\n');
  let currentHeader = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      if (currentHeader) {
        sections.set(currentHeader, currentContent.join('\n').trim());
      }
      currentHeader = headerMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentHeader) {
    sections.set(currentHeader, currentContent.join('\n').trim());
  }

  return sections;
}

// ─── Conversion ──────────────────────────────

/**
 * Convert an AgencyAgentFile to an agents-uni AgentDefinition
 */
export function toAgentDefinition(
  agent: AgencyAgentFile,
  opts?: { rank?: number; department?: string; inferTraits?: boolean }
): AgentDefinition {
  const rank = opts?.rank ?? 50;
  const department = opts?.department;

  // Extract duties from Core Mission section
  const missionSection =
    findSection(agent.sections, 'Core Mission') ??
    findSection(agent.sections, 'Mission');
  const duties = extractDuties(missionSection);

  // Infer traits from Identity section
  const traits: Record<string, number> = {};
  if (opts?.inferTraits !== false) {
    const identitySection =
      findSection(agent.sections, 'Identity') ??
      findSection(agent.sections, 'Memory');
    if (identitySection) {
      Object.assign(traits, inferTraitsFromText(identitySection));
    }
  }

  return {
    id: agent.id,
    name: agent.frontmatter.name,
    role: {
      title: agent.frontmatter.name,
      duties,
      permissions: [],
      ...(department ? { department } : {}),
    },
    rank,
    ...(Object.keys(traits).length > 0 ? { traits } : {}),
    metadata: {
      source: 'agency-agents',
      emoji: agent.frontmatter.emoji ?? '',
      vibe: agent.frontmatter.vibe ?? '',
      originalFile: agent.filePath,
    },
  };
}

/**
 * Generate a SOUL.md that preserves the original agency-agents personality
 * and wraps it with agents-uni organizational context
 */
export function toSoulMd(
  agent: AgencyAgentFile,
  opts?: { universe?: UniverseConfig; language?: 'zh' | 'en' }
): string {
  const lang = opts?.language ?? 'en';
  const uni = opts?.universe;

  const lines: string[] = [];

  // Header
  lines.push(`# ${agent.frontmatter.emoji ?? '🤖'} ${agent.frontmatter.name}`);
  lines.push('');

  if (agent.frontmatter.vibe) {
    lines.push(`> ${agent.frontmatter.vibe}`);
    lines.push('');
  }

  // Organizational context (if universe provided)
  if (uni) {
    const header =
      lang === 'zh' ? '## 组织背景' : '## Organizational Context';
    lines.push(header);
    lines.push('');
    lines.push(
      lang === 'zh'
        ? `你是 **${uni.name}** 组织中的一员。`
        : `You are a member of the **${uni.name}** organization.`
    );

    if (uni.ruler) {
      lines.push('');
      lines.push(
        lang === 'zh'
          ? `你的一切行动服务于用户（${uni.ruler.title ?? '决策者'}）。用户是整个关系网络的核心。`
          : `All your actions serve the user (${uni.ruler.title ?? 'the decision maker'}). The user is at the center of the entire relationship network.`
      );
    }
    lines.push('');
  }

  // Preserve original personality content
  const divider =
    lang === 'zh'
      ? '## 核心人格（来自 agency-agents）'
      : '## Core Personality (from agency-agents)';
  lines.push(divider);
  lines.push('');
  lines.push(agent.body.trim());
  lines.push('');

  return lines.join('\n');
}

// ─── Batch Import ────────────────────────────

/**
 * Import all .md agents from a directory (or multiple directories)
 * and generate a UniverseConfig
 */
export function importAgencyAgents(
  dirs: string | string[],
  opts?: ImportOptions
): ImportResult {
  const dirList = Array.isArray(dirs) ? dirs : [dirs];
  const warnings: string[] = [];
  const agents: AgencyAgentFile[] = [];

  for (const dir of dirList) {
    let files: string[];
    try {
      files = readdirSync(dir).filter(
        (f) => f.endsWith('.md') && !f.startsWith('README')
      );
    } catch {
      warnings.push(`Cannot read directory: ${dir}`);
      continue;
    }

    for (const file of files) {
      const filePath = join(dir, file);
      try {
        if (!statSync(filePath).isFile()) continue;
        const agent = parseAgencyAgentFile(filePath);
        // Skip files without valid frontmatter (docs, guides, etc.)
        if (agent.frontmatter.name === 'Unknown' && !agent.frontmatter.description) {
          warnings.push(`Skipped non-agent file: ${file}`);
          continue;
        }
        agents.push(agent);
      } catch (e) {
        warnings.push(`Failed to parse ${file}: ${e}`);
      }
    }
  }

  // Check for duplicate IDs
  const idCounts = new Map<string, number>();
  for (const a of agents) {
    idCounts.set(a.id, (idCounts.get(a.id) ?? 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      // Disambiguate by prepending directory name
      let idx = 0;
      for (const a of agents) {
        if (a.id === id) {
          if (idx > 0) {
            const dirName = basename(join(a.filePath, '..'));
            a.id = `${dirName}-${a.id}`;
          }
          idx++;
        }
      }
    }
  }

  // Derive department from directory name
  const department = opts?.department ?? (dirList.length === 1 ? basename(dirList[0]) : undefined);

  // Build AgentDefinitions
  const agentDefs = agents.map((a) =>
    toAgentDefinition(a, {
      rank: opts?.defaultRank ?? 50,
      department,
      inferTraits: opts?.inferTraits,
    })
  );

  // Build relationships
  const relationships: UniverseConfig['relationships'] = [];
  if (opts?.relationships === 'peer') {
    // All agents are peers
    for (let i = 0; i < agentDefs.length; i++) {
      for (let j = i + 1; j < agentDefs.length; j++) {
        relationships.push({
          from: agentDefs[i].id,
          to: agentDefs[j].id,
          type: 'peer' as const,
          weight: 0.5,
        });
      }
    }
  } else if (opts?.relationships === 'competitive') {
    for (let i = 0; i < agentDefs.length; i++) {
      for (let j = i + 1; j < agentDefs.length; j++) {
        relationships.push({
          from: agentDefs[i].id,
          to: agentDefs[j].id,
          type: 'competitive' as const,
          weight: 0.5,
        });
      }
    }
  }

  const config: UniverseConfig = {
    name: opts?.name ?? 'imported-universe',
    version: '1.0.0',
    type: opts?.type ?? 'flat',
    description: `Imported from agency-agents (${agents.length} agents)`,
    agents: agentDefs,
    relationships,
    protocols: [],
    governance: {
      decisionModel: opts?.type === 'competitive' ? 'meritocratic' : 'democratic',
      permissionMatrix: [],
      reviewPolicy: { mandatory: false, reviewers: [], maxRounds: 1 },
      escalationRules: [],
    },
  };

  return { config, agents, warnings };
}

// ─── Helpers ─────────────────────────────────

function findSection(
  sections: Map<string, string>,
  keyword: string
): string | undefined {
  for (const [key, value] of sections) {
    if (key.toLowerCase().includes(keyword.toLowerCase())) {
      return value;
    }
  }
  return undefined;
}

function extractDuties(section: string | undefined): string[] {
  if (!section) return [];
  const duties: string[] = [];
  for (const line of section.split('\n')) {
    const match = line.match(/^###\s+(.+)$/);
    if (match) {
      duties.push(match[1].trim());
    }
  }
  // If no H3 headers found, try bullet points
  if (duties.length === 0) {
    for (const line of section.split('\n')) {
      const match = line.match(/^[-*]\s+\*\*(.+?)\*\*/);
      if (match) {
        duties.push(match[1].trim());
      }
    }
  }
  return duties.slice(0, 8); // Cap at 8 duties
}

function inferTraitsFromText(text: string): Record<string, number> {
  const traits: Record<string, number> = {};
  const lower = text.toLowerCase();

  const traitKeywords: Record<string, string[]> = {
    creativity: ['creative', 'innovative', 'imaginative', 'artistic', 'design'],
    precision: ['detail', 'precise', 'meticulous', 'accurate', 'pixel-perfect'],
    speed: ['fast', 'rapid', 'quick', 'agile', 'efficient'],
    collaboration: ['team', 'collaborat', 'cooperat', 'communicate'],
    strategy: ['strateg', 'planning', 'architect', 'systematic'],
    security: ['security', 'secure', 'protect', 'compliance', 'defense'],
    reliability: ['reliable', 'robust', 'stable', 'resilient', 'consistent'],
  };

  for (const [trait, keywords] of Object.entries(traitKeywords)) {
    const hits = keywords.filter((kw) => lower.includes(kw)).length;
    if (hits > 0) {
      traits[trait] = Math.min(0.5 + hits * 0.15, 0.95);
    }
  }

  return traits;
}
