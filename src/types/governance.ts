/**
 * Governance — the rules by which an organization makes decisions.
 *
 * Key insight: mandatory institutional review
 * prevents hallucination propagation. The governance model defines
 * WHO reviews WHOM, WHO can promote/demote, and HOW decisions are made.
 */

export type DecisionModel =
  | 'autocratic'    // Single authority decides (e.g., the user/ruler)
  | 'democratic'    // Majority vote
  | 'consensus'     // All must agree
  | 'meritocratic'; // Highest-performing agents have more weight

export interface GovernanceConfig {
  /** How decisions are made in this organization */
  decisionModel: DecisionModel;
  /** Explicit permission entries (who can do what to whom) */
  permissionMatrix: PermissionEntry[];
  /** Review/approval policy */
  reviewPolicy: ReviewPolicy;
  /** What happens when things go wrong or stall */
  escalationRules: EscalationRule[];
}

export interface PermissionEntry {
  /** Who is acting (agent ID or role title) */
  actor: string;
  /** Who is being acted upon (agent ID or role title) */
  target: string;
  /** What actions are permitted */
  actions: PermissionAction[];
}

export type PermissionAction =
  | 'call'       // Can invoke/communicate with target
  | 'assign'     // Can assign tasks to target
  | 'review'     // Can review target's work
  | 'approve'    // Can approve target's output
  | 'reject'     // Can reject target's output
  | 'promote'    // Can promote target
  | 'demote'     // Can demote target
  | 'suspend'    // Can suspend target
  | 'eliminate'  // Can permanently remove target
  | 'allocate';  // Can allocate resources to target

export interface ReviewPolicy {
  /** Is review mandatory before work proceeds? */
  mandatory: boolean;
  /** Which roles can serve as reviewers */
  reviewers: string[];
  /** Maximum review rounds before auto-approve */
  maxRounds: number;
  /** Auto-approve after N rounds if still unresolved */
  autoApproveAfter?: number;
}

export interface EscalationRule {
  /** Condition that triggers escalation */
  trigger: string;
  /** Who to escalate to (agent ID or role) */
  escalateTo: string;
  /** Action to take */
  action: 'notify' | 'reassign' | 'override' | 'cancel';
  /** Timeout before escalation kicks in (ms) */
  timeoutMs?: number;
}
