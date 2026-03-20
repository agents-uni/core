import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskDispatcher } from '../../src/bridge/task-dispatcher.js';
import { MemoryWorkspaceIO } from '../../src/bridge/workspace-io.js';
import { EventBus } from '../../src/core/event-bus.js';

describe('TaskDispatcher', () => {
  let io: MemoryWorkspaceIO;
  let eventBus: EventBus;
  let dispatcher: TaskDispatcher;

  const sampleTask = {
    id: 'test-race-001',
    title: 'Write a poem',
    description: 'Write a short poem about spring',
    criteria: [
      { name: 'quality', weight: 0.7, description: 'Overall quality' },
      { name: 'creativity', weight: 0.3, description: 'Originality' },
    ],
    timeoutMs: 500,
    participants: ['agent-a', 'agent-b'],
  };

  beforeEach(() => {
    io = new MemoryWorkspaceIO();
    eventBus = new EventBus();
    dispatcher = new TaskDispatcher(io, {
      pollIntervalMs: 50,
      eventBus,
    });
  });

  describe('dispatch', () => {
    it('should write TASK.md to all participant workspaces', async () => {
      await dispatcher.dispatch(sampleTask);

      expect(io.tasks.has('agent-a')).toBe(true);
      expect(io.tasks.has('agent-b')).toBe(true);

      const taskContent = io.tasks.get('agent-a')!;
      expect(taskContent).toContain('Write a poem');
      expect(taskContent).toContain('test-race-001');
      expect(taskContent).toContain('agent-a');
    });

    it('should clear stale submissions before dispatching', async () => {
      io.simulateSubmission('agent-a', 'old submission');
      await dispatcher.dispatch(sampleTask);
      const sub = await io.readSubmission('agent-a');
      expect(sub).toBeNull();
    });

    it('should emit race.dispatched event', async () => {
      const handler = vi.fn();
      eventBus.subscribe(['race.dispatched'], handler);

      await dispatcher.dispatch(sampleTask);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'race.dispatched',
          actors: ['agent-a', 'agent-b'],
        })
      );
    });
  });

  describe('collect', () => {
    it('should collect submissions from agents', async () => {
      // Simulate both agents submitting immediately
      io.simulateSubmission('agent-a', 'poem from A');
      io.simulateSubmission('agent-b', 'poem from B');

      const result = await dispatcher.collect(sampleTask, new Date().toISOString());

      expect(result.submissions).toHaveLength(2);
      expect(result.timedOut).toHaveLength(0);

      const subA = result.submissions.find(s => s.agentId === 'agent-a');
      expect(subA?.output).toBe('poem from A');
    });

    it('should report timed out agents', async () => {
      // Only agent-a submits
      io.simulateSubmission('agent-a', 'poem from A');

      const result = await dispatcher.collect(sampleTask, new Date().toISOString());

      expect(result.submissions).toHaveLength(1);
      expect(result.timedOut).toEqual(['agent-b']);
    });

    it('should handle no submissions (all timeout)', async () => {
      const result = await dispatcher.collect(sampleTask, new Date().toISOString());

      expect(result.submissions).toHaveLength(0);
      expect(result.timedOut).toEqual(['agent-a', 'agent-b']);
    });

    it('should emit race.submitted events per agent', async () => {
      const handler = vi.fn();
      eventBus.subscribe(['race.submitted'], handler);

      io.simulateSubmission('agent-a', 'poem from A');
      await dispatcher.collect(sampleTask, new Date().toISOString());

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'race.submitted',
          actors: ['agent-a'],
        })
      );
    });

    it('should emit race.collected event', async () => {
      const handler = vi.fn();
      eventBus.subscribe(['race.collected'], handler);

      io.simulateSubmission('agent-a', 'poem from A');
      await dispatcher.collect(sampleTask, new Date().toISOString());

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should include parsed submission with NLP signals', async () => {
      io.simulateSubmission('agent-a', 'I agree with @agent-b. See `./src/main.ts`.\n\n> confidence: 0.9');
      const result = await dispatcher.collect(sampleTask, new Date().toISOString());

      const subA = result.submissions.find(s => s.agentId === 'agent-a')!;
      expect(subA.parsed).toBeDefined();
      expect(subA.parsed!.confidence).toBe(0.9);
      expect(subA.parsed!.stance).toBe('support');
      expect(subA.parsed!.mentionedAgents).toContain('agent-b');
      expect(subA.parsed!.referencedFiles).toContain('./src/main.ts');
      // output should be the content (soft convention stripped)
      expect(subA.output).not.toContain('> confidence');
    });

    it('should not read submission without done marker', async () => {
      io.simulateSubmissionWithoutDone('agent-a', 'half-written');
      const result = await dispatcher.collect(sampleTask, new Date().toISOString());

      expect(result.submissions).toHaveLength(0);
      expect(result.timedOut).toContain('agent-a');
    });
  });

  describe('run (full cycle)', () => {
    it('should dispatch and collect in one step', async () => {
      // Simulate agent submissions will appear after a tick
      const runPromise = dispatcher.run(sampleTask);

      // Simulate delayed submissions
      setTimeout(() => {
        io.simulateSubmission('agent-a', 'output A');
        io.simulateSubmission('agent-b', 'output B');
      }, 100);

      const result = await runPromise;

      expect(result.taskId).toBe('test-race-001');
      expect(result.submissions).toHaveLength(2);
      expect(result.timedOut).toHaveLength(0);
    });

    it('should track duration per submission', async () => {
      const runPromise = dispatcher.run(sampleTask);

      setTimeout(() => {
        io.simulateSubmission('agent-a', 'output A');
      }, 50);
      setTimeout(() => {
        io.simulateSubmission('agent-b', 'output B');
      }, 150);

      const result = await runPromise;

      // Both should have submitted, with agent-b having a longer duration
      expect(result.submissions).toHaveLength(2);
      const subA = result.submissions.find(s => s.agentId === 'agent-a')!;
      const subB = result.submissions.find(s => s.agentId === 'agent-b')!;
      expect(subB.duration).toBeGreaterThan(subA.duration);
    });
  });
});
