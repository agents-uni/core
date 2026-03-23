/**
 * Relationship Graph — the social fabric of a Universe.
 *
 * A directed multigraph where agents are nodes and relationships are edges.
 * Supports traversal algorithms for finding communication paths,
 * influence chains, and organizational distance.
 */

import type { RelationshipDefinition, RelationshipType, LiveRelationship } from '../types/index.js';

export class RelationshipGraph {
  /** adjacency list: agentId → [outgoing relationships] */
  private outgoing: Map<string, LiveRelationship[]>;
  /** reverse adjacency: agentId → [incoming relationships] */
  private incoming: Map<string, LiveRelationship[]>;

  constructor(relationships: RelationshipDefinition[]) {
    this.outgoing = new Map();
    this.incoming = new Map();

    for (const rel of relationships) {
      this.addRelationship(rel);
    }
  }

  /** Add a new relationship */
  addRelationship(rel: RelationshipDefinition): void {
    const live: LiveRelationship = {
      ...rel,
      currentWeight: rel.weight ?? 0.5,
      establishedAt: new Date().toISOString(),
      history: [],
    };

    const out = this.outgoing.get(rel.from) ?? [];
    out.push(live);
    this.outgoing.set(rel.from, out);

    const inc = this.incoming.get(rel.to) ?? [];
    inc.push(live);
    this.incoming.set(rel.to, inc);
  }

  /** Get all outgoing relationships from an agent */
  getOutgoing(agentId: string): LiveRelationship[] {
    return this.outgoing.get(agentId) ?? [];
  }

  /** Get all incoming relationships to an agent */
  getIncoming(agentId: string): LiveRelationship[] {
    return this.incoming.get(agentId) ?? [];
  }

  /** Get direct relationships between two agents (both directions) */
  getBetween(fromId: string, toId: string): LiveRelationship[] {
    const out = this.getOutgoing(fromId).filter(r => r.to === toId);
    const inc = this.getOutgoing(toId).filter(r => r.to === fromId);
    return [...out, ...inc];
  }

  /** Get all agents that have a specific relationship type with the given agent */
  getRelatedAgents(agentId: string, type: RelationshipType, direction: 'outgoing' | 'incoming' | 'both' = 'both'): string[] {
    const results = new Set<string>();

    if (direction === 'outgoing' || direction === 'both') {
      for (const rel of this.getOutgoing(agentId)) {
        if (rel.type === type) results.add(rel.to);
      }
    }

    if (direction === 'incoming' || direction === 'both') {
      for (const rel of this.getIncoming(agentId)) {
        if (rel.type === type) results.add(rel.from);
      }
    }

    return [...results];
  }

  /** Get superiors (agents with 'superior' relationship to this agent) */
  getSuperiors(agentId: string): string[] {
    return this.getRelatedAgents(agentId, 'superior', 'incoming');
  }

  /** Get subordinates */
  getSubordinates(agentId: string): string[] {
    return this.getRelatedAgents(agentId, 'superior', 'outgoing');
  }

  /** Get peers */
  getPeers(agentId: string): string[] {
    return this.getRelatedAgents(agentId, 'peer', 'both');
  }

  /** Get competitors */
  getCompetitors(agentId: string): string[] {
    return this.getRelatedAgents(agentId, 'competitive', 'both');
  }

  /** Get allies */
  getAllies(agentId: string): string[] {
    return this.getRelatedAgents(agentId, 'ally', 'both');
  }

  /** Get rivals */
  getRivals(agentId: string): string[] {
    return this.getRelatedAgents(agentId, 'rival', 'both');
  }

  /** Find shortest path between two agents (BFS) */
  findPath(fromId: string, toId: string): string[] | null {
    if (fromId === toId) return [fromId];

    const visited = new Set<string>();
    const queue: Array<{ node: string; path: string[] }> = [
      { node: fromId, path: [fromId] },
    ];

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      if (visited.has(node)) continue;
      visited.add(node);

      for (const rel of this.getOutgoing(node)) {
        if (rel.to === toId) return [...path, toId];
        if (!visited.has(rel.to)) {
          queue.push({ node: rel.to, path: [...path, rel.to] });
        }
      }
    }

    return null;
  }

  /** Update a relationship's weight (for evolution) */
  updateWeight(fromId: string, toId: string, type: RelationshipType, newWeight: number, reason: string): boolean {
    const rels = this.getOutgoing(fromId).filter(r => r.to === toId && r.type === type);
    if (rels.length === 0) return false;

    for (const rel of rels) {
      if (rel.mutable === false) continue;
      rel.history.push({
        timestamp: new Date().toISOString(),
        previousWeight: rel.currentWeight,
        newWeight,
        reason,
      });
      rel.currentWeight = Math.max(0, Math.min(1, newWeight));
    }
    return true;
  }

  /** Get all unique agent IDs in the graph */
  getAllAgentIds(): string[] {
    const ids = new Set<string>();
    for (const [from, rels] of this.outgoing) {
      ids.add(from);
      for (const rel of rels) ids.add(rel.to);
    }
    return [...ids];
  }

  /** Export as adjacency list for visualization */
  toAdjacencyList(): Record<string, Array<{ to: string; type: RelationshipType; weight: number }>> {
    const result: Record<string, Array<{ to: string; type: RelationshipType; weight: number }>> = {};
    for (const [from, rels] of this.outgoing) {
      result[from] = rels.map(r => ({ to: r.to, type: r.type, weight: r.currentWeight }));
    }
    return result;
  }
}
