/**
 * Agent and Role definitions — the fundamental unit of a Universe.
 *
 * An Agent is not just an LLM wrapper; it is a *citizen* with identity,
 * position, responsibilities, and social standing within an organization.
 */

export interface AgentDefinition {
  /** Unique identifier within the universe */
  id: string;
  /** Display name */
  name: string;
  /** Role this agent fulfills */
  role: RoleDefinition;
  /** Hierarchical rank (higher = more authority). 0-100 scale. */
  rank?: number;
  /** Personality dimensions (0-1 scale). Used for SOUL.md generation. */
  traits?: Record<string, number>;
  /** What this agent can do (skill names, tool names) */
  capabilities?: string[];
  /** Hard constraints on behavior */
  constraints?: string[];
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export interface RoleDefinition {
  /** Role title (e.g., "中书令", "CEO", "皇贵妃") */
  title: string;
  /** Department or faction this role belongs to */
  department?: string;
  /** What this role is responsible for */
  duties: string[];
  /** Permitted actions (used by PermissionMatrix) */
  permissions: string[];
  /** SOUL.md template name for OpenClaw integration */
  soulTemplate?: string;
}

/**
 * Runtime representation of an agent within a live Universe.
 * Extends the static definition with mutable state.
 */
export interface Citizen {
  /** The underlying definition */
  definition: AgentDefinition;
  /** Current status */
  status: CitizenStatus;
  /** Performance score (0-100, rolling average) */
  performanceScore: number;
  /** Accumulated resources */
  resources: Record<string, number>;
  /** When this citizen joined the universe */
  joinedAt: string;
  /** Custom runtime state */
  state: Record<string, unknown>;
}

export type CitizenStatus =
  | 'active'      // Online and working
  | 'idle'        // Online but unassigned
  | 'suspended'   // Temporarily removed (e.g., cold palace)
  | 'eliminated'  // Permanently removed
  | 'probation';  // Under review, limited permissions
