'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  ExecutionBudget,
  LoopGuard,
  RunContext
} = require('../../skills/workflow/scripts/run-context');

describe('run-context & loop-guard unit tests', () => {
  describe('ExecutionBudget 执行预算控制器', () => {
    it('应具有默认预算限额与初始消耗', () => {
      const budget = new ExecutionBudget();
      const usage = budget.getUsage();
      assert.equal(usage.tool_calls, 0);
      assert.equal(usage.max_tool_calls, 50);
      assert.equal(usage.shell_calls, 0);
      assert.equal(usage.max_shell_calls, 15);
      assert.equal(usage.files_changed, 0);
      assert.equal(usage.max_files_changed, 10);
    });

    it('应支持自定义预算配置', () => {
      const budget = new ExecutionBudget({
        max_tool_calls: 5,
        max_shell_calls: 2,
        max_files_changed: 1
      });
      const usage = budget.getUsage();
      assert.equal(usage.max_tool_calls, 5);
      assert.equal(usage.max_shell_calls, 2);
      assert.equal(usage.max_files_changed, 1);
    });

    it('记录工具调用时应正确区分 shell 与普通工具，并累计修改文件', () => {
      const budget = new ExecutionBudget();

      budget.recordToolCall('view_file', { AbsolutePath: 'file1.txt' });
      assert.equal(budget.tool_calls, 1);
      assert.equal(budget.shell_calls, 0);

      budget.recordToolCall('run_command', { CommandLine: 'npm test' });
      assert.equal(budget.tool_calls, 2);
      assert.equal(budget.shell_calls, 1);

      budget.recordToolCall('write_to_file', { TargetFile: 'docs/a.md' });
      assert.equal(budget.tool_calls, 3);
      assert.equal(budget.changed_files.size, 1);

      // 重复修改同一文件不增加计数
      budget.recordToolCall('replace_file_content', { TargetFile: 'docs/a.md' });
      assert.equal(budget.tool_calls, 4);
      assert.equal(budget.changed_files.size, 1);
    });

    it('超过 max_tool_calls 应抛出阻断异常', () => {
      const budget = new ExecutionBudget({ max_tool_calls: 2 });
      budget.recordToolCall('toolA');
      budget.recordToolCall('toolB');
      assert.throws(
        () => budget.recordToolCall('toolC'),
        /\[ExecutionBudget Exceeded\] 工具调用总数已达 3，超出上限 2/
      );
    });

    it('超过 max_shell_calls 应抛出阻断异常', () => {
      const budget = new ExecutionBudget({ max_shell_calls: 1 });
      budget.recordToolCall('run_command');
      assert.throws(
        () => budget.recordToolCall('bash'),
        /\[ExecutionBudget Exceeded\] Shell 执行次数已达 2，超出上限 1/
      );
    });

    it('超过 max_files_changed 应抛出阻断异常', () => {
      const budget = new ExecutionBudget({ max_files_changed: 1 });
      budget.recordFileChange('file1.md');
      assert.throws(
        () => budget.recordFileChange('file2.md'),
        /\[ExecutionBudget Exceeded\] 变更文件数已达 2，超出上限 1/
      );
    });
  });

  describe('LoopGuard 循环保护熔断器', () => {
    it('不同动作连续记录不应触发熔断', () => {
      const guard = new LoopGuard();
      guard.recordAction('action_1');
      guard.recordAction('action_2');
      guard.recordAction('action_3');
      const status = guard.getStatus();
      assert.equal(status.tripped, false);
      assert.equal(status.consecutive_count, 1);
    });

    it('动作交替出现时应重置连续计数', () => {
      const guard = new LoopGuard();
      guard.recordAction('cmd: grep');
      guard.recordAction('cmd: grep');
      assert.equal(guard.consecutive_count, 2);

      guard.recordAction('cmd: ls');
      assert.equal(guard.consecutive_count, 1);

      guard.recordAction('cmd: grep');
      assert.equal(guard.consecutive_count, 1);
      assert.equal(guard.getStatus().tripped, false);
    });

    it('连续 3 次记录相同特征动作应强制触发 STOP 熔断', () => {
      const guard = new LoopGuard({ max_repeats: 3 });
      guard.recordAction('failed_query_retry');
      guard.recordAction('failed_query_retry');

      assert.throws(
        () => guard.recordAction('failed_query_retry'),
        /\[LoopGuard Tripped\] 检测到相同操作特征连续重复 3 次且无新进展，强制触发 STOP 熔断/
      );

      const status = guard.getStatus();
      assert.equal(status.tripped, true);

      // 熔断后后续动作依然被拦截
      assert.throws(
        () => guard.recordAction('any_other_action'),
        /\[LoopGuard Tripped\] 熔断器已触发/
      );
    });

    it('支持对象签名的自动序列化', () => {
      const guard = new LoopGuard({ max_repeats: 2 });
      const op = { tool: 'search', q: 'same_keyword' };
      guard.recordAction(op);
      assert.throws(
        () => guard.recordAction(op),
        /\[LoopGuard Tripped\] 检测到相同操作特征连续重复 2 次/
      );
    });

    it('reset 应重置熔断状态', () => {
      const guard = new LoopGuard({ max_repeats: 2 });
      assert.throws(() => {
        guard.recordAction('loop_sig');
        guard.recordAction('loop_sig');
      });
      assert.equal(guard.tripped, true);

      guard.reset();
      assert.equal(guard.tripped, false);
      assert.equal(guard.consecutive_count, 0);
      assert.doesNotThrow(() => guard.recordAction('new_sig'));
    });
  });

  describe('RunContext 运行时上下文', () => {
    it('参数缺失时应进行防御性校验', () => {
      assert.throws(() => new RunContext(), /\[RunContext\] run_id 不能为空/);
      assert.throws(() => new RunContext({ run_id: 'r1' }), /\[RunContext\] task_id 不能为空/);
    });

    it('应完整初始化并记录执行步骤联动', () => {
      const ctx = new RunContext({
        run_id: 'run-001',
        task_id: 'task-test',
        budget: { max_tool_calls: 10, max_shell_calls: 5 },
        loop_guard: { max_repeats: 3 }
      });

      assert.equal(ctx.run_id, 'run-001');
      assert.equal(ctx.task_id, 'task-test');
      assert.equal(ctx.status, 'running');

      ctx.recordStep({
        toolName: 'view_file',
        args: { AbsolutePath: 'test.js' },
        signature: 'view:test.js'
      });

      const snap = ctx.toSnapshot();
      assert.equal(snap.budget.tool_calls, 1);
      assert.equal(snap.loop_guard.history_length, 1);
    });

    it('在步骤中重复操作应触发上下文联动熔断', () => {
      const ctx = new RunContext({
        run_id: 'run-002',
        task_id: 'task-loop-test',
        loop_guard: { max_repeats: 3 }
      });

      ctx.recordStep({ toolName: 'run_command', signature: 'npm test' });
      ctx.recordStep({ toolName: 'run_command', signature: 'npm test' });

      assert.throws(
        () => ctx.recordStep({ toolName: 'run_command', signature: 'npm test' }),
        /\[LoopGuard Tripped\]/
      );
    });
  });
});
