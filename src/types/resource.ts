/**
 * Resource definitions — the alignment mechanism for agent behavior.
 *
 * Key insight: agents optimize for resource acquisition. By designing
 * the resource structure, you align agent behavior with organizational goals.
 * Finite resources create competition; renewable resources create cooperation.
 */

export type ResourceType =
  | 'finite'      // Fixed total, zero-sum (e.g., 圣宠/imperial favor)
  | 'renewable'   // Replenishes on interval (e.g., 月例/monthly allowance)
  | 'positional'; // Tied to rank/position (e.g., 宫殿/palaces)

export type DistributionStrategy =
  | 'equal'        // Everyone gets the same
  | 'merit'        // Based on performance score
  | 'hierarchy'    // Based on rank
  | 'competitive'; // Won through competition

export interface ResourceDefinition {
  /** Resource identifier */
  name: string;
  /** Resource behavior type */
  type: ResourceType;
  /** Total amount available in the universe */
  total: number;
  /** How this resource is distributed */
  distribution: DistributionStrategy;
  /** For renewable resources: refresh interval in ms */
  refreshInterval?: number;
  /** Decay rate per cycle (0-1). 0 = no decay, 1 = fully decays. */
  decayRate?: number;
  /** Human-readable description */
  description?: string;
}

export interface ResourceAllocation {
  /** Which agent holds this allocation */
  agentId: string;
  /** Resource name */
  resource: string;
  /** Amount allocated */
  amount: number;
  /** When this allocation was made */
  acquiredAt: string;
  /** When this allocation expires (for renewable/positional) */
  expiresAt?: string;
}

export interface ResourceTransfer {
  /** Source agent (or 'system' for system grants) */
  from: string;
  /** Target agent */
  to: string;
  /** Resource name */
  resource: string;
  /** Amount transferred */
  amount: number;
  /** Reason for transfer */
  reason: string;
  /** Timestamp */
  timestamp: string;
}
