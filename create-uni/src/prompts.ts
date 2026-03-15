/**
 * Template content for create-uni scaffolding.
 */

const TEMPLATES: Record<string, (name: string) => string> = {
  competitive: (name) => `name: "${name}"
version: "0.1.0"
description: "竞技场模式 — 通过赛马竞争激发 Agent 最优表现"
type: competitive

agents:
  - id: judge
    name: 裁判
    role:
      title: 首席裁判
      duties: [发布竞赛任务, 盲审评分, 公布结果]
      permissions: [create_task, evaluate, announce]
    rank: 90

  - id: contestant-a
    name: 选手 A
    role:
      title: 竞赛选手
      duties: [接收任务, 独立完成, 提交作品]
      permissions: [receive_task, submit_work]
    rank: 50
    traits: { creativity: 0.8, efficiency: 0.6, accuracy: 0.7 }

  - id: contestant-b
    name: 选手 B
    role:
      title: 竞赛选手
      duties: [接收任务, 独立完成, 提交作品]
      permissions: [receive_task, submit_work]
    rank: 50
    traits: { creativity: 0.6, efficiency: 0.8, accuracy: 0.8 }

relationships:
  - { from: judge, to: contestant-a, type: superior }
  - { from: judge, to: contestant-b, type: superior }
  - { from: contestant-a, to: contestant-b, type: competitive, mutable: true }

protocols:
  - name: horse-race
    description: "赛马竞赛流程"
    states:
      - { name: TaskIssued, label: 出题 }
      - { name: Competing, label: 竞赛中 }
      - { name: Judging, label: 评审中 }
      - { name: Completed, label: 揭晓, terminal: true }
    transitions:
      - { from: TaskIssued, to: Competing, requiredRole: judge }
      - { from: Competing, to: Judging }
      - { from: Judging, to: Completed, requiredRole: judge }

governance:
  decisionModel: meritocratic
  permissionMatrix:
    - { actor: judge, target: contestant-a, actions: [assign, evaluate] }
    - { actor: judge, target: contestant-b, actions: [assign, evaluate] }
  reviewPolicy:
    mandatory: false
    reviewers: [judge]
    maxRounds: 1
  escalationRules: []

resources:
  - name: rating
    type: finite
    total: 10000
    distribution: competitive

evolution:
  performanceWindow: 20
  promotionThreshold: 75
  demotionThreshold: 30
  memoryRetention: 500
`,

  government: (name) => `name: "${name}"
version: "0.1.0"
description: "三省六部制层级协作"
type: hierarchical

agents:
  - id: coordinator
    name: 协调官
    role:
      title: 协调员
      duties: [接收任务, 分配工作, 汇总结果]
      permissions: [call, assign, review]
    rank: 80

  - id: reviewer
    name: 审核官
    role:
      title: 审核员
      duties: [审查方案, 批准或驳回]
      permissions: [review, approve, reject]
    rank: 75

  - id: executor
    name: 执行官
    role:
      title: 执行员
      duties: [执行任务, 汇报进度]
      permissions: [execute, report]
    rank: 50

relationships:
  - { from: coordinator, to: executor, type: superior }
  - { from: coordinator, to: reviewer, type: peer }
  - { from: reviewer, to: coordinator, type: reviewer }

protocols:
  - name: task-flow
    description: "标准任务流程"
    states:
      - { name: Draft, label: 起草 }
      - { name: Review, label: 审核 }
      - { name: Execute, label: 执行 }
      - { name: Done, label: 完成, terminal: true }
    transitions:
      - { from: Draft, to: Review, requiredRole: coordinator }
      - { from: Review, to: Execute, guard: "review.approved" }
      - { from: Review, to: Draft, guard: "review.rejected" }
      - { from: Execute, to: Done }

governance:
  decisionModel: autocratic
  permissionMatrix:
    - { actor: coordinator, target: executor, actions: [call, assign] }
    - { actor: coordinator, target: reviewer, actions: [call] }
    - { actor: reviewer, target: coordinator, actions: [reject, approve] }
  reviewPolicy:
    mandatory: true
    reviewers: [reviewer]
    maxRounds: 3
  escalationRules: []
`,

  corporation: (name) => `name: "${name}"
version: "0.1.0"
description: "现代企业层级"
type: hierarchical

agents:
  - id: manager
    name: 经理
    role:
      title: 项目经理
      duties: [任务分配, 进度跟踪, 结果审查]
      permissions: [assign, review, call]
    rank: 70

  - id: dev-1
    name: 开发者 1
    role:
      title: 开发工程师
      duties: [编写代码, 提交工作]
      permissions: [write_code, submit_work]
    rank: 40

  - id: dev-2
    name: 开发者 2
    role:
      title: 开发工程师
      duties: [编写代码, 提交工作]
      permissions: [write_code, submit_work]
    rank: 40

relationships:
  - { from: manager, to: dev-1, type: superior }
  - { from: manager, to: dev-2, type: superior }
  - { from: dev-1, to: dev-2, type: peer }

protocols:
  - name: sprint
    description: "Sprint 开发流程"
    states:
      - { name: Planning, label: 规划 }
      - { name: Developing, label: 开发 }
      - { name: Reviewing, label: 审查 }
      - { name: Done, label: 完成, terminal: true }
    transitions:
      - { from: Planning, to: Developing, requiredRole: manager }
      - { from: Developing, to: Reviewing }
      - { from: Reviewing, to: Done, guard: "review.approved" }
      - { from: Reviewing, to: Developing, guard: "review.rejected" }

governance:
  decisionModel: autocratic
  permissionMatrix:
    - { actor: manager, target: dev-1, actions: [assign, review, call] }
    - { actor: manager, target: dev-2, actions: [assign, review, call] }
  reviewPolicy:
    mandatory: true
    reviewers: [manager]
    maxRounds: 2
  escalationRules: []
`,

  flat: (name) => `name: "${name}"
version: "0.1.0"
description: "扁平团队协作"
type: flat

agents:
  - id: member-a
    name: 成员 A
    role:
      title: 团队成员
      duties: [提出想法, 执行任务, 互相评审]
      permissions: [call, submit_work, review]
    rank: 50

  - id: member-b
    name: 成员 B
    role:
      title: 团队成员
      duties: [提出想法, 执行任务, 互相评审]
      permissions: [call, submit_work, review]
    rank: 50

relationships:
  - { from: member-a, to: member-b, type: peer }

protocols:
  - name: collaborate
    description: "协作流程"
    states:
      - { name: Open, label: 开始 }
      - { name: Working, label: 协作中 }
      - { name: Done, label: 完成, terminal: true }
    transitions:
      - { from: Open, to: Working }
      - { from: Working, to: Done }

governance:
  decisionModel: democratic
  permissionMatrix:
    - { actor: member-a, target: member-b, actions: [call, review] }
    - { actor: member-b, target: member-a, actions: [call, review] }
  reviewPolicy:
    mandatory: false
    reviewers: []
    maxRounds: 1
  escalationRules: []
`,

  military: (name) => `name: "${name}"
version: "0.1.0"
description: "军事指挥链"
type: hierarchical

agents:
  - id: commander
    name: 指挥官
    role:
      title: 总指挥
      duties: [制定计划, 下达命令]
      permissions: [command, assign, approve]
    rank: 100

  - id: executor
    name: 执行者
    role:
      title: 执行员
      duties: [执行命令, 汇报结果]
      permissions: [execute, report]
    rank: 30

relationships:
  - { from: commander, to: executor, type: superior }

protocols:
  - name: mission
    description: "任务执行"
    states:
      - { name: Briefing, label: 下令 }
      - { name: Executing, label: 执行 }
      - { name: Complete, label: 完成, terminal: true }
    transitions:
      - { from: Briefing, to: Executing, requiredRole: commander }
      - { from: Executing, to: Complete }

governance:
  decisionModel: autocratic
  permissionMatrix:
    - { actor: commander, target: executor, actions: [call, assign] }
  reviewPolicy:
    mandatory: false
    reviewers: [commander]
    maxRounds: 1
  escalationRules: []
`,
};

export function getTemplate(template: string, name: string): string {
  const generator = TEMPLATES[template];
  if (!generator) {
    throw new Error(`Unknown template: ${template}. Available: ${Object.keys(TEMPLATES).join(', ')}`);
  }
  return generator(name);
}

export function getAvailableTemplates(): string[] {
  return Object.keys(TEMPLATES);
}
