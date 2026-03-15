/**
 * Resource Pool — manages finite, renewable, and positional resources.
 *
 * Resources are the alignment mechanism: agents optimize for resource
 * acquisition, so designing the resource structure aligns agent behavior
 * with organizational goals.
 */

import type {
  ResourceDefinition,
  ResourceAllocation,
  ResourceTransfer,
  DistributionStrategy,
} from '../types/index.js';

export class ResourcePool {
  private definitions: Map<string, ResourceDefinition>;
  /** Map: resourceName → Map<agentId, amount> */
  private allocations: Map<string, Map<string, number>>;
  private transferLog: ResourceTransfer[];

  constructor(resources: ResourceDefinition[]) {
    this.definitions = new Map();
    this.allocations = new Map();
    this.transferLog = [];

    for (const res of resources) {
      this.definitions.set(res.name, res);
      this.allocations.set(res.name, new Map());
    }
  }

  /** Get a resource definition */
  getDefinition(name: string): ResourceDefinition | undefined {
    return this.definitions.get(name);
  }

  /** Get all resource definitions */
  getAllDefinitions(): ResourceDefinition[] {
    return [...this.definitions.values()];
  }

  /** Get current allocation for an agent */
  getBalance(agentId: string, resourceName: string): number {
    return this.allocations.get(resourceName)?.get(agentId) ?? 0;
  }

  /** Get all balances for an agent */
  getAllBalances(agentId: string): Record<string, number> {
    const balances: Record<string, number> = {};
    for (const [name] of this.definitions) {
      balances[name] = this.getBalance(agentId, name);
    }
    return balances;
  }

  /** Get total allocated amount for a resource */
  getTotalAllocated(resourceName: string): number {
    const allocs = this.allocations.get(resourceName);
    if (!allocs) return 0;
    let total = 0;
    for (const amount of allocs.values()) total += amount;
    return total;
  }

  /** Get remaining unallocated amount */
  getRemaining(resourceName: string): number {
    const def = this.definitions.get(resourceName);
    if (!def) return 0;
    return def.total - this.getTotalAllocated(resourceName);
  }

  /** Allocate resource to an agent (from system pool) */
  allocate(agentId: string, resourceName: string, amount: number, reason: string): boolean {
    const remaining = this.getRemaining(resourceName);
    if (amount > remaining) return false;

    const current = this.getBalance(agentId, resourceName);
    this.allocations.get(resourceName)!.set(agentId, current + amount);

    this.transferLog.push({
      from: 'system',
      to: agentId,
      resource: resourceName,
      amount,
      reason,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /** Transfer resource between agents */
  transfer(fromId: string, toId: string, resourceName: string, amount: number, reason: string): boolean {
    const fromBalance = this.getBalance(fromId, resourceName);
    if (amount > fromBalance) return false;

    const resAllocs = this.allocations.get(resourceName)!;
    resAllocs.set(fromId, fromBalance - amount);
    resAllocs.set(toId, this.getBalance(toId, resourceName) + amount);

    this.transferLog.push({
      from: fromId,
      to: toId,
      resource: resourceName,
      amount,
      reason,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /** Revoke resource from an agent (back to system pool) */
  revoke(agentId: string, resourceName: string, amount: number, reason: string): boolean {
    const balance = this.getBalance(agentId, resourceName);
    if (amount > balance) return false;

    this.allocations.get(resourceName)!.set(agentId, balance - amount);

    this.transferLog.push({
      from: agentId,
      to: 'system',
      resource: resourceName,
      amount,
      reason,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /** Apply decay to a resource (for finite resources with decay) */
  applyDecay(resourceName: string): ResourceTransfer[] {
    const def = this.definitions.get(resourceName);
    if (!def || !def.decayRate || def.decayRate <= 0) return [];

    const transfers: ResourceTransfer[] = [];
    const allocs = this.allocations.get(resourceName)!;

    for (const [agentId, amount] of allocs) {
      const decayAmount = Math.floor(amount * def.decayRate);
      if (decayAmount > 0) {
        allocs.set(agentId, amount - decayAmount);
        const transfer: ResourceTransfer = {
          from: agentId,
          to: 'system',
          resource: resourceName,
          amount: decayAmount,
          reason: 'decay',
          timestamp: new Date().toISOString(),
        };
        transfers.push(transfer);
        this.transferLog.push(transfer);
      }
    }

    return transfers;
  }

  /** Distribute resource according to strategy */
  distribute(
    resourceName: string,
    agentIds: string[],
    strategy: DistributionStrategy,
    rankMap?: Record<string, number>,
    performanceMap?: Record<string, number>
  ): void {
    const def = this.definitions.get(resourceName);
    if (!def) return;

    const total = def.total;

    switch (strategy) {
      case 'equal': {
        const share = Math.floor(total / agentIds.length);
        for (const id of agentIds) {
          this.setBalance(id, resourceName, share);
        }
        break;
      }
      case 'hierarchy': {
        if (!rankMap) break;
        const totalRank = agentIds.reduce((sum, id) => sum + (rankMap[id] ?? 0), 0);
        if (totalRank === 0) break;
        for (const id of agentIds) {
          const share = Math.floor(total * ((rankMap[id] ?? 0) / totalRank));
          this.setBalance(id, resourceName, share);
        }
        break;
      }
      case 'merit': {
        if (!performanceMap) break;
        const totalPerf = agentIds.reduce((sum, id) => sum + (performanceMap[id] ?? 0), 0);
        if (totalPerf === 0) break;
        for (const id of agentIds) {
          const share = Math.floor(total * ((performanceMap[id] ?? 0) / totalPerf));
          this.setBalance(id, resourceName, share);
        }
        break;
      }
      case 'competitive':
        // Competitive distribution is handled by external competition engine
        break;
    }
  }

  /** Get leaderboard for a resource */
  getLeaderboard(resourceName: string): Array<{ agentId: string; amount: number }> {
    const allocs = this.allocations.get(resourceName);
    if (!allocs) return [];

    return [...allocs.entries()]
      .map(([agentId, amount]) => ({ agentId, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  /** Get transfer history */
  getTransferLog(limit?: number): ResourceTransfer[] {
    if (limit) return this.transferLog.slice(-limit);
    return [...this.transferLog];
  }

  /** Export current state */
  snapshot(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    for (const [name, allocs] of this.allocations) {
      result[name] = Object.fromEntries(allocs);
    }
    return result;
  }

  private setBalance(agentId: string, resourceName: string, amount: number): void {
    this.allocations.get(resourceName)?.set(agentId, Math.max(0, amount));
  }
}
