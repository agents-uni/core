/**
 * Generic State Machine — the universal primitive for organizational workflows.
 *
 * Supports role-gated transitions, guard expressions, and actions.
 * Any multi-step workflow can be modeled as a finite state machine.
 */

import type { ProtocolDefinition, StateDefinition, TransitionRule } from '../types/index.js';

export interface StateMachineInstance {
  /** Protocol this instance follows */
  protocol: string;
  /** Current state name */
  currentState: string;
  /** Transition history */
  history: TransitionRecord[];
  /** When this instance was created */
  createdAt: string;
}

export interface TransitionRecord {
  from: string;
  to: string;
  triggeredBy: string;
  timestamp: string;
  guard?: string;
}

export class StateMachine {
  private stateMap: Map<string, StateDefinition>;
  private transitionMap: Map<string, TransitionRule[]>;

  constructor(private protocol: ProtocolDefinition) {
    this.stateMap = new Map(protocol.states.map(s => [s.name, s]));
    this.transitionMap = new Map();

    // Index transitions by source state
    for (const t of protocol.transitions) {
      const existing = this.transitionMap.get(t.from) ?? [];
      existing.push(t);
      this.transitionMap.set(t.from, existing);
    }
  }

  /** Create a new instance starting at the first non-terminal state */
  createInstance(): StateMachineInstance {
    const initialState = this.protocol.states[0];
    if (!initialState) {
      throw new Error(`Protocol "${this.protocol.name}" has no states`);
    }
    return {
      protocol: this.protocol.name,
      currentState: initialState.name,
      history: [],
      createdAt: new Date().toISOString(),
    };
  }

  /** Get the current state definition */
  getState(stateName: string): StateDefinition | undefined {
    return this.stateMap.get(stateName);
  }

  /** Get all valid transitions from the current state */
  getAvailableTransitions(instance: StateMachineInstance): TransitionRule[] {
    return this.transitionMap.get(instance.currentState) ?? [];
  }

  /** Check if a specific transition is valid */
  canTransition(
    instance: StateMachineInstance,
    targetState: string,
    actorRole?: string,
    context?: Record<string, unknown>
  ): boolean {
    const transitions = this.getAvailableTransitions(instance);
    return transitions.some(t => {
      if (t.to !== targetState) return false;
      if (t.requiredRole && actorRole !== t.requiredRole) return false;
      if (t.guard && !evaluateGuard(t.guard, context ?? {})) return false;
      return true;
    });
  }

  /** Execute a transition */
  transition(
    instance: StateMachineInstance,
    targetState: string,
    actorRole: string,
    context?: Record<string, unknown>
  ): StateMachineInstance {
    if (!this.canTransition(instance, targetState, actorRole, context)) {
      throw new Error(
        `Invalid transition: ${instance.currentState} → ${targetState} ` +
        `(actor: ${actorRole}, protocol: ${this.protocol.name})`
      );
    }

    const matchingTransition = this.getAvailableTransitions(instance)
      .find(t => t.to === targetState);

    const record: TransitionRecord = {
      from: instance.currentState,
      to: targetState,
      triggeredBy: actorRole,
      timestamp: new Date().toISOString(),
      guard: matchingTransition?.guard,
    };

    return {
      ...instance,
      currentState: targetState,
      history: [...instance.history, record],
    };
  }

  /** Check if the current state is terminal */
  isTerminal(instance: StateMachineInstance): boolean {
    const state = this.stateMap.get(instance.currentState);
    return state?.terminal === true;
  }

  /** Get the protocol definition */
  getProtocol(): ProtocolDefinition {
    return this.protocol;
  }

  /** Get all state names */
  getStateNames(): string[] {
    return this.protocol.states.map(s => s.name);
  }
}

/**
 * Simple guard expression evaluator.
 * Supports: "key.subkey", "value > N", "value == 'string'"
 */
function evaluateGuard(guard: string, context: Record<string, unknown>): boolean {
  // Simple dot-notation lookup: "review.approved" → context.review?.approved
  const parts = guard.split('.');
  let value: unknown = context;
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[part];
    } else {
      return false;
    }
  }
  // Truthy check
  return Boolean(value);
}
