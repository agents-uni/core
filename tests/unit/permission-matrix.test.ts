import { describe, it, expect } from 'vitest';
import { PermissionMatrix } from '../../src/core/permission-matrix.js';
import type { GovernanceConfig, AgentDefinition } from '../../src/types/index.js';

const agents: AgentDefinition[] = [
  { id: 'taizi', name: '太子', role: { title: '太子', duties: [], permissions: [] }, rank: 90 },
  { id: 'zhongshu', name: '中书', role: { title: '中书令', duties: [], permissions: [] }, rank: 80 },
  { id: 'menxia', name: '门下', role: { title: '侍中', duties: [], permissions: [] }, rank: 80 },
];

const governance: GovernanceConfig = {
  decisionModel: 'autocratic',
  permissionMatrix: [
    { actor: 'taizi', target: 'zhongshu', actions: ['call'] },
    { actor: 'zhongshu', target: 'menxia', actions: ['call', 'review'] },
    { actor: 'menxia', target: 'zhongshu', actions: ['reject'] },
  ],
  reviewPolicy: { mandatory: true, reviewers: ['menxia'], maxRounds: 3 },
  escalationRules: [],
};

describe('PermissionMatrix', () => {
  it('should allow permitted actions', () => {
    const pm = new PermissionMatrix(governance, agents);
    expect(pm.isAllowed('taizi', 'zhongshu', 'call')).toBe(true);
    expect(pm.isAllowed('zhongshu', 'menxia', 'review')).toBe(true);
  });

  it('should deny unpermitted actions', () => {
    const pm = new PermissionMatrix(governance, agents);
    expect(pm.isAllowed('taizi', 'menxia', 'call')).toBe(false);
    expect(pm.isAllowed('zhongshu', 'taizi', 'call')).toBe(false);
    expect(pm.isAllowed('taizi', 'zhongshu', 'promote')).toBe(false);
  });

  it('should list allowed actions', () => {
    const pm = new PermissionMatrix(governance, agents);
    const actions = pm.getAllowedActions('zhongshu', 'menxia');
    expect(actions).toContain('call');
    expect(actions).toContain('review');
    expect(actions).not.toContain('promote');
  });

  it('should support runtime grants', () => {
    const pm = new PermissionMatrix(governance, agents);
    expect(pm.isAllowed('taizi', 'menxia', 'call')).toBe(false);

    pm.grant('taizi', 'menxia', 'call');
    expect(pm.isAllowed('taizi', 'menxia', 'call')).toBe(true);
  });

  it('should support runtime revocations', () => {
    const pm = new PermissionMatrix(governance, agents);
    expect(pm.isAllowed('taizi', 'zhongshu', 'call')).toBe(true);

    pm.revoke('taizi', 'zhongshu', 'call');
    expect(pm.isAllowed('taizi', 'zhongshu', 'call')).toBe(false);
  });
});
