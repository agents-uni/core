/**
 * Relationship Evolver — manages how agent relationships change over time.
 *
 * Relationships are not static. Success together strengthens alliances;
 * competition for the same resources creates rivalry.
 */

import type { RelationshipType } from '../types/index.js';
import type { RelationshipGraph } from '../core/relationship-graph.js';
import type { EventBus } from '../core/event-bus.js';

export interface RelationshipChange {
  from: string;
  to: string;
  type: RelationshipType;
  previousWeight: number;
  newWeight: number;
  reason: string;
}

export class RelationshipEvolver {
  constructor(
    private graph: RelationshipGraph,
    private events: EventBus
  ) {}

  /** Strengthen a relationship (e.g., after successful collaboration) */
  async strengthen(from: string, to: string, type: RelationshipType, amount: number, reason: string): Promise<RelationshipChange | null> {
    const rels = this.graph.getOutgoing(from).filter(r => r.to === to && r.type === type);
    if (rels.length === 0) return null;

    const rel = rels[0];
    const previousWeight = rel.currentWeight;
    const newWeight = Math.min(1, previousWeight + amount);

    this.graph.updateWeight(from, to, type, newWeight, reason);

    const change: RelationshipChange = {
      from, to, type, previousWeight, newWeight, reason,
    };

    if (type === 'ally' && newWeight >= 0.8 && previousWeight < 0.8) {
      await this.events.emitSimple(
        'alliance.formed',
        [from, to],
        `Strong alliance formed between ${from} and ${to}: ${reason}`,
        { weight: newWeight }
      );
    }

    return change;
  }

  /** Weaken a relationship (e.g., after conflict or betrayal) */
  async weaken(from: string, to: string, type: RelationshipType, amount: number, reason: string): Promise<RelationshipChange | null> {
    const rels = this.graph.getOutgoing(from).filter(r => r.to === to && r.type === type);
    if (rels.length === 0) return null;

    const rel = rels[0];
    const previousWeight = rel.currentWeight;
    const newWeight = Math.max(0, previousWeight - amount);

    this.graph.updateWeight(from, to, type, newWeight, reason);

    const change: RelationshipChange = {
      from, to, type, previousWeight, newWeight, reason,
    };

    if (type === 'ally' && newWeight < 0.2 && previousWeight >= 0.2) {
      await this.events.emitSimple(
        'alliance.broken',
        [from, to],
        `Alliance broken between ${from} and ${to}: ${reason}`,
        { weight: newWeight }
      );
    }

    return change;
  }

  /** Create a new rivalry between two agents */
  async createRivalry(from: string, to: string, reason: string): Promise<void> {
    this.graph.addRelationship({
      from, to,
      type: 'rival',
      weight: 0.5,
      mutable: true,
    });

    await this.events.emitSimple(
      'rivalry.started',
      [from, to],
      `Rivalry started between ${from} and ${to}: ${reason}`,
      {}
    );
  }

  /** Resolve a rivalry (remove it) */
  async resolveRivalry(from: string, to: string, reason: string): Promise<void> {
    this.graph.updateWeight(from, to, 'rival', 0, reason);

    await this.events.emitSimple(
      'rivalry.resolved',
      [from, to],
      `Rivalry resolved between ${from} and ${to}: ${reason}`,
      {}
    );
  }

  /**
   * Auto-evolve relationships based on competition results.
   * When two agents compete: winner strengthens, loser weakens competitive ties.
   */
  async evolveFromCompetition(winnerId: string, loserId: string, margin: number): Promise<RelationshipChange[]> {
    const changes: RelationshipChange[] = [];

    // Strengthen competitive relationship
    const c1 = await this.strengthen(winnerId, loserId, 'competitive', margin * 0.1, 'competition_win');
    if (c1) changes.push(c1);

    // If margin is large, create rivalry
    if (margin > 30) {
      const existingRivalry = this.graph.getOutgoing(winnerId)
        .find(r => r.to === loserId && r.type === 'rival');
      if (!existingRivalry) {
        await this.createRivalry(winnerId, loserId, 'decisive_victory');
      }
    }

    return changes;
  }

  /**
   * Auto-evolve relationships based on collaboration results.
   */
  async evolveFromCollaboration(agentIds: string[], success: boolean): Promise<RelationshipChange[]> {
    const changes: RelationshipChange[] = [];

    for (let i = 0; i < agentIds.length; i++) {
      for (let j = i + 1; j < agentIds.length; j++) {
        if (success) {
          const c = await this.strengthen(agentIds[i], agentIds[j], 'ally', 0.1, 'successful_collaboration');
          if (c) changes.push(c);
        } else {
          const c = await this.weaken(agentIds[i], agentIds[j], 'ally', 0.05, 'failed_collaboration');
          if (c) changes.push(c);
        }
      }
    }

    return changes;
  }
}
