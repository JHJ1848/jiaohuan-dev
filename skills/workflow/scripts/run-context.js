/**
 * [Workflow Runtime] RunContext & LoopGuard
 * 
 * 轻量级运行时上下文管理器、执行预算控制器与循环保护熔断器。
 * 遵循极简、零依赖、纯原生 Node.js 设计。
 */

const SHELL_TOOLS = new Set([
  'run_command',
  'bash',
  'shell',
  'exec',
  'terminal',
  'cmd'
]);

const FILE_MODIFY_TOOLS = new Set([
  'write_to_file',
  'replace_file_content',
  'multi_replace_file_content',
  'create_file',
  'edit_file',
  'delete_file',
  'write',
  'edit',
  'multiedit'
]);

/**
 * 执行预算控制器
 */
class ExecutionBudget {
  /**
   * @param {Object} [limits]
   * @param {number} [limits.max_tool_calls=50] 最大工具调用总数
   * @param {number} [limits.max_shell_calls=15] 最大 Shell 执行次数
   * @param {number} [limits.max_files_changed=10] 最大修改文件数 (去重)
   */
  constructor(limits = {}) {
    this.max_tool_calls = typeof limits.max_tool_calls === 'number' ? limits.max_tool_calls : 50;
    this.max_shell_calls = typeof limits.max_shell_calls === 'number' ? limits.max_shell_calls : 15;
    this.max_files_changed = typeof limits.max_files_changed === 'number' ? limits.max_files_changed : 10;

    this.tool_calls = 0;
    this.shell_calls = 0;
    this.changed_files = new Set();
  }

  /**
   * 记录一次工具调用并自动累计对应类型计数
   * @param {string} toolName
   * @param {Object} [args]
   */
  recordToolCall(toolName, args = {}) {
    this.tool_calls += 1;

    const lowerTool = String(toolName || '').toLowerCase();
    if (SHELL_TOOLS.has(lowerTool)) {
      this.shell_calls += 1;
    }

    if (FILE_MODIFY_TOOLS.has(lowerTool)) {
      const target = args.TargetFile || args.FilePath || args.target_file || args.path || args.file;
      if (target) {
        this.changed_files.add(String(target));
      }
    }

    this.assertWithinBudget();
  }

  /**
   * 显式记录修改的文件
   * @param {string} filePath
   */
  recordFileChange(filePath) {
    if (filePath) {
      this.changed_files.add(String(filePath));
      this.assertWithinBudget();
    }
  }

  /**
   * 核验是否超出预算，若超出抛出阻断异常
   */
  assertWithinBudget() {
    if (this.tool_calls > this.max_tool_calls) {
      throw new Error(`[ExecutionBudget Exceeded] 工具调用总数已达 ${this.tool_calls}，超出上限 ${this.max_tool_calls}`);
    }
    if (this.shell_calls > this.max_shell_calls) {
      throw new Error(`[ExecutionBudget Exceeded] Shell 执行次数已达 ${this.shell_calls}，超出上限 ${this.max_shell_calls}`);
    }
    if (this.changed_files.size > this.max_files_changed) {
      throw new Error(`[ExecutionBudget Exceeded] 变更文件数已达 ${this.changed_files.size}，超出上限 ${this.max_files_changed}`);
    }
  }

  /**
   * 获取当前预算消耗摘要
   */
  getUsage() {
    return {
      tool_calls: this.tool_calls,
      max_tool_calls: this.max_tool_calls,
      shell_calls: this.shell_calls,
      max_shell_calls: this.max_shell_calls,
      files_changed: this.changed_files.size,
      max_files_changed: this.max_files_changed,
      changed_file_list: Array.from(this.changed_files)
    };
  }
}

/**
 * 循环动作保护与强制熔断器
 */
class LoopGuard {
  /**
   * @param {Object} [options]
   * @param {number} [options.max_repeats=3] 连续重复触发熔断阈值
   */
  constructor(options = {}) {
    this.max_repeats = typeof options.max_repeats === 'number' ? options.max_repeats : 3;
    this.consecutive_count = 0;
    this.last_signature = null;
    this.tripped = false;
    this.history = [];
  }

  /**
   * 规范化动作特征签名
   * @param {string|Object} action
   * @returns {string}
   */
  static generateSignature(action) {
    if (!action) return '';
    if (typeof action === 'string') return action.trim();
    try {
      return JSON.stringify(action);
    } catch {
      return String(action);
    }
  }

  /**
   * 记录动作并检测是否连续重复
   * @param {string|Object} signature 动作或命令特征签名
   * @param {Object} [metadata] 补充证据或结果描述
   */
  recordAction(signature, metadata = {}) {
    if (this.tripped) {
      throw new Error(`[LoopGuard Tripped] 熔断器已触发，拒绝执行后续动作。签名: "${this.last_signature}"`);
    }

    const sig = LoopGuard.generateSignature(signature);
    if (!sig) return;

    if (sig === this.last_signature) {
      this.consecutive_count += 1;
    } else {
      this.last_signature = sig;
      this.consecutive_count = 1;
    }

    this.history.push({
      signature: sig,
      consecutive: this.consecutive_count,
      timestamp: new Date().toISOString(),
      metadata
    });

    if (this.consecutive_count >= this.max_repeats) {
      this.tripped = true;
      throw new Error(
        `[LoopGuard Tripped] 检测到相同操作特征连续重复 ${this.consecutive_count} 次且无新进展，强制触发 STOP 熔断。操作签名: "${sig}"`
      );
    }
  }

  /**
   * 重置熔断器状态
   */
  reset() {
    this.consecutive_count = 0;
    this.last_signature = null;
    this.tripped = false;
  }

  /**
   * 获取熔断状态
   */
  getStatus() {
    return {
      tripped: this.tripped,
      consecutive_count: this.consecutive_count,
      last_signature: this.last_signature,
      max_repeats: this.max_repeats,
      history_length: this.history.length
    };
  }
}

/**
 * 运行时任务上下文
 */
class RunContext {
  /**
   * @param {Object} options
   * @param {string} options.run_id 运行实例 ID
   * @param {string} options.task_id 任务 ID
   * @param {Object} [options.budget] 预算配置
   * @param {Object} [options.loop_guard] 循环保护配置
   */
  constructor(options = {}) {
    if (!options.run_id) throw new Error('[RunContext] run_id 不能为空');
    if (!options.task_id) throw new Error('[RunContext] task_id 不能为空');

    this.run_id = String(options.run_id);
    this.task_id = String(options.task_id);
    this.started_at = options.started_at || new Date().toISOString();
    this.status = 'running';

    this.budget = new ExecutionBudget(options.budget);
    this.loopGuard = new LoopGuard(options.loop_guard);
  }

  /**
   * 记录执行步骤：同时触发预算检查与防循环熔断
   * @param {Object} step
   * @param {string} step.toolName 工具名称
   * @param {Object} [step.args] 工具调用入参
   * @param {string|Object} [step.signature] 操作特征签名 (若缺省则基于 toolName 与 args 生成)
   * @param {Object} [step.result] 执行结果或证据
   */
  recordStep(step = {}) {
    const toolName = step.toolName || 'unknown_tool';
    const args = step.args || {};

    // 1. 预算核验与扣减
    this.budget.recordToolCall(toolName, args);

    // 2. 循环防空耗核验
    const signature = step.signature || { tool: toolName, args };
    this.loopGuard.recordAction(signature, step.result);
  }

  /**
   * 导出上下文快照
   */
  toSnapshot() {
    return {
      run_id: this.run_id,
      task_id: this.task_id,
      started_at: this.started_at,
      status: this.status,
      budget: this.budget.getUsage(),
      loop_guard: this.loopGuard.getStatus()
    };
  }
}

module.exports = {
  ExecutionBudget,
  LoopGuard,
  RunContext
};
