/**
 * agents-uni-core — Universal protocol layer for agent organizations.
 *
 * Core mission: 提升生产力的同时，我们需要的是更优秀的生产关系。
 * (While improving productivity, what we need is better production relationships.)
 *
 * @module agents-uni-core
 */

// Types (the "language" of agent organizations)
export * from './types/index.js';

// Core runtime engine
export {
  Universe,
  AgentRegistry,
  RelationshipGraph,
  StateMachine,
  PermissionMatrix,
  ResourcePool,
  EventBus,
} from './core/index.js';
export type { StateMachineInstance, TransitionRecord } from './core/index.js';

// Evolution engine
export {
  PerformanceTracker,
  PromotionEngine,
  MemoryConsolidator,
  RelationshipEvolver,
} from './evolution/index.js';
export type { PromotionDecision, RelationshipChange } from './evolution/index.js';

// Spec processing
export { parseSpecFile, parseSpecString, validateSpec, compileUniverse } from './spec/index.js';

// OpenClaw bridge
export {
  generateSoul,
  generateAllSouls,
  deployToOpenClaw,
  registerAgentsInOpenClaw,
  checkWorkspaces,
  TaskDispatcher,
  ReviewDispatcher,
  FileWorkspaceIO,
  MemoryWorkspaceIO,
  registerUni,
  listUnis,
  getUni,
  unregisterUni,
  cleanupUni,
  updateUni,
  resetUni,
  // Agency-agents bridge
  parseAgencyAgentFile,
  toAgentDefinition,
  toSoulMd,
  importAgencyAgents,
  // Agency-agents registry
  getAgencyDir,
  isAgencyInstalled,
  agencyInit,
  agencyUpdate,
  agencyListCategories,
  agencyStatus,
  resolveAgencyCategories,
  getAvailableCategories,
  // @agents-uni/rel bridge (multi-dimensional relationships)
  createRelGraph,
  createRelEngine,
  generateEnhancedRelationshipSection,
  MultiDimRelationshipGraph,
  EvolutionEngine,
  EmergenceDetector,
  computeInfluence,
  analyzeStructure,
  detectClusters,
  RelMemoryConsolidator,
} from './bridge/index.js';
export type {
  SoulGeneratorOptions,
  RulerDefinition,
  DeployOptions,
  DeployResult,
  DispatchTask,
  AgentSubmission,
  DispatchResult,
  DispatcherOptions,
  WorkspaceIO,
  EvaluationCriterion,
  ReviewConfig,
  AgentReview,
  SingleReview,
  ReviewResult,
  ReviewDispatcherOptions,
  UniRegistryEntry,
  UniRegistry,
  // Agency-agents bridge types
  AgencyAgentFile,
  AgencyAgentFrontmatter,
  ImportOptions,
  ImportResult,
  AgencyCategory,
  AgencyCategoryInfo,
  AgencyStatus,
  AgencyUpdateResult,
  // @agents-uni/rel types
  MultiDimRelationship,
  Dimension,
  DimensionSeed,
  RelationshipSeed,
  RelationshipTemplate,
  EvolutionRule,
  RelEvent,
  Pattern,
  RelationshipContext,
  InfluenceScore,
  StructuralAnalysis,
  EmergenceResult,
  ConsolidationResult,
  RelEngineBundle,
} from './bridge/index.js';

// Dashboard
export {
  startDashboard,
  createDashboardRoutes,
} from './dashboard/index.js';
export type {
  DashboardConfig,
  DashboardExtension,
  PanelDefinition,
} from './dashboard/index.js';

// Schema
export { validateUniverseSpec } from './schema/index.js';
