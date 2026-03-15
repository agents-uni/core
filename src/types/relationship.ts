/**
 * Relationship types — the social fabric of a Universe.
 *
 * Key insight: agent collaboration quality is determined not by individual
 * capability, but by the structure of relationships between agents.
 * A well-designed relationship graph IS the production relationship.
 */

export type RelationshipType =
  | 'superior'      // A outranks B (directed: A → B)
  | 'subordinate'   // A reports to B (directed: A → B)
  | 'peer'          // Same level, cooperative
  | 'competitive'   // Same level, competing for resources
  | 'reviewer'      // A reviews B's work (quality gate)
  | 'advisor'       // A advises B (soft influence, no authority)
  | 'ally'          // Temporary alliance (mutable)
  | 'rival'         // Persistent competition (mutable)
  | 'mentor'        // A teaches B (knowledge transfer)
  | 'delegate'      // A delegates work to B
  | 'serves';       // A serves the user/ruler (user-centric relationship)

export interface RelationshipDefinition {
  /** Source agent ID */
  from: string;
  /** Target agent ID */
  to: string;
  /** Nature of the relationship */
  type: RelationshipType;
  /** Strength of the relationship (0-1). Higher = stronger bond/rivalry. */
  weight?: number;
  /** Can this relationship change during universe evolution? */
  mutable?: boolean;
  /** Relationship-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Runtime relationship with mutable state for evolution tracking.
 */
export interface LiveRelationship extends RelationshipDefinition {
  /** Current weight (may differ from initial if mutable) */
  currentWeight: number;
  /** When this relationship was established */
  establishedAt: string;
  /** History of weight changes */
  history: RelationshipEvent[];
}

export interface RelationshipEvent {
  timestamp: string;
  previousWeight: number;
  newWeight: number;
  reason: string;
}
