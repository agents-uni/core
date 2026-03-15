import { parse as parseYaml } from 'yaml';
import { readFileSync } from 'node:fs';
import type { UniverseConfig } from '../types/index.js';

/**
 * Parse a YAML universe spec file into a typed UniverseConfig object.
 * Does NOT validate — call validator separately for schema checking.
 */
export function parseSpecFile(filePath: string): UniverseConfig {
  const content = readFileSync(filePath, 'utf-8');
  return parseSpecString(content);
}

/**
 * Parse a YAML string into a UniverseConfig.
 */
export function parseSpecString(yamlContent: string): UniverseConfig {
  const raw = parseYaml(yamlContent);

  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid YAML: root must be an object');
  }

  // Normalize defaults
  const config: UniverseConfig = {
    name: raw.name,
    version: raw.version ?? '0.1.0',
    description: raw.description ?? '',
    type: raw.type ?? 'hybrid',
    ruler: raw.ruler ? normalizeRuler(raw.ruler) : undefined,
    agents: normalizeAgents(raw.agents ?? []),
    relationships: raw.relationships ?? [],
    protocols: raw.protocols ?? [],
    governance: normalizeGovernance(raw.governance ?? {}),
    resources: raw.resources,
    evolution: raw.evolution,
    metadata: raw.metadata,
  };

  return config;
}

function normalizeRuler(raw: Record<string, unknown>): UniverseConfig['ruler'] {
  return {
    title: raw.title as string | undefined,
    description: raw.description as string | undefined,
    permissions: (raw.permissions as string[]) ?? [],
  };
}

function normalizeAgents(agents: unknown[]): UniverseConfig['agents'] {
  return agents.map((raw) => {
    const agent = raw as Record<string, unknown>;
    return {
      id: agent.id as string,
      name: agent.name as string,
      role: normalizeRole(agent.role as Record<string, unknown>),
      rank: agent.rank as number | undefined,
      traits: agent.traits as Record<string, number> | undefined,
      capabilities: agent.capabilities as string[] | undefined,
      constraints: agent.constraints as string[] | undefined,
      metadata: agent.metadata as Record<string, unknown> | undefined,
    };
  });
}

function normalizeRole(role: Record<string, unknown> | undefined | null) {
  if (!role) {
    return { title: 'unknown', duties: [] as string[], permissions: [] as string[] };
  }
  return {
    title: (role.title as string) ?? 'unknown',
    department: role.department as string | undefined,
    duties: (role.duties as string[]) ?? [],
    permissions: (role.permissions as string[]) ?? [],
    soulTemplate: role.soulTemplate as string | undefined,
  };
}

function normalizeGovernance(gov: Record<string, unknown>): UniverseConfig['governance'] {
  return {
    decisionModel: (gov.decisionModel as UniverseConfig['governance']['decisionModel']) ?? 'autocratic',
    permissionMatrix: (gov.permissionMatrix as UniverseConfig['governance']['permissionMatrix']) ?? [],
    reviewPolicy: normalizeReviewPolicy(gov.reviewPolicy as Record<string, unknown> | undefined),
    escalationRules: (gov.escalationRules as UniverseConfig['governance']['escalationRules']) ?? [],
  };
}

function normalizeReviewPolicy(policy: Record<string, unknown> | undefined): UniverseConfig['governance']['reviewPolicy'] {
  if (!policy) {
    return { mandatory: false, reviewers: [], maxRounds: 1 };
  }
  return {
    mandatory: (policy.mandatory as boolean) ?? false,
    reviewers: (policy.reviewers as string[]) ?? [],
    maxRounds: (policy.maxRounds as number) ?? 1,
    autoApproveAfter: policy.autoApproveAfter as number | undefined,
  };
}
