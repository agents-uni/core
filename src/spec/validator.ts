import type { UniverseConfig } from '../types/index.js';
import { validateUniverseSpec, type ValidationResult, type ValidationError } from '../schema/index.js';

/**
 * Validate a universe spec at two levels:
 * 1. JSON Schema validation (structure)
 * 2. Semantic validation (references, consistency)
 */
export function validateSpec(config: UniverseConfig): ValidationResult {
  // Level 1: JSON Schema
  const schemaResult = validateUniverseSpec(config);
  if (!schemaResult.valid) {
    return schemaResult;
  }

  // Level 2: Semantic validation
  const semanticErrors = validateSemantics(config);
  if (semanticErrors.length > 0) {
    return { valid: false, errors: semanticErrors };
  }

  return { valid: true, errors: [] };
}

function validateSemantics(config: UniverseConfig): ValidationError[] {
  const errors: ValidationError[] = [];
  const agentIds = new Set(config.agents.map(a => a.id));

  // Check relationship references
  for (const rel of config.relationships) {
    if (!agentIds.has(rel.from)) {
      errors.push({
        path: `/relationships`,
        message: `Relationship references unknown agent: "${rel.from}"`,
        keyword: 'reference',
      });
    }
    if (!agentIds.has(rel.to)) {
      errors.push({
        path: `/relationships`,
        message: `Relationship references unknown agent: "${rel.to}"`,
        keyword: 'reference',
      });
    }
  }

  // Check protocol state references in transitions
  for (const protocol of config.protocols) {
    const stateNames = new Set(protocol.states.map(s => s.name));

    for (const transition of protocol.transitions) {
      if (!stateNames.has(transition.from)) {
        errors.push({
          path: `/protocols/${protocol.name}/transitions`,
          message: `Transition references unknown state: "${transition.from}"`,
          keyword: 'reference',
        });
      }
      if (!stateNames.has(transition.to)) {
        errors.push({
          path: `/protocols/${protocol.name}/transitions`,
          message: `Transition references unknown state: "${transition.to}"`,
          keyword: 'reference',
        });
      }
    }

    // Check that terminal states have no outgoing transitions
    const terminalStates = new Set(
      protocol.states.filter(s => s.terminal).map(s => s.name)
    );
    for (const transition of protocol.transitions) {
      if (terminalStates.has(transition.from)) {
        errors.push({
          path: `/protocols/${protocol.name}/transitions`,
          message: `Terminal state "${transition.from}" has outgoing transition`,
          keyword: 'terminal',
        });
      }
    }
  }

  // Check permission matrix references
  for (const entry of config.governance.permissionMatrix) {
    const validActors = new Set([...agentIds, ...config.agents.map(a => a.role.title)]);
    if (!validActors.has(entry.actor)) {
      errors.push({
        path: `/governance/permissionMatrix`,
        message: `Permission entry references unknown actor: "${entry.actor}"`,
        keyword: 'reference',
      });
    }
    if (!validActors.has(entry.target)) {
      errors.push({
        path: `/governance/permissionMatrix`,
        message: `Permission entry references unknown target: "${entry.target}"`,
        keyword: 'reference',
      });
    }
  }

  // Check unique agent IDs
  const idCounts = new Map<string, number>();
  for (const agent of config.agents) {
    idCounts.set(agent.id, (idCounts.get(agent.id) ?? 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      errors.push({
        path: `/agents`,
        message: `Duplicate agent ID: "${id}" (found ${count} times)`,
        keyword: 'uniqueness',
      });
    }
  }

  return errors;
}
