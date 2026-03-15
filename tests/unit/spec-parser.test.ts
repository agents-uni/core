import { describe, it, expect } from 'vitest';
import { parseSpecString } from '../../src/spec/parser.js';

const validYaml = `
name: "test-universe"
version: "1.0.0"
description: "A test universe"
type: hierarchical

agents:
  - id: leader
    name: Leader
    role:
      title: Team Lead
      duties:
        - Coordinate
      permissions:
        - call
    rank: 80

  - id: worker
    name: Worker
    role:
      title: Worker
      duties:
        - Execute
      permissions:
        - submit_work
    rank: 40

relationships:
  - { from: leader, to: worker, type: superior }

protocols:
  - name: task-flow
    description: "Basic flow"
    states:
      - { name: Open, label: Open }
      - { name: Done, label: Done, terminal: true }
    transitions:
      - { from: Open, to: Done }

governance:
  decisionModel: autocratic
  permissionMatrix:
    - { actor: leader, target: worker, actions: [call, assign] }
  reviewPolicy:
    mandatory: false
    reviewers: []
    maxRounds: 1
  escalationRules: []
`;

describe('parseSpecString', () => {
  it('should parse valid YAML into UniverseConfig', () => {
    const config = parseSpecString(validYaml);
    expect(config.name).toBe('test-universe');
    expect(config.type).toBe('hierarchical');
    expect(config.agents).toHaveLength(2);
    expect(config.agents[0].id).toBe('leader');
    expect(config.agents[0].role.title).toBe('Team Lead');
    expect(config.relationships).toHaveLength(1);
    expect(config.protocols).toHaveLength(1);
    expect(config.governance.decisionModel).toBe('autocratic');
  });

  it('should throw on invalid YAML', () => {
    expect(() => parseSpecString('')).toThrow();
  });

  it('should apply defaults for missing fields', () => {
    const minimal = `
name: "minimal"
agents:
  - id: a
    name: A
    role:
      title: Worker
      duties: [work]
      permissions: [call]
protocols:
  - name: flow
    description: "Flow"
    states: [{ name: S, label: S }]
    transitions: []
governance:
  permissionMatrix: []
  reviewPolicy:
    mandatory: false
    reviewers: []
    maxRounds: 1
`;
    const config = parseSpecString(minimal);
    expect(config.version).toBe('0.1.0');
    expect(config.type).toBe('hybrid');
    expect(config.governance.decisionModel).toBe('autocratic');
  });
});
