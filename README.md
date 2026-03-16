[![CI](https://github.com/agents-uni/core/actions/workflows/ci.yml/badge.svg)](https://github.com/agents-uni/core/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@agents-uni/core.svg)](https://www.npmjs.com/package/@agents-uni/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <h1 align="center">agents-uni-core</h1>
  <p align="center">
    <strong>Agent 组织与社会关系的通用协议层</strong>
  </p>
  <p align="center">
    定义 Agent 如何组织、协作、竞争与进化 —— 而不仅仅是它们做什么。
  </p>
</p>

<p align="center">
  <a href="./README.en.md">English</a> &bull;
  <a href="#快速开始">快速开始</a> &bull;
  <a href="#核心概念">核心概念</a> &bull;
  <a href="#组织模板">组织模板</a> &bull;
  <a href="#命令行工具">CLI</a> &bull;
  <a href="#openclaw-桥接">OpenClaw</a> &bull;
  <a href="#dashboard-仪表盘">Dashboard</a> &bull;
  <a href="#多-uni-管理">多 Uni 管理</a> &bull;
  <a href="#agency-agents-桥接">Agency-Agents</a> &bull;
  <a href="./DESIGN.md">设计文档</a>
</p>

---

## 为什么需要这个项目？

当前的多 Agent 框架解决的是**生产力**问题 —— 如何让 Agent 完成任务。它们忽略了**生产关系** —— Agent 之间如何组织、治理和进化。

人类社会用了数千年才发展出官僚制、公司制、军队、合伙制。这些不是随意发明的，而是在特定约束下演化出的最优组织形态。

**agents-uni-core** 把这种思维引入 AI Agent 世界：

> 提升生产力的同时，我们需要的是更优秀的生产关系。

### 用户是中心

在 OpenClaw 生态中，**用户是一切关系网络的核心**。Agent 不是孤立存在的——它们围绕用户形成社会结构，通过关系的构建帮助用户更好地完成任务、满足情感需求。agents-uni-core 提供的不是冷冰冰的任务执行管道，而是一个有温度的、以用户为中心的 Agent 社会框架。

每个 Agent 的 SOUL.md 不仅定义它自己的性格和能力，更定义它**与用户的关系**——它为用户提供什么独特价值、它如何理解用户的需求、它怎样通过自己的个性让用户感受到真正的陪伴和帮助。

## 快速开始

### 全局安装 CLI

```bash
npm install -g @agents-uni/core

# 之后可以直接使用 uni 命令
uni validate universe.yaml
uni dashboard
```

### 作为库使用

```bash
npm install @agents-uni/core
```

```typescript
import { compileUniverse, parseSpecFile } from '@agents-uni/core';

// 加载并编译组织规范
const config = parseSpecFile('universe.yaml');
const universe = await compileUniverse(config, { autoInit: true });

// 访问组织基础设施
const agents = universe.agents.getAll();
const leaderboard = universe.resources.getLeaderboard('rating');
```

### 编写 Universe 规范

```yaml
name: my-team
type: corporation
description: 一个小型敏捷开发团队

agents:
  - id: tech-lead
    name: 技术负责人
    role:
      title: Technical Lead
      duties: [架构设计, 代码审查, 技术指导]
    rank: 80

  - id: dev-alpha
    name: 开发者 Alpha
    role:
      title: Software Engineer
      duties: [功能开发, 测试, 文档]
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

## 核心概念

### Universe（宇宙）

一个自洽的 Agent 社会，拥有自己的规则、角色、关系和演化逻辑。可以把它理解为 Agent 生存和运作的"世界"。

### Agent 与 Role

```
Agent = 具体的行动者（"张三"）
Role  = 抽象的位置（"技术负责人"）
```

Agent 占据 Role，Role 定义权限和职责。同一个 Role 可以有多个 Agent；同一个 Agent 可以通过晋升/降级迁移到不同 Role。

### 关系图谱（Relationship Graph）

关系不是简单的组织架构线，而是**加权有向图**：

| 类型 | 说明 |
|------|------|
| `supervises` | 管理关系 |
| `collaborates` | 平级协作 |
| `competes` | 竞争关系 |
| `advises` | 顾问关系 |
| `audits` | 审计/监督 |

每条边有 `weight`（0-1），随交互历史动态变化 —— 让信任成为可量化、可演化的组织属性。

### 权限矩阵（Permission Matrix）

三维访问控制系统：**谁**（agentId / roleId）x **动作**（execute / review / delegate / veto / allocate）x **目标**（agentId / \*）。

### 状态机（Protocol Engine）

工作流通过有限状态机定义，支持角色门控和守卫表达式：

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

### 资源池（Resource Pool）

资源塑造激励结构：

| 分配策略 | 适用场景 |
|----------|----------|
| `equal` | 协作型团队 |
| `hierarchy` | 官僚型组织 |
| `merit` | 绩效驱动型组织 |
| `competitive` | 市场型竞技场 |

资源可以设置 `decayRate`（衰减率）—— 不使用的权力会逐渐减弱，迫使 Agent 持续活跃。

### 演化引擎（Evolution Engine）

四个内置模块实现组织自我优化：

| 模块 | 功能 |
|------|------|
| **PerformanceTracker** | 多维度绩效记录与分析 |
| **PromotionEngine** | 基于阈值的晋升/降级/停职决策 |
| **RelationshipEvolver** | 根据事件自动调整关系权重 |
| **MemoryConsolidator** | 提取组织级经验教训，形成集体记忆 |

```
绩效数据 --> 追踪 --> 晋升决策 --> 角色变更
   ^                                   |
   +-- 关系演化 <-- 事件流 <-- 组织记忆 -+
```

## 组织模板

五种开箱即用的组织模板：

| 模板 | 组织模型 | 治理方式 | 适用场景 |
|------|----------|----------|----------|
| `competitive` | 裁判 + 选手竞技场 | 绩效导向 | 模型比较、创意竞赛 |
| `government` | 多部门等级制 | 权力制衡 | 审批流程、政策制定 |
| `corporation` | 经理 + 工程师 | 一人决策 | Sprint 开发 |
| `flat` | 平等团队 | 民主投票 | 开源协作 |
| `military` | 指挥官 + 执行者 | 单一指挥链 | 关键任务执行 |

```bash
uni init my-project --template competitive
```

## 命令行工具

全局安装后可直接使用 `uni` 命令，也可通过 `npx @agents-uni/core` 调用：

```bash
# 验证组织规范
uni validate universe.yaml

# ASCII 可视化组织结构
uni visualize universe.yaml

# 详细检视（或查看特定 Agent）
uni inspect universe.yaml
uni inspect universe.yaml --agent dev-alpha

# 部署到 OpenClaw 工作区
uni deploy universe.yaml --dir ./workspaces --lang zh

# 交互式初始化项目
uni init

# 启动 Dashboard 仪表盘
uni dashboard [--port 8089]

# 列出所有已注册的 Universe
uni list

# 查看已部署的 Uni / Agent 概览
uni status

# 清理一个 Universe（删除所有相关文件 + 注册信息）
uni cleanup <id>

# 重置一个 Universe（清除运行时数据，保留配置）
uni reset <id>

# 🆕 agency-agents 桥接
uni agency init                           # 下载 agency-agents 仓库
uni agency list                           # 查看可用分类
uni agency update                         # 拉取最新
uni agency import engineering design      # 按分类导入
uni agency import all --name full-team    # 导入全部

# 从原始目录导入（高级用法）
uni import ./path/to/agents/ --name my-team
```

| 命令 | 说明 |
|------|------|
| `uni validate` | 验证组织规范 |
| `uni visualize` | ASCII 可视化组织结构 |
| `uni inspect` | 详细检视 Agent |
| `uni deploy` | 部署到 OpenClaw 工作区 |
| `uni init` | 交互式初始化项目 |
| `uni dashboard` | 启动 Dashboard Web UI |
| `uni list` | 列出所有已注册的 Universe |
| `uni status` | 查看已部署的 Uni / Agent 概览 |
| `uni cleanup <id>` | 清理一个 Universe 及其所有文件 |
| `uni reset <id>` | 重置运行时数据，保留 SOUL.md 等配置 |
| `uni agency init` | 下载 agency-agents 仓库到本地 |
| `uni agency list` | 查看可用分类和 Agent 数量 |
| `uni agency update` | 拉取 agency-agents 最新更新 |
| `uni agency import` | 按分类名导入 Agent 到 universe.yaml |
| `uni import` | 从原始目录路径导入 Agent（高级用法） |

## OpenClaw 桥接

agents-uni-core 通过**文件协议**与 [OpenClaw](https://github.com/anthropics/openclaw) 无缝集成。包含三个核心能力：

**1. SOUL.md 部署** — 从组织规范生成 Agent 人格文件并部署到 OpenClaw 工作区，同时创建 Agent 运行时目录（`agents/{id}/agent/` + `agents/{id}/sessions/`）

**2. 一键注册** — 部署时自动将 Agent 注册到 `openclaw.json`（含 `workspace` 和 `agentDir` 字段），无需手动配置

**3. 任务调度** — 通过 `TASK.md` / `SUBMISSION.md` 文件协议与 Agent 交互

**4. 工作区管理** — 检查和同步 OpenClaw 工作区状态

```
Universe Spec (YAML)
       | uni deploy
SOUL.md × N → OpenClaw 工作区
       |
  TaskDispatcher.run()
       |
       ├─ 写 TASK.md 到每个 Agent 工作区
       ├─ Agent 读取 → 执行 → 写 SUBMISSION.md
       ├─ 轮询收集 SUBMISSION.md
       └─ 返回所有提交结果
```

```typescript
import {
  deployToOpenClaw,
  TaskDispatcher,
  FileWorkspaceIO,
} from '@agents-uni/core';

// 1. 部署 SOUL.md + Agent 运行时目录到 OpenClaw + 自动注册到 openclaw.json
const result = deployToOpenClaw(config, { openclawDir: '~/.openclaw' });
// result.registered → 新注册到 openclaw.json 的 Agent ID 列表
// result.agentDirs  → 创建的 Agent 运行时目录（~/.openclaw/agents/{id}/agent/）
//
// 部署后目录结构：
// ~/.openclaw/
// ├── openclaw.json          ← Agent 注册（含 workspace + agentDir）
// ├── agents/
// │   └── {id}/
// │       ├── agent/         ← 运行时配置（auth-profiles.json 等）
// │       └── sessions/      ← 会话历史
// └── workspace-{id}/
//     └── SOUL.md            ← Agent 人格定义

// 也可以单独注册（不部署 SOUL.md）
import { registerAgentsInOpenClaw } from '@agents-uni/core';
registerAgentsInOpenClaw(config, '~/.openclaw');
// 注册时同时写入 workspace 和 agentDir 到 openclaw.json

// 2. 下发任务并收集提交
const dispatcher = new TaskDispatcher(new FileWorkspaceIO());
const result = await dispatcher.run({
  id: 'task-001',
  title: '策论',
  description: '撰写500字策论',
  criteria: [{ name: '质量', weight: 1, description: '内容深度' }],
  timeoutMs: 60000,
  participants: ['agent-a', 'agent-b'],
});
// result.submissions → 收集到的 Agent 提交
// result.timedOut    → 超时未提交的 Agent
```

## Dashboard 仪表盘

agents-uni-core 内置了一个基于 Hono 的 Web Dashboard，用于浏览和管理所有已部署的 Universe。

### 启动

```bash
# 默认端口 8089
uni dashboard

# 指定端口
uni dashboard --port 8080
```

### 页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `/` | 项目介绍 + 所有已注册 Universe 概览 + 架构图 |
| 用户手册 | `/guide` | 完整使用指南：概念、工作流、CLI 参考、文件协议、多 Uni 管理 |
| Uni 详情 | `/uni/:id` | 单个 Universe 的 Agent 列表、关系图谱、资源状态 |
| Agent 详情 | `/uni/:id/agent/:agentId` | Agent 的品级、ELO、会话历史、SOUL.md 内容 |
| 管理 | `/manage` | 批量 reset / cleanup / update 操作 |

### API 端点

```
GET  /api/unis                         # 列出所有已注册的 Universe
GET  /api/unis/:id                     # 获取单个 Universe 详情
GET  /api/unis/:id/agents/:agentId     # 获取 Agent 详情
GET  /api/unis/:id/relationships       # 获取关系图谱
POST /api/unis/:id/reset               # 重置 Universe 运行时数据
POST /api/unis/:id/cleanup             # 清理 Universe 及所有文件
GET  /api/health                       # 健康检查
```

### 扩展机制

Dashboard 提供 `DashboardExtension` 接口，允许特定 Uni（如 zhenhuan-uni）注入自定义 API 路由和首页面板：

```typescript
import { Hono } from 'hono';
import { startDashboard } from '@agents-uni/core';
import type { DashboardExtension, PanelDefinition } from '@agents-uni/core';

// 1. 创建扩展路由（Hono 实例）
const extRoutes = new Hono();
extRoutes.get('/leaderboard', (c) => c.json(getLeaderboard()));
extRoutes.get('/factions', (c) => c.json(getFactions()));

// 2. 定义首页面板
const panels: PanelDefinition[] = [
  {
    title: 'ELO 排行榜',
    renderHtml: () => '<table>...</table>',  // 返回 HTML 片段
  },
];

// 3. 组装扩展
const extension: DashboardExtension = {
  uniId: 'zhenhuan-palace',   // 扩展所属的 Uni ID
  routes: extRoutes,           // 挂载到 /ext/zhenhuan-palace/
  panels,                      // 显示在首页
};

// 4. 启动 Dashboard
await startDashboard({ port: 8089, extensions: [extension] });
// 扩展 API：GET /ext/zhenhuan-palace/leaderboard
```

UI 采用服务端渲染 HTML + Tailwind CDN，暗色主题，无需前端构建。

## 多 Uni 管理

当你有多个 Universe 部署在同一台机器上时，需要一个注册中心来跟踪它们。

### Uni Registry（注册中心）

注册信息存储在 `~/.openclaw/uni-registry.json`，每个 Universe 在 `deployToOpenClaw()` 时自动注册（需传入 `specPath` 选项）。

```
~/.openclaw/
├── openclaw.json          ← Agent 配置
├── uni-registry.json      ← 🆕 多 Uni 注册中心
├── agents/{id}/agent/     ← Agent 运行时
├── agents/{id}/sessions/  ← 会话历史
└── workspace-{id}/SOUL.md ← Agent 人格
```

### 注册中心 API

```typescript
import {
  registerUni,     // 注册一个 Universe
  listUnis,        // 列出所有已注册 Universe
  getUni,          // 获取单个 Universe 信息
  unregisterUni,   // 从注册中心移除
  cleanupUni,      // 删除工作区 + Agent 目录 + openclaw.json 条目 + 注册信息
  resetUni,        // 清除 sessions、TASK.md、SUBMISSION.md，保留 SOUL.md
  updateUni,       // 重新部署 SOUL.md，处理新增/移除的 Agent
} from '@agents-uni/core';
```

### 生命周期管理

| 操作 | CLI | 说明 |
|------|-----|------|
| 注册 | `uni deploy`（自动） | 部署时自动注册到 uni-registry.json |
| 列表 | `uni list` | 列出所有已注册的 Universe |
| 状态 | `uni status` | 查看各 Uni 的 Agent 数量、部署时间等 |
| 重置 | `uni reset <id>` | 清除 sessions 和 TASK.md / SUBMISSION.md，保留 SOUL.md |
| 更新 | `updateUni()` | 重新部署 SOUL.md，处理新增/移除的 Agent |
| 清理 | `uni cleanup <id>` | 删除工作区目录 + Agent 目录 + 从 openclaw.json 移除 + 从注册中心移除 |

## Agency-Agents 桥接

agents-uni-core 内置了对 [agency-agents](https://github.com/msitarzewski/agency-agents) 项目的桥接支持。agency-agents 是一个高质量的 Agent 人格模板库（140+ 个 Agent），覆盖工程、设计、营销、销售、产品、测试等 14 个领域。

通过桥接，你可以**一键将这些 Agent 导入 agents-uni**，自动转换为 `universe.yaml` 并部署到 OpenClaw。

### 初始化

```bash
# 下载 agency-agents 到 ~/.agents-uni/agency-agents/（仅需一次）
uni agency init

# 查看可用分类
uni agency list

# 拉取最新更新
uni agency update
```

### 按分类导入

```bash
# 导入工程团队（23 个 Agent）
uni agency import engineering

# 同时导入多个分类
uni agency import engineering design marketing

# 导入全部 140+ 个 Agent
uni agency import all --name full-team --type hybrid

# 导入并直接部署 SOUL.md 到 OpenClaw
uni agency import engineering --name my-eng --deploy --deploy-dir ~/.openclaw
```

### 编程式调用

```typescript
import {
  agencyInit,
  agencyUpdate,
  agencyListCategories,
  resolveAgencyCategories,
  importAgencyAgents,
  toSoulMd,
} from '@agents-uni/core';

// 1. 初始化（首次）
agencyInit();

// 2. 列出分类
const categories = agencyListCategories();
// [{ name: 'engineering', agentCount: 23, path: '...' }, ...]

// 3. 按分类导入
const dirs = resolveAgencyCategories(['engineering', 'design']);
const result = importAgencyAgents(dirs, {
  name: 'my-team',
  type: 'competitive',
  relationships: 'peer',
});

// result.config → UniverseConfig (可直接部署)
// result.agents → 解析后的 Agent 数据 (含原始人格)
console.log(`导入了 ${result.agents.length} 个 Agent`);

// 4. 生成保留原始人格的 SOUL.md
for (const agent of result.agents) {
  const soul = toSoulMd(agent, { universe: result.config, language: 'zh' });
  // soul 包含 agency-agents 原始人格 + agents-uni 组织上下文
}

// 5. 定期更新
const updateResult = agencyUpdate();
if (updateResult.updated) {
  console.log(`更新: ${updateResult.oldCommit} → ${updateResult.newCommit}`);
}
```

### 数据存储

```
~/.agents-uni/
├── agency-agents/          ← agency-agents 仓库（git clone）
│   ├── engineering/        ← 23 个工程 Agent
│   ├── design/             ← 8 个设计 Agent
│   ├── marketing/          ← 27 个营销 Agent
│   └── ...                 ← 共 14 个分类
└── agency-meta.json        ← 安装和更新元数据
```

### 可用分类

| 分类 | Agent 数 | 包含 |
|------|---------|------|
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

## 架构

```
+-----------------------------------------------------+
|                    Universe（容器）                    |
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
|  +-------------- 演化引擎 -------------------------+  |
|  | 绩效追踪 -> 晋升决策 -> 组织记忆 -> 关系演化    |  |
|  +------------------------------------------------+  |
+--------------------------+----------------------------+
                           |
                 +---------+---------+
                 |                   |
           +-----+-----+      +-----+-----+
           | Spec YAML  |      | OpenClaw  |
           | -> Universe |      |  Bridge   |
           +------------+      +-----------+
```

## API 参考

### 核心模块

```typescript
import {
  Universe,           // 顶层容器
  AgentRegistry,      // Agent 生命周期管理
  RelationshipGraph,  // 加权有向关系图
  StateMachine,       // 工作流编排
  PermissionMatrix,   // 访问控制
  ResourcePool,       // 资源分配与衰减
  EventBus,           // 发布/订阅事件系统
} from '@agents-uni/core';
```

### 演化模块

```typescript
import {
  PerformanceTracker,   // 绩效记录与分析
  PromotionEngine,      // 自动晋升/降级/停职
  MemoryConsolidator,   // 组织学习
  RelationshipEvolver,  // 动态关系调整
} from '@agents-uni/core';
```

### 规范处理

```typescript
import {
  parseSpecFile,     // YAML 文件 -> UniverseConfig
  parseSpecString,   // YAML 字符串 -> UniverseConfig
  validateSpec,      // 双层验证（Schema + 语义）
  compileUniverse,   // UniverseConfig -> 运行时 Universe
} from '@agents-uni/core';
```

### 桥接模块

```typescript
import {
  // SOUL.md 生成与部署
  generateSoul,        // 为单个 Agent 生成 SOUL.md
  generateAllSouls,    // 为所有 Agent 生成 SOUL.md
  deployToOpenClaw,         // 部署到 OpenClaw 工作区 + 创建 Agent 运行时目录 + 自动注册
  registerAgentsInOpenClaw, // 单独注册 Agent 到 openclaw.json（含 workspace + agentDir）
  checkWorkspaces,          // 检查现有工作区状态

  // 🆕 多 Uni 注册中心
  registerUni,         // 注册 Universe 到 uni-registry.json
  listUnis,            // 列出所有已注册的 Universe
  getUni,              // 获取单个 Universe 信息
  unregisterUni,       // 从注册中心移除
  cleanupUni,          // 删除工作区 + Agent 目录 + 注册信息
  resetUni,            // 清除运行时数据，保留 SOUL.md
  updateUni,           // 重新部署，处理新增/移除的 Agent

  // 任务调度（文件协议）
  TaskDispatcher,      // 下发 TASK.md → 收集 SUBMISSION.md
  FileWorkspaceIO,     // 文件系统 I/O 后端
  MemoryWorkspaceIO,   // 内存 I/O 后端（用于测试）

  // 🆕 Agency-agents 桥接
  agencyInit,              // 下载 agency-agents 仓库
  agencyUpdate,            // 拉取最新更新
  agencyListCategories,    // 列出可用分类
  resolveAgencyCategories, // 分类名 → 目录路径
  importAgencyAgents,      // 批量导入并生成 UniverseConfig
  toSoulMd,                // 生成保留原始人格的 SOUL.md
} from '@agents-uni/core';
```

### Dashboard 模块

```typescript
import {
  createDashboardServer,  // 创建 Dashboard Hono 服务器
} from '@agents-uni/core';

import type {
  DashboardExtension,     // Dashboard 扩展接口
} from '@agents-uni/core';
```

## 项目结构

```
agents-uni-core/
  src/
    types/          # 完整类型体系（Agent, Relationship, Governance, ...）
    core/           # 运行时引擎（Universe, Registry, Graph, StateMachine, ...）
    evolution/      # 自优化（Performance, Promotion, Memory, ...）
    spec/           # YAML 解析、验证、编译
    bridge/         # OpenClaw 桥接（SOUL.md 生成、任务调度、工作区 I/O、Uni 注册中心、agency-agents 桥接）
    dashboard/      # 🆕 Dashboard 仪表盘（Hono 服务器、HTML 模板、API 路由、扩展机制）
    schema/         # JSON Schema 验证
    templates/      # 5 种内置组织模板
    cli/            # 命令行工具（15 个命令）
  tests/            # 单元测试（41 个测试，7 个套件）
```

## 开发

```bash
# 安装依赖
npm install

# 运行测试（41 个测试）
npm test

# 类型检查
npm run lint

# 构建
npm run build

# 监听模式
npm run dev
```

## 相关项目

- [**@agents-uni/zhenhuan**](https://github.com/agents-uni/zhenhuan) — 基于 agents-uni-core 的甄嬛后宫 Agent 竞技系统 ([npm](https://www.npmjs.com/package/@agents-uni/zhenhuan))

## License

MIT
