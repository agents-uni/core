import { describe, it, expect } from 'vitest';
import { ResourcePool } from '../../src/core/resource-pool.js';

const resources = [
  { name: 'favor', type: 'finite' as const, total: 1000, distribution: 'competitive' as const, decayRate: 0.1 },
  { name: 'allowance', type: 'renewable' as const, total: 500, distribution: 'hierarchy' as const },
];

describe('ResourcePool', () => {
  it('should allocate resources', () => {
    const pool = new ResourcePool(resources);
    const ok = pool.allocate('agent-1', 'favor', 100, 'initial grant');
    expect(ok).toBe(true);
    expect(pool.getBalance('agent-1', 'favor')).toBe(100);
    expect(pool.getRemaining('favor')).toBe(900);
  });

  it('should reject over-allocation', () => {
    const pool = new ResourcePool(resources);
    pool.allocate('agent-1', 'favor', 900, 'big grant');
    const ok = pool.allocate('agent-2', 'favor', 200, 'too much');
    expect(ok).toBe(false);
  });

  it('should transfer between agents', () => {
    const pool = new ResourcePool(resources);
    pool.allocate('agent-1', 'favor', 100, 'initial');

    const ok = pool.transfer('agent-1', 'agent-2', 'favor', 30, 'gift');
    expect(ok).toBe(true);
    expect(pool.getBalance('agent-1', 'favor')).toBe(70);
    expect(pool.getBalance('agent-2', 'favor')).toBe(30);
  });

  it('should apply decay', () => {
    const pool = new ResourcePool(resources);
    pool.allocate('agent-1', 'favor', 100, 'initial');

    const transfers = pool.applyDecay('favor');
    expect(transfers).toHaveLength(1);
    expect(pool.getBalance('agent-1', 'favor')).toBe(90);
  });

  it('should distribute by hierarchy', () => {
    const pool = new ResourcePool(resources);
    pool.distribute('allowance', ['high', 'low'], 'hierarchy', { high: 80, low: 20 });

    expect(pool.getBalance('high', 'allowance')).toBe(400);
    expect(pool.getBalance('low', 'allowance')).toBe(100);
  });

  it('should return leaderboard', () => {
    const pool = new ResourcePool(resources);
    pool.allocate('agent-a', 'favor', 50, 'a');
    pool.allocate('agent-b', 'favor', 100, 'b');
    pool.allocate('agent-c', 'favor', 75, 'c');

    const board = pool.getLeaderboard('favor');
    expect(board[0].agentId).toBe('agent-b');
    expect(board[1].agentId).toBe('agent-c');
    expect(board[2].agentId).toBe('agent-a');
  });
});
