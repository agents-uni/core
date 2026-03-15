/**
 * Universe — the top-level runtime container.
 *
 * A Universe holds all the moving parts: agents, relationships, protocols,
 * resources, and events. It is the "world" in which agents operate.
 */

import type { UniverseConfig, UniverseSnapshot } from '../types/index.js';
import { AgentRegistry } from './agent-registry.js';
import { RelationshipGraph } from './relationship-graph.js';
import { PermissionMatrix } from './permission-matrix.js';
import { ResourcePool } from './resource-pool.js';
import { EventBus } from './event-bus.js';
import { StateMachine } from './state-machine.js';

export class Universe {
  readonly config: UniverseConfig;
  readonly agents: AgentRegistry;
  readonly graph: RelationshipGraph;
  readonly permissions: PermissionMatrix;
  readonly resources: ResourcePool;
  readonly events: EventBus;
  readonly protocols: Map<string, StateMachine>;

  private tick = 0;
  private initialized = false;

  constructor(config: UniverseConfig) {
    this.config = config;
    this.agents = new AgentRegistry(config.agents);
    this.graph = new RelationshipGraph(config.relationships);
    this.permissions = new PermissionMatrix(config.governance, config.agents);
    this.resources = new ResourcePool(config.resources ?? []);
    this.events = new EventBus(config.evolution?.memoryRetention ?? 1000);

    this.protocols = new Map();
    for (const proto of config.protocols) {
      this.protocols.set(proto.name, new StateMachine(proto));
    }
  }

  /** Initialize the universe — distribute initial resources, emit birth event */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Distribute initial resources based on strategy
    const agentIds = this.agents.getAllIds();
    const rankMap: Record<string, number> = {};
    for (const citizen of this.agents.getAll()) {
      rankMap[citizen.definition.id] = citizen.definition.rank ?? 0;
    }

    for (const resDef of this.resources.getAllDefinitions()) {
      this.resources.distribute(resDef.name, agentIds, resDef.distribution, rankMap);
    }

    // Set all agents to idle
    for (const id of agentIds) {
      this.agents.setStatus(id, 'idle');
    }

    await this.events.emitSimple(
      'custom',
      [],
      `Universe "${this.config.name}" initialized with ${agentIds.length} agents`,
      { agentCount: agentIds.length, type: this.config.type }
    );

    this.initialized = true;
  }

  /** Advance the universe by one tick (for evolution) */
  async advanceTick(): Promise<void> {
    this.tick++;

    // Apply resource decay
    for (const resDef of this.resources.getAllDefinitions()) {
      if (resDef.decayRate && resDef.decayRate > 0) {
        const transfers = this.resources.applyDecay(resDef.name);
        for (const t of transfers) {
          await this.events.emitSimple(
            'resource.decayed',
            [t.from],
            `${t.from} lost ${t.amount} ${t.resource} to decay`,
            { resource: t.resource, amount: t.amount }
          );
        }
      }
    }
  }

  /** Get a protocol by name */
  getProtocol(name: string): StateMachine | undefined {
    return this.protocols.get(name);
  }

  /** Take a snapshot of the current state */
  snapshot(): UniverseSnapshot {
    const agentStates: Record<string, Record<string, unknown>> = {};
    for (const citizen of this.agents.getAll()) {
      agentStates[citizen.definition.id] = {
        status: citizen.status,
        performanceScore: citizen.performanceScore,
        ...citizen.state,
      };
    }

    return {
      config: this.config,
      tick: this.tick,
      timestamp: new Date().toISOString(),
      agentStates,
      resourceAllocations: this.resources.snapshot(),
      protocolStates: {},
      relationshipWeights: [],
    };
  }

  /** Get current tick */
  getTick(): number {
    return this.tick;
  }

  /** Check if initialized */
  isInitialized(): boolean {
    return this.initialized;
  }
}
