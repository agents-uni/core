/**
 * Organization Memory and Evolution — how organizations learn and adapt.
 *
 * Individual agents have their own memory (via OpenClaw). But organizations
 * also need collective memory: what strategies worked, which agents excel
 * at what, how relationships evolved over time.
 */

export interface EvolutionConfig {
  /** How many recent tasks to consider for performance evaluation */
  performanceWindow: number;
  /** Score threshold to earn promotion (0-100) */
  promotionThreshold: number;
  /** Score below which demotion occurs (0-100) */
  demotionThreshold: number;
  /** Maximum events to keep in organization memory */
  memoryRetention: number;
  /** How often to run evolution cycle (ms). 0 = manual only. */
  evolutionInterval?: number;
}

export interface OrganizationMemory {
  /** Key lessons the organization has learned */
  lessons: Lesson[];
  /** Performance history per agent */
  performanceHistory: Record<string, PerformanceRecord[]>;
  /** Relationship evolution timeline */
  relationshipTimeline: RelationshipSnapshot[];
  /** Resource distribution history */
  resourceHistory: ResourceSnapshot[];
}

export interface Lesson {
  /** Unique identifier */
  id: string;
  /** What was learned */
  content: string;
  /** Context in which it was learned */
  context: string;
  /** Which agents were involved */
  agents: string[];
  /** When this lesson was recorded */
  learnedAt: string;
  /** How many times this lesson has been reinforced */
  reinforcements: number;
}

export interface PerformanceRecord {
  /** Agent being evaluated */
  agentId: string;
  /** Task or match that was evaluated */
  taskId: string;
  /** Overall score (0-100) */
  score: number;
  /** Breakdown by dimension */
  dimensions: Record<string, number>;
  /** When this was recorded */
  evaluatedAt: string;
}

export interface RelationshipSnapshot {
  /** Timestamp of snapshot */
  timestamp: string;
  /** All relationships at this point in time */
  relationships: Array<{
    from: string;
    to: string;
    type: string;
    weight: number;
  }>;
}

export interface ResourceSnapshot {
  /** Timestamp of snapshot */
  timestamp: string;
  /** Resource allocations at this point */
  allocations: Record<string, Record<string, number>>;
}
