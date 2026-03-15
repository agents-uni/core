/**
 * Promotion Engine — manages agent rank changes based on performance.
 *
 * Promotion/demotion rules are the evolutionary pressure that
 * shapes agent behavior over time.
 */

import type { EvolutionConfig } from '../types/index.js';
import type { PerformanceTracker } from './performance-tracker.js';
import type { AgentRegistry } from '../core/agent-registry.js';
import type { EventBus } from '../core/event-bus.js';

export interface PromotionDecision {
  agentId: string;
  action: 'promote' | 'demote' | 'suspend' | 'none';
  currentRank: number;
  newRank?: number;
  reason: string;
  score: number;
}

export class PromotionEngine {
  constructor(
    private config: EvolutionConfig,
    private tracker: PerformanceTracker,
    private registry: AgentRegistry,
    private events: EventBus
  ) {}

  /** Evaluate all agents and produce promotion/demotion decisions */
  evaluate(): PromotionDecision[] {
    const decisions: PromotionDecision[] = [];

    for (const citizen of this.registry.getAll()) {
      if (citizen.status === 'eliminated') continue;

      const agentId = citizen.definition.id;
      const score = this.tracker.getAverageScore(agentId);
      const trend = this.tracker.getTrend(agentId);
      const recordCount = this.tracker.getRecordCount(agentId);
      const currentRank = citizen.definition.rank ?? 0;

      // Need minimum records before evaluation
      if (recordCount < 3) {
        decisions.push({
          agentId,
          action: 'none',
          currentRank,
          reason: `Insufficient data (${recordCount}/${3} evaluations)`,
          score,
        });
        continue;
      }

      if (score >= this.config.promotionThreshold && trend >= 0) {
        const newRank = Math.min(100, currentRank + 10);
        decisions.push({
          agentId,
          action: 'promote',
          currentRank,
          newRank,
          reason: `Score ${score.toFixed(1)} ≥ ${this.config.promotionThreshold} with positive trend`,
          score,
        });
      } else if (score <= this.config.demotionThreshold) {
        if (currentRank <= 10) {
          decisions.push({
            agentId,
            action: 'suspend',
            currentRank,
            reason: `Score ${score.toFixed(1)} ≤ ${this.config.demotionThreshold} at minimum rank`,
            score,
          });
        } else {
          const newRank = Math.max(0, currentRank - 10);
          decisions.push({
            agentId,
            action: 'demote',
            currentRank,
            newRank,
            reason: `Score ${score.toFixed(1)} ≤ ${this.config.demotionThreshold}`,
            score,
          });
        }
      } else {
        decisions.push({
          agentId,
          action: 'none',
          currentRank,
          reason: `Score ${score.toFixed(1)} within normal range`,
          score,
        });
      }
    }

    return decisions;
  }

  /** Apply promotion decisions */
  async apply(decisions: PromotionDecision[]): Promise<void> {
    for (const decision of decisions) {
      if (decision.action === 'none') continue;

      const citizen = this.registry.get(decision.agentId);
      if (!citizen) continue;

      switch (decision.action) {
        case 'promote':
          citizen.definition.rank = decision.newRank;
          await this.events.emitSimple(
            'agent.promoted',
            [decision.agentId],
            `${citizen.definition.name} promoted to rank ${decision.newRank}: ${decision.reason}`,
            { previousRank: decision.currentRank, newRank: decision.newRank, score: decision.score }
          );
          break;

        case 'demote':
          citizen.definition.rank = decision.newRank;
          await this.events.emitSimple(
            'agent.demoted',
            [decision.agentId],
            `${citizen.definition.name} demoted to rank ${decision.newRank}: ${decision.reason}`,
            { previousRank: decision.currentRank, newRank: decision.newRank, score: decision.score }
          );
          break;

        case 'suspend':
          this.registry.setStatus(decision.agentId, 'suspended');
          await this.events.emitSimple(
            'agent.suspended',
            [decision.agentId],
            `${citizen.definition.name} suspended: ${decision.reason}`,
            { rank: decision.currentRank, score: decision.score }
          );
          break;
      }
    }
  }

  /** Run a full evaluation cycle */
  async runCycle(): Promise<PromotionDecision[]> {
    const decisions = this.evaluate();
    await this.apply(decisions);

    await this.events.emitSimple(
      'evolution.cycleCompleted',
      [],
      `Evolution cycle completed: ${decisions.filter(d => d.action !== 'none').length} changes`,
      { decisions: decisions.map(d => ({ agent: d.agentId, action: d.action })) }
    );

    return decisions;
  }
}
