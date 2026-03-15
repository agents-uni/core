import { describe, it, expect } from 'vitest';
import { PerformanceTracker } from '../../src/evolution/performance-tracker.js';

describe('PerformanceTracker', () => {
  it('should record and compute averages', () => {
    const tracker = new PerformanceTracker({ performanceWindow: 10, promotionThreshold: 80, demotionThreshold: 30, memoryRetention: 100 });

    tracker.record('agent-1', 'task-1', 80);
    tracker.record('agent-1', 'task-2', 60);
    tracker.record('agent-1', 'task-3', 90);

    expect(tracker.getAverageScore('agent-1')).toBeCloseTo(76.67, 1);
  });

  it('should compute trend', () => {
    const tracker = new PerformanceTracker({ performanceWindow: 10, promotionThreshold: 80, demotionThreshold: 30, memoryRetention: 100 });

    // Declining scores
    tracker.record('agent-1', 't1', 90);
    tracker.record('agent-1', 't2', 80);
    tracker.record('agent-1', 't3', 50);
    tracker.record('agent-1', 't4', 40);

    expect(tracker.getTrend('agent-1')).toBeLessThan(0);
  });

  it('should return leaderboard', () => {
    const tracker = new PerformanceTracker({ performanceWindow: 10, promotionThreshold: 80, demotionThreshold: 30, memoryRetention: 100 });

    tracker.record('agent-a', 't1', 90);
    tracker.record('agent-b', 't1', 70);
    tracker.record('agent-c', 't1', 80);

    const board = tracker.getLeaderboard();
    expect(board[0].agentId).toBe('agent-a');
    expect(board[1].agentId).toBe('agent-c');
    expect(board[2].agentId).toBe('agent-b');
  });

  it('should respect performance window', () => {
    const tracker = new PerformanceTracker({ performanceWindow: 3, promotionThreshold: 80, demotionThreshold: 30, memoryRetention: 100 });

    tracker.record('agent-1', 't1', 10);
    tracker.record('agent-1', 't2', 20);
    tracker.record('agent-1', 't3', 90);
    tracker.record('agent-1', 't4', 80);
    tracker.record('agent-1', 't5', 95);

    // Only last 3 should count
    expect(tracker.getRecordCount('agent-1')).toBe(3);
    expect(tracker.getAverageScore('agent-1')).toBeCloseTo(88.33, 1);
  });

  it('should return default score for unknown agent', () => {
    const tracker = new PerformanceTracker({ performanceWindow: 10, promotionThreshold: 80, demotionThreshold: 30, memoryRetention: 100 });
    expect(tracker.getAverageScore('unknown')).toBe(50);
  });
});
