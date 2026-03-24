/**
 * Organization Events — the observable side effects of organizational life.
 *
 * Events are first-class citizens, not an afterthought. Every meaningful
 * change in the universe emits an event. This enables:
 * 1. Complete audit trail
 * 2. Reactive evolution (relationships change in response to events)
 * 3. Narrative generation (events → human-readable story)
 */

export type OrganizationEventType =
  | 'agent.joined'
  | 'agent.promoted'
  | 'agent.demoted'
  | 'agent.suspended'
  | 'agent.eliminated'
  | 'agent.reinstated'
  | 'alliance.formed'
  | 'alliance.broken'
  | 'rivalry.started'
  | 'rivalry.resolved'
  | 'resource.allocated'
  | 'resource.transferred'
  | 'resource.decayed'
  | 'task.created'
  | 'task.assigned'
  | 'task.completed'
  | 'task.failed'
  | 'review.approved'
  | 'review.rejected'
  | 'review.dispatched'
  | 'protocol.stateChanged'
  | 'governance.changed'
  | 'evolution.cycleCompleted'
  | 'race.dispatched'
  | 'race.submitted'
  | 'race.collected'
  | 'race.judged'
  | 'custom';

export interface OrganizationEvent {
  /** Unique event ID */
  id: string;
  /** Event classification */
  type: OrganizationEventType;
  /** When this event occurred */
  timestamp: string;
  /** Agents involved in this event */
  actors: string[];
  /** Event-specific payload */
  data: Record<string, unknown>;
  /** Human-readable narrative of what happened */
  narrative: string;
}

export type EventHandler = (event: OrganizationEvent) => void | Promise<void>;

export interface EventSubscription {
  /** Event types to listen for (empty = all) */
  types: OrganizationEventType[];
  /** Handler function */
  handler: EventHandler;
  /** Unique subscription ID */
  id: string;
}
