/**
 * Protocol definitions — state machines that govern organizational workflows.
 *
 * Every organizational process (task dispatch, competition, promotion)
 * reduces to a state machine with role-gated transitions.
 * This is the universal primitive that makes organizations predictable.
 */

export interface ProtocolDefinition {
  /** Protocol identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** All possible states in this protocol */
  states: StateDefinition[];
  /** Rules for moving between states */
  transitions: TransitionRule[];
  /** Which roles can act in which states */
  roles: Record<string, string[]>;
}

export interface StateDefinition {
  /** State identifier */
  name: string;
  /** Display label */
  label: string;
  /** Which role "owns" this state (responsible for advancing it) */
  owner?: string;
  /** Is this a terminal state? (No outgoing transitions) */
  terminal?: boolean;
  /** Maximum time allowed in this state (ms) before escalation */
  timeout?: number;
  /** Icon or emoji for visualization */
  icon?: string;
}

export interface TransitionRule {
  /** Source state */
  from: string;
  /** Target state */
  to: string;
  /** Condition expression (simple DSL: "review.approved", "score > 80") */
  guard?: string;
  /** Side effect to trigger on transition */
  action?: string;
  /** Which role is required to trigger this transition */
  requiredRole?: string;
  /** Human-readable label for this transition */
  label?: string;
}
