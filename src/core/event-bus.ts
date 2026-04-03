/**
 * Event Bus — the nervous system of an organization.
 *
 * Every meaningful change emits an event. This enables audit trails,
 * reactive evolution, and narrative generation.
 */

import type {
  OrganizationEvent,
  OrganizationEventType,
  EventHandler,
  EventSubscription,
} from '../types/index.js';

let eventCounter = 0;

function generateEventId(): string {
  return `evt-${Date.now()}-${++eventCounter}`;
}

export class EventBus {
  private subscriptions: EventSubscription[];
  private eventLog: OrganizationEvent[];
  private maxRetention: number;

  constructor(maxRetention = 1000) {
    this.subscriptions = [];
    this.eventLog = [];
    this.maxRetention = maxRetention;
  }

  /** Subscribe to events */
  subscribe(types: OrganizationEventType[], handler: EventHandler): string {
    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.subscriptions.push({ types, handler, id });
    return id;
  }

  /** Unsubscribe */
  unsubscribe(subscriptionId: string): boolean {
    const idx = this.subscriptions.findIndex(s => s.id === subscriptionId);
    if (idx === -1) return false;
    this.subscriptions.splice(idx, 1);
    return true;
  }

  /** Emit an event */
  async emit(event: Omit<OrganizationEvent, 'id' | 'timestamp'>): Promise<OrganizationEvent> {
    const fullEvent: OrganizationEvent = {
      ...event,
      id: generateEventId(),
      timestamp: new Date().toISOString(),
    };

    // Store in log (efficient truncation: splice front instead of creating new array)
    this.eventLog.push(fullEvent);
    if (this.eventLog.length > this.maxRetention) {
      const excess = this.eventLog.length - this.maxRetention;
      this.eventLog.splice(0, excess);
    }

    // Notify subscribers
    for (const sub of this.subscriptions) {
      if (sub.types.length === 0 || sub.types.includes(fullEvent.type)) {
        try {
          await sub.handler(fullEvent);
        } catch (err) {
          console.error(`Event handler error (sub: ${sub.id}):`, err);
        }
      }
    }

    return fullEvent;
  }

  /** Quick emit helper */
  async emitSimple(
    type: OrganizationEventType,
    actors: string[],
    narrative: string,
    data: Record<string, unknown> = {}
  ): Promise<OrganizationEvent> {
    return this.emit({ type, actors, narrative, data });
  }

  /** Get event log */
  getLog(limit?: number): OrganizationEvent[] {
    if (limit) return this.eventLog.slice(-limit);
    return [...this.eventLog];
  }

  /** Get events by type */
  getByType(type: OrganizationEventType, limit?: number): OrganizationEvent[] {
    const filtered = this.eventLog.filter(e => e.type === type);
    if (limit) return filtered.slice(-limit);
    return filtered;
  }

  /** Get events involving a specific agent */
  getByAgent(agentId: string, limit?: number): OrganizationEvent[] {
    const filtered = this.eventLog.filter(e => e.actors.includes(agentId));
    if (limit) return filtered.slice(-limit);
    return filtered;
  }

  /** Get events in a time range */
  getByTimeRange(start: string, end: string): OrganizationEvent[] {
    return this.eventLog.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  /** Clear all events */
  clear(): void {
    this.eventLog = [];
  }

  /** Get event count */
  count(): number {
    return this.eventLog.length;
  }
}
