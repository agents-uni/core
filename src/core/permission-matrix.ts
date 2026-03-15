/**
 * Permission Matrix — the social contract of an agent organization.
 *
 * Explicit permissions prevent agent chaos: no agent can arbitrarily
 * escalate privileges or bypass another agent.
 */

import type { PermissionEntry, PermissionAction, GovernanceConfig } from '../types/index.js';
import type { AgentDefinition } from '../types/index.js';

export class PermissionMatrix {
  /** Map: "actor:target" → Set of allowed actions */
  private entries: Map<string, Set<PermissionAction>>;
  /** Map: agentId → role title for role-based lookups */
  private roleMap: Map<string, string>;

  constructor(governance: GovernanceConfig, agents: AgentDefinition[]) {
    this.entries = new Map();
    this.roleMap = new Map();

    // Build role map
    for (const agent of agents) {
      this.roleMap.set(agent.id, agent.role.title);
    }

    // Index permissions
    for (const entry of governance.permissionMatrix) {
      const key = this.makeKey(entry.actor, entry.target);
      const existing = this.entries.get(key) ?? new Set();
      for (const action of entry.actions) {
        existing.add(action);
      }
      this.entries.set(key, existing);
    }
  }

  /** Check if actor can perform action on target */
  isAllowed(actorId: string, targetId: string, action: PermissionAction): boolean {
    // Direct ID-based check
    const directKey = this.makeKey(actorId, targetId);
    if (this.entries.get(directKey)?.has(action)) return true;

    // Role-based check (actor ID → role, target ID → role)
    const actorRole = this.roleMap.get(actorId);
    const targetRole = this.roleMap.get(targetId);

    if (actorRole) {
      const roleKey = this.makeKey(actorRole, targetId);
      if (this.entries.get(roleKey)?.has(action)) return true;
    }

    if (targetRole) {
      const targetRoleKey = this.makeKey(actorId, targetRole);
      if (this.entries.get(targetRoleKey)?.has(action)) return true;
    }

    if (actorRole && targetRole) {
      const bothRoleKey = this.makeKey(actorRole, targetRole);
      if (this.entries.get(bothRoleKey)?.has(action)) return true;
    }

    return false;
  }

  /** Get all actions actor can perform on target */
  getAllowedActions(actorId: string, targetId: string): PermissionAction[] {
    const allActions: PermissionAction[] = [
      'call', 'assign', 'review', 'approve', 'reject',
      'promote', 'demote', 'suspend', 'eliminate', 'allocate',
    ];
    return allActions.filter(action => this.isAllowed(actorId, targetId, action));
  }

  /** Get all agents that actor can perform a specific action on */
  getTargetsForAction(actorId: string, action: PermissionAction, allAgentIds: string[]): string[] {
    return allAgentIds.filter(targetId => this.isAllowed(actorId, targetId, action));
  }

  /** Add a runtime permission (for mutable governance) */
  grant(actor: string, target: string, action: PermissionAction): void {
    const key = this.makeKey(actor, target);
    const existing = this.entries.get(key) ?? new Set();
    existing.add(action);
    this.entries.set(key, existing);
  }

  /** Remove a runtime permission */
  revoke(actor: string, target: string, action: PermissionAction): void {
    const key = this.makeKey(actor, target);
    this.entries.get(key)?.delete(action);
  }

  /** Export as a printable matrix for visualization */
  toMatrix(agentIds: string[]): { headers: string[]; rows: Array<{ agent: string; permissions: string[] }> } {
    const headers = agentIds;
    const rows = agentIds.map(actorId => ({
      agent: actorId,
      permissions: agentIds.map(targetId => {
        const actions = this.getAllowedActions(actorId, targetId);
        return actions.length > 0 ? actions.join(',') : '-';
      }),
    }));
    return { headers, rows };
  }

  private makeKey(actor: string, target: string): string {
    return `${actor}:${target}`;
  }
}
