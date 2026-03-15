/**
 * Universe — the top-level container for an agent organization.
 *
 * A Universe is to agents what a society is to people:
 * it defines the rules, relationships, resources, and evolutionary
 * pressures that shape how agents collaborate or compete.
 */

import type { AgentDefinition } from './agent.js';
import type { RelationshipDefinition } from './relationship.js';
import type { ProtocolDefinition } from './protocol.js';
import type { GovernanceConfig } from './governance.js';
import type { ResourceDefinition } from './resource.js';
import type { EvolutionConfig } from './memory.js';
/** The user/ruler at the center of the agent network */
export interface RulerDefinition {
  title?: string;
  description?: string;
  permissions?: string[];
}

export type UniverseType =
  | 'hierarchical'  // Clear chain of command (e.g., bureaucratic hierarchy)
  | 'flat'          // All agents are peers (e.g., democratic team)
  | 'competitive'   // Agents compete for position (e.g., Zhenhuan 后宫)
  | 'hybrid';       // Mix of cooperation and competition

export interface UniverseConfig {
  /** Universe name (kebab-case identifier) */
  name: string;
  /** Semantic version */
  version: string;
  /** Human-readable description */
  description: string;
  /** Organizational model */
  type: UniverseType;
  /** The user/ruler definition — the human at the center of the agent network (optional) */
  ruler?: RulerDefinition;
  /** All agents in this universe */
  agents: AgentDefinition[];
  /** Relationships between agents */
  relationships: RelationshipDefinition[];
  /** Workflow protocols (state machines) */
  protocols: ProtocolDefinition[];
  /** Decision-making and permission rules */
  governance: GovernanceConfig;
  /** Shared resources (optional) */
  resources?: ResourceDefinition[];
  /** Evolution/adaptation rules (optional) */
  evolution?: EvolutionConfig;
  /** Custom universe-level metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Snapshot of a Universe at a point in time.
 * Used for persistence, replay, and time-travel debugging.
 */
export interface UniverseSnapshot {
  /** The config that created this universe */
  config: UniverseConfig;
  /** Current tick/cycle number */
  tick: number;
  /** Timestamp of snapshot */
  timestamp: string;
  /** Agent runtime states */
  agentStates: Record<string, Record<string, unknown>>;
  /** Current resource allocations */
  resourceAllocations: Record<string, Record<string, number>>;
  /** Active protocol states */
  protocolStates: Record<string, string>;
  /** Relationship current weights */
  relationshipWeights: Array<{ from: string; to: string; weight: number }>;
}
