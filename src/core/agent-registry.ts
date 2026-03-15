/**
 * Agent Registry — manages agent lifecycle within a Universe.
 */

import type { AgentDefinition, Citizen, CitizenStatus } from '../types/index.js';

export class AgentRegistry {
  private citizens: Map<string, Citizen>;

  constructor(agents: AgentDefinition[]) {
    this.citizens = new Map();
    for (const agent of agents) {
      this.register(agent);
    }
  }

  /** Register a new agent as a citizen */
  register(definition: AgentDefinition): Citizen {
    if (this.citizens.has(definition.id)) {
      throw new Error(`Agent "${definition.id}" is already registered`);
    }

    const citizen: Citizen = {
      definition,
      status: 'idle',
      performanceScore: 50,
      resources: {},
      joinedAt: new Date().toISOString(),
      state: {},
    };

    this.citizens.set(definition.id, citizen);
    return citizen;
  }

  /** Remove an agent from the registry */
  unregister(agentId: string): boolean {
    return this.citizens.delete(agentId);
  }

  /** Get a citizen by ID */
  get(agentId: string): Citizen | undefined {
    return this.citizens.get(agentId);
  }

  /** Get a citizen or throw */
  getOrThrow(agentId: string): Citizen {
    const citizen = this.citizens.get(agentId);
    if (!citizen) throw new Error(`Agent "${agentId}" not found`);
    return citizen;
  }

  /** Get all citizens */
  getAll(): Citizen[] {
    return [...this.citizens.values()];
  }

  /** Get agents filtered by status */
  getByStatus(status: CitizenStatus): Citizen[] {
    return this.getAll().filter(c => c.status === status);
  }

  /** Get agents filtered by role title */
  getByRole(roleTitle: string): Citizen[] {
    return this.getAll().filter(c => c.definition.role.title === roleTitle);
  }

  /** Get agents filtered by department */
  getByDepartment(department: string): Citizen[] {
    return this.getAll().filter(c => c.definition.role.department === department);
  }

  /** Get agents sorted by rank (descending) */
  getByRank(): Citizen[] {
    return this.getAll().sort((a, b) => (b.definition.rank ?? 0) - (a.definition.rank ?? 0));
  }

  /** Update citizen status */
  setStatus(agentId: string, status: CitizenStatus): void {
    const citizen = this.getOrThrow(agentId);
    citizen.status = status;
  }

  /** Update performance score */
  setPerformanceScore(agentId: string, score: number): void {
    const citizen = this.getOrThrow(agentId);
    citizen.performanceScore = Math.max(0, Math.min(100, score));
  }

  /** Update agent state */
  setState(agentId: string, key: string, value: unknown): void {
    const citizen = this.getOrThrow(agentId);
    citizen.state[key] = value;
  }

  /** Get all agent IDs */
  getAllIds(): string[] {
    return [...this.citizens.keys()];
  }

  /** Count agents by status */
  countByStatus(): Record<CitizenStatus, number> {
    const counts: Record<CitizenStatus, number> = {
      active: 0,
      idle: 0,
      suspended: 0,
      eliminated: 0,
      probation: 0,
    };
    for (const citizen of this.citizens.values()) {
      counts[citizen.status]++;
    }
    return counts;
  }
}
