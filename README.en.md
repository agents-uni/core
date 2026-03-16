[![CI](https://github.com/agents-uni/core/actions/workflows/ci.yml/badge.svg)](https://github.com/agents-uni/core/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@agents-uni/core.svg)](https://www.npmjs.com/package/@agents-uni/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <h1 align="center">agents-uni-core</h1>
  <p align="center">
    <strong>Universal protocol layer for agent organizations</strong>
  </p>
  <p align="center">
    Define how agents organize, collaborate, compete, and evolve — not just what they do.
  </p>
</p>

<p align="center">
  <a href="./README.md">中文</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#core-concepts">Core Concepts</a> &bull;
  <a href="#templates">Templates</a> &bull;
  <a href="#cli">CLI</a> &bull;
  <a href="#openclaw-bridge">OpenClaw Bridge</a> &bull;
  <a href="#dashboard">Dashboard</a> &bull;
  <a href="#multi-uni-management">Multi-Uni</a> &bull;
  <a href="#agency-agents-bridge">Agency-Agents</a> &bull;
  <a href="./DESIGN.md">Design Doc</a>
</p>

---

## Why?

Current multi-agent frameworks solve **productivity** — how to make agents complete tasks. They ignore **production relationships** — how agents should organize, govern, and evolve together.

Human societies spent millennia developing organizational forms: bureaucracies, corporations, militaries, cooperatives. These weren't random — they evolved as optimal structures under specific constraints.

**agents-uni-core** brings this thinking to AI agents:

> While improving productivity, what we truly need is better production relationships.

### The User Is the Center

In the OpenClaw ecosystem, **the user is at the center of every relationship network**. Agents don't exist in isolation — they form social structures around the user, building relationships that help the user accomplish tasks and fulfill emotional needs. agents-uni-core provides not just a cold task-execution pipeline, but a warm, user-centric social framework for AI agents.

Each agent's SOUL.md defines not only its personality and capabilities, but its **relationship with the user** — what unique value it provides, how it understands the user's needs, and how its personality makes the user feel genuinely accompanied and helped.

## Quick Start

### Scaffold a new project

```bash
npx create-uni my-universe
# or with a specific template
npx create-uni my-universe --template competitive
```

### Install the CLI globally

```bash
npm install -g @agents-uni/core

# Then use the `uni` command directly
uni validate universe.yaml
uni dashboard
```

### Use as a library

```bash
npm install @agents-uni/core
```

```typescript
import { compileUniverse, parseSpecFile } from '@agents-uni/core';

// Load and compile a universe spec
const config = parseSpecFile('universe.yaml');
const universe = await compileUniverse(config, { autoInit: true });

// Access the organizational infrastructure
const agents = universe.agents.getAll();
const leaderboard = universe.resources.getLeaderboard('rating');
```

### Write a Universe Spec

```yaml
name: my-team
type: corporation
description: A small agile development team

agents:
  - id: tech-lead
    name: Tech Lead
    role:
      title: Technical Lead
      duties: [architecture, code-review, mentoring]
    rank: 80

  - id: dev-alpha
    name: Developer Alpha
    role:
      title: Software Engineer
      duties: [implementation, testing, documentation]
    rank: 50
    traits: { creativity: 0.8, speed: 0.7 }

relationships:
  - { from: tech-lead, to: dev-alpha, type: supervises }

governance:
  decisionModel: autocratic
  permissionMatrix:
    - { role: Technical Lead, action: execute, target: "*" }
  reviewPolicy:
    mandatory: true
    reviewers: [tech-lead]

resources:
  - name: compute
    type: renewable
    total: 1000
    distribution: merit

evolution:
  performanceWindow: 20
  promotionThreshold: 80
  demotionThreshold: 30
  memoryRetention: 500
```

## Core Concepts

### Universe

A self-contained agent society with its own rules, roles, relationships, and evolution logic. Think of it as a "world" where agents live and operate.

### Agent & Role

```
Agent = a concrete actor ("Alice")
Role  = an abstract position ("Lead Engineer")
```

Agents occupy Roles. Roles define permissions and duties. The same Role can have multiple Agents; the same Agent can migrate between Roles through promotion/demotion.

### Relationship Graph

Relationships are a **weighted directed graph**, not just org-chart lines:

| Type | Description |
|------|-------------|
| `supervises` | Management relationship |
| `collaborates` | Peer cooperation |
| `competes` | Competitive relationship |
| `advises` | Advisory role |
| `audits` | Oversight / supervision |

Each edge has a `weight` (0-1) that evolves with interaction history, making trust a quantifiable, evolvable organizational property.

### Permission Matrix

A three-dimensional access control system: **Who** (agentId / roleId) x **Action** (execute / review / delegate / veto / allocate) x **Target** (agentId / \*).

### State Machine (Protocol Engine)

Workflows are defined as finite state machines with role-gated transitions and guard expressions:

```yaml
protocols:
  - name: code-review
    states:
      - id: submitted
        type: initial
      - id: reviewing
        transitions:
          - to: approved
            requiredRole: senior-dev
          - to: rejected
            guard: "score < 0.6"
      - id: approved
        type: terminal
```

### Resource Pool

Resources shape incentive structures:

| Distribution | Best For |
|-------------|----------|
| `equal` | Collaborative teams |
| `hierarchy` | Bureaucratic orgs |
| `merit` | Performance-driven orgs |
| `competitive` | Market-like arenas |

Resources can have `decayRate` — unused power fades, forcing agents to stay active.

### Evolution Engine

Four built-in modules enable organizational self-optimization:

| Module | Purpose |
|--------|---------|
| **PerformanceTracker** | Multi-dimensional performance recording |
| **PromotionEngine** | Threshold-based promote / demote / suspend |
| **RelationshipEvolver** | Auto-adjusts relationship weights from events |
| **MemoryConsolidator** | Extracts organizational lessons, forms collective memory |

```
Performance Data  -->  Tracking  -->  Promotion Decision  -->  Role Change
       ^                                                          |
       +-----  Relationship Evolution  <--  Events  <--  Memory --+
```

## Templates

Five ready-to-use organizational templates:

| Template | Model | Governance | Use Case |
|----------|-------|-----------|----------|
| `competitive` | Arena with judge + contestants | Meritocratic | Model comparison, creative contests |
| `government` | Multi-department hierarchy | Checks & balances | Approval workflows, policy making |
| `corporation` | Manager + engineers | Autocratic | Sprint-based development |
| `flat` | Peer team | Democratic | Open-source collaboration |
| `military` | Commander + executors | Single chain of command | Mission-critical execution |

```bash
npx create-uni my-project --template competitive
```

## CLI

After global install, use the `uni` command directly, or call via `npx @agents-uni/core`:

```bash
# Validate a universe spec
uni validate universe.yaml

# ASCII visualization of the organization
uni visualize universe.yaml

# Detailed inspection (or specific agent)
uni inspect universe.yaml
uni inspect universe.yaml --agent dev-alpha

# Deploy to OpenClaw workspaces
uni deploy universe.yaml --dir ./workspaces --lang zh

# Interactive project initialization
uni init

# Start the Dashboard web UI
uni dashboard [--port 8089]

# List all registered universes
uni list

# Overview of deployed unis and agents
uni status

# Remove a universe and all its files
uni cleanup <id>

# Reset runtime data, keep configuration
uni reset <id>

# 🆕 Agency-agents bridge
uni agency init                           # Download agency-agents repo
uni agency list                           # List available categories
uni agency update                         # Pull latest updates
uni agency import engineering design      # Import by category
uni agency import all --name full-team    # Import all agents

# Import from raw directory paths (advanced)
uni import ./path/to/agents/ --name my-team
```

| Command | Description |
|---------|-------------|
| `uni validate` | Validate a universe spec |
| `uni visualize` | ASCII visualization of the organization |
| `uni inspect` | Detailed agent inspection |
| `uni deploy` | Deploy to OpenClaw workspaces |
| `uni init` | Interactive project initialization |
| `uni dashboard` | Start Dashboard web UI |
| `uni list` | List all registered universes |
| `uni status` | Overview of deployed unis and agents |
| `uni cleanup <id>` | Remove a universe and all its files |
| `uni reset <id>` | Reset runtime data, keep SOUL.md config |
| `uni agency init` | Download agency-agents repo locally |
| `uni agency list` | List available categories and agent counts |
| `uni agency update` | Pull latest agency-agents updates |
| `uni agency import` | Import agents by category name to universe.yaml |
| `uni import` | Import from raw directory paths (advanced) |

## OpenClaw Bridge

agents-uni-core integrates with [OpenClaw](https://github.com/anthropics/openclaw) via a **file-based protocol**. Three core capabilities:

**1. SOUL.md Deployment** — generate agent persona files from universe specs and create agent runtime directories (`agents/{id}/agent/` + `agents/{id}/sessions/`)

**2. One-Click Registration** — auto-register agents in `openclaw.json` (with both `workspace` and `agentDir` fields) during deployment

**3. Task Dispatch** — communicate with agents via `TASK.md` / `SUBMISSION.md` file protocol

**4. Workspace Management** — check and sync OpenClaw workspace state

```
Universe Spec (YAML)
       | uni deploy
SOUL.md × N → OpenClaw workspaces
       |
  TaskDispatcher.run()
       |
       ├─ Write TASK.md to each agent's workspace
       ├─ Agent reads → executes → writes SUBMISSION.md
       ├─ Poll & collect SUBMISSION.md
       └─ Return all submissions
```

```typescript
import {
  deployToOpenClaw,
  TaskDispatcher,
  FileWorkspaceIO,
} from '@agents-uni/core';

// 1. Deploy SOUL.md + agent runtime dirs to OpenClaw + auto-register in openclaw.json
const result = deployToOpenClaw(config, { openclawDir: '~/.openclaw' });
// result.registered → newly registered agent IDs in openclaw.json
// result.agentDirs  → created agent runtime directories (~/.openclaw/agents/{id}/agent/)
//
// Directory structure after deploy:
// ~/.openclaw/
// ├── openclaw.json          ← agent registry (workspace + agentDir)
// ├── agents/
// │   └── {id}/
// │       ├── agent/         ← runtime config (auth-profiles.json etc.)
// │       └── sessions/      ← session history
// └── workspace-{id}/
//     └── SOUL.md            ← agent persona

// Or register standalone (without deploying SOUL.md)
import { registerAgentsInOpenClaw } from '@agents-uni/core';
registerAgentsInOpenClaw(config, '~/.openclaw');
// Writes both workspace and agentDir to openclaw.json

// 2. Dispatch task and collect submissions
const dispatcher = new TaskDispatcher(new FileWorkspaceIO());
const result = await dispatcher.run({
  id: 'task-001',
  title: 'Strategy Essay',
  description: 'Write a 500-word essay',
  criteria: [{ name: 'quality', weight: 1, description: 'Content depth' }],
  timeoutMs: 60000,
  participants: ['agent-a', 'agent-b'],
});
// result.submissions → collected agent outputs
// result.timedOut    → agents that missed the deadline
```

## Dashboard

agents-uni-core includes a built-in Hono-based web Dashboard for browsing and managing all deployed universes.

### Start

```bash
# Default port 8089
uni dashboard

# Custom port
uni dashboard --port 8080
```

### Pages

| Page | Path | Description |
|------|------|-------------|
| Home | `/` | Project intro + all registered universes overview + architecture |
| User Guide | `/guide` | Complete usage guide: concepts, workflow, CLI reference, file protocol, multi-uni management |
| Uni Detail | `/uni/:id` | Agent list, relationship graph, resource status |
| Agent Detail | `/uni/:id/agent/:agentId` | Rank, ELO, session history, SOUL.md content |
| Manage | `/manage` | Batch reset / cleanup / update operations |

### API Endpoints

```
GET  /api/unis                         # List all registered universes
GET  /api/unis/:id                     # Get universe details
GET  /api/unis/:id/agents/:agentId     # Get agent details
GET  /api/unis/:id/relationships       # Get relationship graph
POST /api/unis/:id/reset               # Reset universe runtime data
POST /api/unis/:id/cleanup             # Remove universe and all files
GET  /api/health                       # Health check
```

### Extension System

The Dashboard provides a `DashboardExtension` interface, allowing specific unis (e.g., zhenhuan-uni) to inject custom API routes and homepage panels:

```typescript
import { Hono } from 'hono';
import { startDashboard } from '@agents-uni/core';
import type { DashboardExtension, PanelDefinition } from '@agents-uni/core';

// 1. Create extension routes (Hono instance)
const extRoutes = new Hono();
extRoutes.get('/leaderboard', (c) => c.json(getLeaderboard()));
extRoutes.get('/factions', (c) => c.json(getFactions()));

// 2. Define homepage panels
const panels: PanelDefinition[] = [
  {
    title: 'ELO Leaderboard',
    renderHtml: () => '<table>...</table>',  // Return HTML fragment
  },
];

// 3. Assemble extension
const extension: DashboardExtension = {
  uniId: 'zhenhuan-palace',   // Uni this extension belongs to
  routes: extRoutes,           // Mounted at /ext/zhenhuan-palace/
  panels,                      // Displayed on homepage
};

// 4. Start Dashboard
await startDashboard({ port: 8089, extensions: [extension] });
// Extension API: GET /ext/zhenhuan-palace/leaderboard
```

The UI uses server-side rendered HTML with Tailwind CDN, dark theme, no frontend build required.

## Multi-Uni Management

When multiple universes are deployed on the same machine, a registry tracks them all.

### Uni Registry

Registry data is stored at `~/.openclaw/uni-registry.json`. Each universe is auto-registered during `deployToOpenClaw()` when the `specPath` option is provided.

```
~/.openclaw/
├── openclaw.json          ← agent config
├── uni-registry.json      ← 🆕 multi-uni registry
├── agents/{id}/agent/     ← agent runtime
├── agents/{id}/sessions/  ← session history
└── workspace-{id}/SOUL.md ← agent persona
```

### Registry API

```typescript
import {
  registerUni,     // Register a universe
  listUnis,        // List all registered universes
  getUni,          // Get a single universe's info
  unregisterUni,   // Remove from registry
  cleanupUni,      // Delete workspace dirs + agent dirs + openclaw.json entries + registry
  resetUni,        // Clear sessions, TASK.md, SUBMISSION.md; keep SOUL.md
  updateUni,       // Re-deploy SOUL.md, handle added/removed agents
} from '@agents-uni/core';
```

### Lifecycle Management

| Operation | CLI | Description |
|-----------|-----|-------------|
| Register | `uni deploy` (auto) | Auto-registered on deploy via specPath |
| List | `uni list` | List all registered universes |
| Status | `uni status` | View agent counts, deploy times, etc. |
| Reset | `uni reset <id>` | Clear sessions & TASK.md/SUBMISSION.md, keep SOUL.md |
| Update | `updateUni()` | Re-deploy SOUL.md, handle added/removed agents |
| Cleanup | `uni cleanup <id>` | Delete workspace + agent dirs + remove from openclaw.json + registry |

## Agency-Agents Bridge

agents-uni-core has built-in bridge support for [agency-agents](https://github.com/msitarzewski/agency-agents), a high-quality agent persona library with 140+ agents covering 14 domains (engineering, design, marketing, sales, product, testing, etc.).

With the bridge, you can **import these agents into agents-uni with one command**, auto-convert them to `universe.yaml`, and deploy to OpenClaw.

### Initialize

```bash
# Download agency-agents to ~/.agents-uni/agency-agents/ (one-time)
uni agency init

# List available categories
uni agency list

# Pull latest updates
uni agency update
```

### Import by Category

```bash
# Import the engineering team (23 agents)
uni agency import engineering

# Import multiple categories
uni agency import engineering design marketing

# Import all 140+ agents
uni agency import all --name full-team --type hybrid

# Import and deploy SOUL.md to OpenClaw
uni agency import engineering --name my-eng --deploy --deploy-dir ~/.openclaw
```

### Programmatic Usage

```typescript
import {
  agencyInit,
  agencyUpdate,
  agencyListCategories,
  resolveAgencyCategories,
  importAgencyAgents,
  toSoulMd,
} from '@agents-uni/core';

// 1. Initialize (first time only)
agencyInit();

// 2. List categories
const categories = agencyListCategories();
// [{ name: 'engineering', agentCount: 23, path: '...' }, ...]

// 3. Import by category
const dirs = resolveAgencyCategories(['engineering', 'design']);
const result = importAgencyAgents(dirs, {
  name: 'my-team',
  type: 'competitive',
  relationships: 'peer',
});

// result.config → UniverseConfig (ready to deploy)
// result.agents → parsed agent data (with original personality)
console.log(`Imported ${result.agents.length} agents`);

// 4. Generate SOUL.md preserving original personality
for (const agent of result.agents) {
  const soul = toSoulMd(agent, { universe: result.config, language: 'en' });
  // soul contains agency-agents original personality + agents-uni org context
}

// 5. Periodic updates
const updateResult = agencyUpdate();
if (updateResult.updated) {
  console.log(`Updated: ${updateResult.oldCommit} → ${updateResult.newCommit}`);
}
```

### Data Storage

```
~/.agents-uni/
├── agency-agents/          ← agency-agents repo (git clone)
│   ├── engineering/        ← 23 engineering agents
│   ├── design/             ← 8 design agents
│   ├── marketing/          ← 27 marketing agents
│   └── ...                 ← 14 categories total
└── agency-meta.json        ← install and update metadata
```

### Available Categories

| Category | Agents | Includes |
|----------|--------|----------|
| engineering | 23 | Backend Architect, Frontend Developer, DevOps, SRE, Security Engineer... |
| marketing | 27 | SEO Specialist, TikTok/Douyin Strategist, Growth Hacker, Content Creator... |
| specialized | 27 | Blockchain Auditor, Compliance Auditor, MCP Builder, Salesforce Architect... |
| design | 8 | UI Designer, UX Architect, Brand Guardian, Visual Storyteller... |
| sales | 8 | Deal Strategist, Outbound Strategist, Pipeline Analyst, Sales Coach... |
| testing | 8 | API Tester, Performance Benchmarker, Accessibility Auditor... |
| paid-media | 7 | PPC Strategist, Paid Social, Programmatic Buyer, Ad Creative... |
| support | 6 | Analytics Reporter, Finance Tracker, Legal Compliance... |
| spatial-computing | 6 | visionOS Engineer, XR Developer, Terminal Integration... |
| project-management | 6 | Jira Steward, Project Shepherd, Studio Producer... |
| academic | 5 | Anthropologist, Historian, Psychologist, Narratologist... |
| product | 5 | Product Manager, Sprint Prioritizer, Feedback Synthesizer... |
| game-development | 5 | Game Designer, Level Designer, Narrative Designer, Audio Engineer... |

## Architecture

```
+-----------------------------------------------------+
|                    Universe (Container)               |
|                                                       |
|  +----------+  +--------------+  +----------------+  |
|  |  Agent   |  | Relationship |  |   Permission   |  |
|  | Registry |<>|    Graph     |<>|    Matrix      |  |
|  +----+-----+  +------+-------+  +-------+--------+  |
|       |               |                  |            |
|  +----+-----+  +------+-------+  +-------+--------+  |
|  |  State   |  |   Resource   |  |    Event       |  |
|  | Machine  |  |     Pool     |  |     Bus        |  |
|  +----------+  +--------------+  +----------------+  |
|                                                       |
|  +-------------- Evolution Engine ----------------+   |
|  | Performance -> Promotion -> Memory -> Relations |  |
|  +------------------------------------------------+   |
+--------------------------+----------------------------+
                           |
                 +---------+---------+
                 |                   |
           +-----+-----+      +-----+-----+
           | Spec YAML  |      | OpenClaw  |
           | -> Universe |      |  Bridge   |
           +------------+      +-----------+
```

## API Reference

### Core

```typescript
import {
  Universe,           // The container for everything
  AgentRegistry,      // Agent lifecycle management
  RelationshipGraph,  // Weighted directed relationship graph
  StateMachine,       // Workflow orchestration
  PermissionMatrix,   // Access control
  ResourcePool,       // Resource allocation & decay
  EventBus,           // Pub/sub event system
} from '@agents-uni/core';
```

### Evolution

```typescript
import {
  PerformanceTracker,   // Record & analyze agent performance
  PromotionEngine,      // Auto promote/demote/suspend
  MemoryConsolidator,   // Organizational learning
  RelationshipEvolver,  // Dynamic relationship adjustment
} from '@agents-uni/core';
```

### Spec Processing

```typescript
import {
  parseSpecFile,     // YAML file -> UniverseConfig
  parseSpecString,   // YAML string -> UniverseConfig
  validateSpec,      // Two-level validation
  compileUniverse,   // UniverseConfig -> live Universe
} from '@agents-uni/core';
```

### Bridge

```typescript
import {
  // SOUL.md generation & deployment
  generateSoul,        // Generate SOUL.md for one agent
  generateAllSouls,    // Generate SOUL.md for all agents
  deployToOpenClaw,         // Deploy to OpenClaw workspaces + create agent runtime dirs + auto-register
  registerAgentsInOpenClaw, // Register agents in openclaw.json (with workspace + agentDir)
  checkWorkspaces,          // Check existing workspace status

  // 🆕 Multi-Uni Registry
  registerUni,         // Register universe in uni-registry.json
  listUnis,            // List all registered universes
  getUni,              // Get a single universe's info
  unregisterUni,       // Remove from registry
  cleanupUni,          // Delete workspace + agent dirs + registry entry
  resetUni,            // Clear runtime data, keep SOUL.md
  updateUni,           // Re-deploy, handle added/removed agents

  // Task dispatch (file protocol)
  TaskDispatcher,      // Dispatch TASK.md → collect SUBMISSION.md
  FileWorkspaceIO,     // File-system I/O backend
  MemoryWorkspaceIO,   // In-memory I/O backend (for testing)

  // 🆕 Agency-agents bridge
  agencyInit,              // Download agency-agents repo
  agencyUpdate,            // Pull latest updates
  agencyListCategories,    // List available categories
  resolveAgencyCategories, // Category names → directory paths
  importAgencyAgents,      // Batch import and generate UniverseConfig
  toSoulMd,                // Generate SOUL.md preserving original personality
} from '@agents-uni/core';
```

### Dashboard

```typescript
import {
  createDashboardServer,  // Create Dashboard Hono server
} from '@agents-uni/core';

import type {
  DashboardExtension,     // Dashboard extension interface
} from '@agents-uni/core';
```

## Project Structure

```
agents-uni-core/
  src/
    types/          # Complete type system (Agent, Relationship, Governance, ...)
    core/           # Runtime engine (Universe, Registry, Graph, StateMachine, ...)
    evolution/      # Self-optimization (Performance, Promotion, Memory, ...)
    spec/           # YAML parsing, validation, compilation
    bridge/         # OpenClaw bridge (SOUL.md, task dispatch, workspace I/O, uni registry, agency-agents bridge)
    dashboard/      # 🆕 Dashboard (Hono server, HTML templates, API routes, extension system)
    schema/         # JSON Schema for spec validation
    templates/      # 5 built-in organizational templates
    cli/            # Command-line interface (15 commands)
  create-uni/       # npx create-uni scaffolding tool
  tests/            # Unit tests (41 tests, 7 suites)
```

## Development

```bash
# Install dependencies
npm install

# Run tests (41 tests)
npm test

# Type check
npm run lint

# Build
npm run build

# Watch mode
npm run dev
```

## Related Projects

- [**@agents-uni/zhenhuan**](https://github.com/agents-uni/zhenhuan) — Palace drama themed agent competition system built on agents-uni-core ([npm](https://www.npmjs.com/package/@agents-uni/zhenhuan))

## License

MIT
