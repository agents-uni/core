import { describe, it, expect } from 'vitest';
import { StateMachine } from '../../src/core/state-machine.js';
import type { ProtocolDefinition } from '../../src/types/index.js';

const approvalWorkflow: ProtocolDefinition = {
  name: 'approval-workflow',
  description: 'Standard multi-stage approval pipeline',
  states: [
    { name: 'Inbox', label: '收件' },
    { name: 'Drafting', label: '起草', owner: 'drafter' },
    { name: 'Review', label: '审议', owner: 'reviewer' },
    { name: 'Doing', label: '执行' },
    { name: 'Done', label: '完成', terminal: true },
  ],
  transitions: [
    { from: 'Inbox', to: 'Drafting', requiredRole: 'dispatcher' },
    { from: 'Drafting', to: 'Review', requiredRole: 'drafter' },
    { from: 'Review', to: 'Doing', guard: 'review.approved', requiredRole: 'reviewer' },
    { from: 'Review', to: 'Drafting', guard: 'review.rejected', requiredRole: 'reviewer' },
    { from: 'Doing', to: 'Done' },
  ],
  roles: {
    dispatcher: ['Inbox'],
    drafter: ['Drafting'],
    reviewer: ['Review'],
  },
};

describe('StateMachine', () => {
  it('should create an instance at the first state', () => {
    const sm = new StateMachine(approvalWorkflow);
    const instance = sm.createInstance();
    expect(instance.currentState).toBe('Inbox');
    expect(instance.history).toHaveLength(0);
  });

  it('should transition with correct role', () => {
    const sm = new StateMachine(approvalWorkflow);
    let instance = sm.createInstance();

    instance = sm.transition(instance, 'Drafting', 'dispatcher');
    expect(instance.currentState).toBe('Drafting');
    expect(instance.history).toHaveLength(1);
  });

  it('should reject transition with wrong role', () => {
    const sm = new StateMachine(approvalWorkflow);
    const instance = sm.createInstance();

    expect(() => sm.transition(instance, 'Drafting', 'reviewer')).toThrow();
  });

  it('should support guard conditions', () => {
    const sm = new StateMachine(approvalWorkflow);
    let instance = sm.createInstance();
    instance = sm.transition(instance, 'Drafting', 'dispatcher');
    instance = sm.transition(instance, 'Review', 'drafter');

    // Approve
    const canApprove = sm.canTransition(instance, 'Doing', 'reviewer', { review: { approved: true } });
    expect(canApprove).toBe(true);

    // Reject
    const canReject = sm.canTransition(instance, 'Drafting', 'reviewer', { review: { rejected: true } });
    expect(canReject).toBe(true);

    // No context = can't transition with guard
    const canTransitNoCtx = sm.canTransition(instance, 'Doing', 'reviewer');
    expect(canTransitNoCtx).toBe(false);
  });

  it('should detect terminal states', () => {
    const sm = new StateMachine(approvalWorkflow);
    let instance = sm.createInstance();
    expect(sm.isTerminal(instance)).toBe(false);

    instance = sm.transition(instance, 'Drafting', 'dispatcher');
    instance = sm.transition(instance, 'Review', 'drafter');
    instance = sm.transition(instance, 'Doing', 'reviewer', { review: { approved: true } });
    instance = sm.transition(instance, 'Done', 'anyone');
    expect(sm.isTerminal(instance)).toBe(true);
  });

  it('should list available transitions', () => {
    const sm = new StateMachine(approvalWorkflow);
    const instance = sm.createInstance();
    const transitions = sm.getAvailableTransitions(instance);
    expect(transitions).toHaveLength(1);
    expect(transitions[0].to).toBe('Drafting');
  });
});
