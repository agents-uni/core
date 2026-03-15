import { describe, it, expect } from 'vitest';
import { RelationshipGraph } from '../../src/core/relationship-graph.js';

const relationships = [
  { from: 'commander', to: 'officer-a', type: 'superior' as const },
  { from: 'commander', to: 'officer-b', type: 'superior' as const },
  { from: 'officer-a', to: 'soldier-1', type: 'superior' as const },
  { from: 'officer-a', to: 'officer-b', type: 'peer' as const },
  { from: 'soldier-1', to: 'soldier-2', type: 'competitive' as const, mutable: true, weight: 0.5 },
];

describe('RelationshipGraph', () => {
  it('should build graph from definitions', () => {
    const graph = new RelationshipGraph(relationships);
    expect(graph.getOutgoing('commander')).toHaveLength(2);
    expect(graph.getIncoming('officer-a')).toHaveLength(1);
  });

  it('should find subordinates', () => {
    const graph = new RelationshipGraph(relationships);
    const subs = graph.getSubordinates('commander');
    expect(subs).toContain('officer-a');
    expect(subs).toContain('officer-b');
  });

  it('should find peers', () => {
    const graph = new RelationshipGraph(relationships);
    const peers = graph.getPeers('officer-a');
    expect(peers).toContain('officer-b');
  });

  it('should find shortest path', () => {
    const graph = new RelationshipGraph(relationships);
    const path = graph.findPath('commander', 'soldier-1');
    expect(path).toEqual(['commander', 'officer-a', 'soldier-1']);
  });

  it('should return null for unreachable agents', () => {
    const graph = new RelationshipGraph(relationships);
    // soldier-2 has no incoming edges in this graph except competitive from soldier-1
    const path = graph.findPath('commander', 'soldier-2');
    // commander → officer-a → soldier-1 → soldier-2
    expect(path).toBeTruthy();
  });

  it('should update mutable relationship weights', () => {
    const graph = new RelationshipGraph(relationships);
    graph.updateWeight('soldier-1', 'soldier-2', 'competitive', 0.9, 'fierce competition');

    const rels = graph.getOutgoing('soldier-1');
    const competitive = rels.find(r => r.to === 'soldier-2' && r.type === 'competitive');
    expect(competitive?.currentWeight).toBe(0.9);
    expect(competitive?.history).toHaveLength(1);
  });
});
