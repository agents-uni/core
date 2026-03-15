/**
 * Performance Tracker — tracks and evaluates agent performance over time.
 */

import type { PerformanceRecord, EvolutionConfig } from '../types/index.js';

export class PerformanceTracker {
  private records: Map<string, PerformanceRecord[]>;
  private window: number;

  constructor(config: EvolutionConfig) {
    this.records = new Map();
    this.window = config.performanceWindow;
  }

  /** Record a performance evaluation */
  record(agentId: string, taskId: string, score: number, dimensions: Record<string, number> = {}): PerformanceRecord {
    const record: PerformanceRecord = {
      agentId,
      taskId,
      score: Math.max(0, Math.min(100, score)),
      dimensions,
      evaluatedAt: new Date().toISOString(),
    };

    const existing = this.records.get(agentId) ?? [];
    existing.push(record);

    // Keep only the most recent records within window
    if (existing.length > this.window) {
      existing.splice(0, existing.length - this.window);
    }

    this.records.set(agentId, existing);
    return record;
  }

  /** Get average performance score for an agent */
  getAverageScore(agentId: string): number {
    const records = this.records.get(agentId);
    if (!records || records.length === 0) return 50; // Default neutral score

    const sum = records.reduce((acc, r) => acc + r.score, 0);
    return sum / records.length;
  }

  /** Get performance trend (positive = improving, negative = declining) */
  getTrend(agentId: string): number {
    const records = this.records.get(agentId);
    if (!records || records.length < 2) return 0;

    const half = Math.floor(records.length / 2);
    const recentHalf = records.slice(half);
    const earlierHalf = records.slice(0, half);

    const recentAvg = recentHalf.reduce((s, r) => s + r.score, 0) / recentHalf.length;
    const earlierAvg = earlierHalf.reduce((s, r) => s + r.score, 0) / earlierHalf.length;

    return recentAvg - earlierAvg;
  }

  /** Get dimension breakdown for an agent */
  getDimensionAverages(agentId: string): Record<string, number> {
    const records = this.records.get(agentId);
    if (!records || records.length === 0) return {};

    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};

    for (const record of records) {
      for (const [dim, val] of Object.entries(record.dimensions)) {
        sums[dim] = (sums[dim] ?? 0) + val;
        counts[dim] = (counts[dim] ?? 0) + 1;
      }
    }

    const averages: Record<string, number> = {};
    for (const dim of Object.keys(sums)) {
      averages[dim] = sums[dim] / counts[dim];
    }
    return averages;
  }

  /** Get all records for an agent */
  getRecords(agentId: string): PerformanceRecord[] {
    return this.records.get(agentId) ?? [];
  }

  /** Get leaderboard sorted by average score */
  getLeaderboard(): Array<{ agentId: string; averageScore: number; trend: number; totalRecords: number }> {
    const entries: Array<{ agentId: string; averageScore: number; trend: number; totalRecords: number }> = [];

    for (const agentId of this.records.keys()) {
      entries.push({
        agentId,
        averageScore: this.getAverageScore(agentId),
        trend: this.getTrend(agentId),
        totalRecords: this.getRecords(agentId).length,
      });
    }

    return entries.sort((a, b) => b.averageScore - a.averageScore);
  }

  /** Get record count for an agent */
  getRecordCount(agentId: string): number {
    return (this.records.get(agentId) ?? []).length;
  }
}
