# agents-uni-core 设计文档

> 核心使命：提升生产力的同时，我们需要的是更优秀的生产关系。

## 一、设计哲学

### 为什么需要 agents-uni-core？

当前的多 Agent 框架（CrewAI、AutoGen、MetaGPT）解决的是**生产力**问题——如何让 Agent 完成任务。但它们忽略了一个关键维度：**生产关系**——Agent 之间如何组织、协作、竞争、进化。

人类社会用了数千年才发展出复杂的组织形态：官僚制、公司制、军队、合伙制。这些不是随意发明的，而是在特定约束条件下演化出的**最优生产关系**。agents-uni-core 的核心洞见是：

> Agent 社会也需要精心设计的生产关系，而不仅仅是把一堆 Agent 扔在一起。

### 三个核心隐喻

1. **Universe（宇宙）**：一个自洽的 Agent 社会，有自己的规则、角色、关系和演化逻辑
2. **Constitution（宪法）**：用 YAML 描述的组织规范，定义了宇宙的"物理定律"
3. **Evolution（演化）**：组织不是静态的，它通过绩效反馈不断调整结构

## 二、架构总览

```
┌─────────────────────────────────────────────────────┐
│                    Universe (容器)                     │
│                                                       │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Agent    │  │ Relationship │  │   Permission   │ │
│  │ Registry  │←→│    Graph     │←→│    Matrix      │ │
│  └────┬─────┘  └──────┬───────┘  └───────┬────────┘ │
│       │               │                   │          │
│  ┌────┴─────┐  ┌──────┴───────┐  ┌───────┴────────┐ │
│  │  State   │  │   Resource   │  │    Event       │ │
│  │ Machine  │  │     Pool     │  │     Bus        │ │
│  └──────────┘  └──────────────┘  └────────────────┘ │
│                                                       │
│  ┌───────────────── Evolution ──────────────────────┐ │
│  │ PerformanceTracker → PromotionEngine            │ │
│  │ MemoryConsolidator → RelationshipEvolver        │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         ↕                    ↕
   ┌───────────┐       ┌───────────┐
   │  Spec     │       │  Bridge   │
   │ (YAML →   │       │ (→ Open   │
   │  Universe)│       │   Claw)   │
   └───────────┘       └───────────┘
```

## 三、核心抽象

### 3.1 Agent 与 Role

```
Agent = 一个具体的行动者（"张三"）
Role  = 一个抽象的位置（"财务总监"）
```

Agent 占据 Role，Role 定义了权限和职责。同一个 Role 可以有多个 Agent（如"工程师"），同一个 Agent 可以迁移到不同 Role（晋升/降级）。

**关键设计**：Agent 有 `traits`（特质），Role 有 `duties`（职责）。二者解耦使得组织重构时不需要重新定义 Agent。

### 3.2 Relationship Graph

关系不是简单的上下级，而是一个**加权有向图**：

- **supervises / reports_to**：管理关系
- **collaborates**：平级协作
- **competes**：竞争关系
- **advises**：顾问关系
- **audits**：审计/监督

每条关系有 `weight`（强度 0-1），weight 会随交互历史动态变化。这使得"信任"成为可量化、可演化的组织属性。

### 3.3 Permission Matrix

权限不是布尔值，而是一个三维矩阵：**谁（agentId/roleId）** × **动作（execute/review/delegate/veto/allocate）** × **目标（agentId/*）**

```yaml
permissions:
  - role: reviewer
    action: veto
    target: "*"          # 可以否决任何人
  - agent: agent-001
    action: delegate
    target: team-alpha   # 只能委派给特定团队
```

### 3.4 State Machine（协议引擎）

组织的工作流程通过有限状态机定义：

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
            requiredRole: senior-dev
            guard: "score < 0.6"
      - id: approved
        type: terminal
```

**关键设计**：转换（transition）可以有 `requiredRole`（角色门控）和 `guard`（条件守卫），使得工作流既有制度约束又有灵活性。

### 3.5 Resource Pool

资源是组织激励的核心工具：

| 类型 | 说明 | 示例 |
|------|------|------|
| finite | 用完即止 | 预算、API 配额 |
| renewable | 定期补充 | 月薪、计算资源 |
| shared | 共享不消耗 | 知识库、文档 |

分配策略决定了组织的激励结构：

- **equal**：平均分配（适合协作型组织）
- **hierarchy**：按等级分配（适合官僚型组织）
- **merit**：按绩效分配（适合竞争型组织）
- **competitive**：竞标/拍卖（适合市场型组织）

### 3.6 Event Bus

所有状态变更都通过事件总线广播：

```
agent.registered → 新成员加入
agent.promoted   → 晋升事件
relationship.formed → 新关系建立
resource.allocated  → 资源分配
protocol.transition → 工作流状态变更
```

事件系统使得演化引擎可以**被动观察**组织行为，而不需要侵入核心逻辑。

## 四、演化引擎

### 设计理念

组织不应该是静态的。agents-uni-core 内置了四个演化模块：

1. **PerformanceTracker**：记录每个 Agent 的多维绩效（质量、速度、协作、创新）
2. **PromotionEngine**：基于绩效阈值自动产生晋升/降级/停职建议
3. **RelationshipEvolver**：根据协作/竞争历史自动调整关系权重
4. **MemoryConsolidator**：提取组织级的经验教训，形成组织记忆

### 演化循环

```
绩效数据 → 绩效追踪 → 晋升决策 → 角色变更
    ↑                                    ↓
    └──── 关系演化 ← 事件流 ← 组织记忆 ←─┘
```

这个循环使得组织可以自我优化：高绩效 Agent 获得更多资源和更高职位，低绩效 Agent 被降级或淘汰，关系网络随时间演化出最优结构。

## 五、规范描述体系（Universe Spec）

### 与 OpenClaw 的对比

| 维度 | OpenClaw SOUL.md | Universe Spec |
|------|------------------|---------------|
| 粒度 | 单个 Agent | 整个组织 |
| 关注点 | Agent 的身份和能力 | Agent 之间的关系和规则 |
| 格式 | Markdown | YAML (可编程) |
| 动态性 | 静态定义 | 可演化 |
| 互操作 | Agent 运行时 | 生成 SOUL.md → OpenClaw |

### Spec 结构

```yaml
universe:
  name: "my-org"
  type: "corporation"       # corporation | government | military | flat | competitive

agents: [...]               # 角色定义
governance: {...}            # 治理规则
protocols: [...]             # 工作流定义
resources: [...]             # 资源定义
evolution: {...}             # 演化配置
```

### 五种内置模板

| 模板 | 适用场景 | 治理模式 |
|------|----------|----------|
| **competitive** | 赛马/竞标 | 裁判制 + ELO 排名 |
| **government** | 审批流/官僚制 | 三权分立 + 封驳 |
| **corporation** | 敏捷团队 | CTO 决策 + Sprint |
| **flat** | 平等协作 | 民主投票 |
| **military** | 执行导向 | 单一指挥链 |

## 六、OpenClaw Bridge

agents-uni-core 不替代 OpenClaw，而是**在其之上**增加组织层：

```
Universe Spec (YAML)
       ↓ compile
Universe Instance (运行时)
       ↓ generate
SOUL.md × N (每个 Agent 一份)
       ↓ deploy
OpenClaw Workspaces (Agent 执行环境)
```

Bridge 模块生成的 SOUL.md 包含：
- Agent 的角色和职责（从 Role 提取）
- 与其他 Agent 的关系描述（从 Graph 提取）
- 权限约束（从 Permission Matrix 提取）
- 行为特质（从 Agent traits 提取）

## 七、create-uni 脚手架

```bash
npx create-uni my-project
# 或
npx create-uni my-project --template competitive
```

脚手架生成：
```
my-project/
├── universe.yaml      # 组织规范
├── package.json       # 项目依赖
├── data/              # 运行时数据
└── README.md          # 项目说明
```

## 八、CLI 工具

```bash
uni validate universe.yaml    # 验证规范
uni visualize universe.yaml   # ASCII 可视化
uni inspect universe.yaml     # 详细检视
uni deploy universe.yaml      # 部署到 OpenClaw
uni init                      # 交互式初始化
```

## 九、设计决策记录

### D1: 为什么用 YAML 而非 JSON？

YAML 支持注释、多行字符串、锚点引用，更适合人类编写和维护组织规范。JSON Schema 仍用于机器验证。

### D2: 为什么 Relationship 是有向图而非无向图？

因为现实中的关系不是对称的："A 信任 B"不意味着"B 信任 A"。有向图保留了这种不对称性。

### D3: 为什么内置演化引擎而非外部插件？

演化是组织的核心特性，不是可选功能。将其内置确保每个 Universe 都有自我优化的能力，避免"设计好组织就不管了"的反模式。

### D4: 为什么不直接管理 Agent 执行？

agents-uni-core 是**组织层**而非**执行层**。Agent 的实际执行由 OpenClaw 或其他运行时处理。这种分离使得组织定义可以独立于具体的 LLM 框架。

### D5: 为什么资源有 decay（衰减）？

衰减模拟了现实中的"用进废退"——不使用的权力会逐渐减弱，不维护的关系会逐渐疏远。这迫使 Agent 持续活跃才能保持资源优势。

## 十、设计灵感

agents-uni-core 的设计灵感来源于人类组织形态的演化历史：

- 唐代三省六部制 → `government` 模板的权力制衡理念
- 现代公司制 → `corporation` 模板的敏捷管理理念
- 军事指挥链 → `military` 模板的单一指挥理念
- 开源社区 → `flat` 模板的民主协作理念
- 体育赛事 → `competitive` 模板的赛马竞技理念

核心突破：
- 支持多种组织形态，而非绑定单一模式
- 内置演化引擎，组织结构可以自适应优化
- 资源竞争机制，用经济手段驱动 Agent 行为
- 关系动态演化，信任和竞争随时间自然演变
