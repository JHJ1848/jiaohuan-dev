'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  validateDecision,
  validateBugfixReport
} = require('../../skills/workflow/scripts/contract');

/**
 * 模拟根据用户输入意图决策的工作流路由器核心逻辑
 * 对应 skills/workflow/SKILL.md 四大主链条决策规范
 */
function routeWorkflowRequest(intent) {
  const text = (intent || '').toLowerCase();

  // 1. 探索链条：未知项/调研/概念/目标不明确
  if (text.includes('调研') || text.includes('探索') || text.includes('不明确') || text.includes('架构评估')) {
    return {
      route: 'explore',
      reason: '任务目标、边界或调用链不明确，执行只读调研与可行性探索',
      scope: {
        read: ['README.md', 'docs/**', 'skills/**'],
        write: []
      },
      next_gate: 'direction-confirmation',
      risk: 'R0'
    };
  }

  // 2. 缺陷排查与修复链条：报错/异常/失败/排障/Bug
  if (text.includes('报错') || text.includes('异常') || text.includes('排查') || text.includes('bug') || text.includes('fix')) {
    const isReadOnly = text.includes('只读') || text.includes('诊断') || text.includes('尚未确认');
    return {
      route: 'bugfix',
      reason: isReadOnly
        ? '针对报错或行为异常进行只读根因诊断，严格遵循外部环境->数据->既有代码排查路径'
        : '已确认缺陷根因与最小影响面，实施最小修复与回归验证',
      scope: {
        read: ['logs/**', 'src/**', 'tests/**'],
        write: isReadOnly ? [] : ['src/fixed-module.js', 'tests/fixed-module.test.js']
      },
      next_gate: isReadOnly ? 'root-cause-confirmation' : 'code-review',
      risk: isReadOnly ? 'R0' : 'R1'
    };
  }

  // 3. 开发链条：明确需求新增/修改功能
  return {
    route: 'dev',
    reason: '需求与实现范围已明确，执行受控代码修改与功能落地',
    scope: {
      read: ['docs/**', 'src/**', 'package.json'],
      write: ['src/feature.js', 'tests/feature.test.js']
    },
    next_gate: 'code-review',
    risk: 'R2'
  };
}

describe('Workflow Agent Evals: 确定性路由与输出结构评测', () => {
  describe('链条 1: 开发实施主链路 (Dev Pipeline)', () => {
    it('明确功能需求应稳定路由至 dev 并具备非空 write scope 与 code-review 确认门', () => {
      const prompt = '需求已确认，为用户中心新增短信验证码登录功能';
      const decision = routeWorkflowRequest(prompt);

      assert.equal(decision.route, 'dev');
      assert.ok(decision.scope.write.length > 0);
      assert.equal(decision.next_gate, 'code-review');
      assert.match(decision.risk, /^R[1-4]$/);

      const contractCheck = validateDecision(decision);
      assert.equal(contractCheck.valid, true, `契约校验失败: ${contractCheck.errors.join('; ')}`);
    });
  });

  describe('链条 2: 缺陷排查与修复主链路 (Bugfix Pipeline)', () => {
    it('明确缺陷修复任务应路由至 bugfix 且输出结构严格满足 BugfixReport 契约', () => {
      const prompt = '线上出现订单计算金额异常，已排查并确认是精度溢出，执行修复';
      const decision = routeWorkflowRequest(prompt);

      assert.equal(decision.route, 'bugfix');
      assert.equal(decision.next_gate, 'code-review');

      const decisionCheck = validateDecision(decision);
      assert.equal(decisionCheck.valid, true);

      // 配套输出的缺陷报告断言
      const mockReport = {
        root_cause: '金额计算未采用高精度浮点处理导致 IEEE754 精度丢失',
        reproduction: '传入 0.1 + 0.2 时返回 0.30000000000000004',
        fix_boundary: decision.scope.write,
        evidence: '单元测试覆盖 100 组极端边界全部通过断言'
      };
      const reportCheck = validateBugfixReport(mockReport);
      assert.equal(reportCheck.valid, true, `报告契约校验失败: ${reportCheck.errors.join('; ')}`);
    });
  });

  describe('链条 3: 只读诊断链路 (Read-Only Diagnostics)', () => {
    it('只读排障或根因未确认前应强制保持 write scope 为空并挂起等待确认', () => {
      const prompt = '只读排查登录服务偶发 500 报错，排查日志并定位，尚未确认根因';
      const decision = routeWorkflowRequest(prompt);

      assert.equal(decision.route, 'bugfix');
      assert.equal(decision.scope.write.length, 0, '只读诊断阶段严禁授予写权限');
      assert.equal(decision.next_gate, 'root-cause-confirmation');
      assert.equal(decision.risk, 'R0');

      const check = validateDecision(decision);
      assert.equal(check.valid, true);
    });
  });

  describe('链条 4: 调研探索主链路 (Explore Pipeline)', () => {
    it('任务含义或业务目标不明时应稳定路由至 explore 且写权限严格封死', () => {
      const prompt = '技术调研：评估接入分布式向量数据库的性能与架构影响，目标尚不明确';
      const decision = routeWorkflowRequest(prompt);

      assert.equal(decision.route, 'explore');
      assert.equal(decision.scope.write.length, 0, '探索阶段绝对禁止写文件');
      assert.equal(decision.next_gate, 'direction-confirmation');
      assert.equal(decision.risk, 'R0');

      const check = validateDecision(decision);
      assert.equal(check.valid, true);
    });
  });
});
