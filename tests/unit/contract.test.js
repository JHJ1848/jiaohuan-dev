'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  validateDecision,
  validateBugfixReport,
  assertDecisionValid,
  assertBugfixReportValid
} = require('../../skills/workflow/scripts/contract');

const {
  issueReceipt,
  verifyReceipt,
  isPathCoveredByScope
} = require('../../skills/workflow/scripts/confirmation');

describe('contract & confirmation unit tests', () => {
  describe('WorkflowDecision 契约校验', () => {
    it('合法决策契约应通过校验', () => {
      const validData = {
        route: 'dev',
        reason: '需要为项目增加新功能',
        scope: {
          read: ['README.md', 'skills/workflow/**'],
          write: ['skills/workflow/scripts/run-context.js']
        },
        next_gate: 'code-review',
        risk: 'R1'
      };
      const res = validateDecision(validData);
      assert.equal(res.valid, true);
      assert.equal(res.errors.length, 0);
      assert.doesNotThrow(() => assertDecisionValid(validData));
    });

    it('非法 route 应被阻断', () => {
      const invalidData = {
        route: 'deploy',
        reason: '直接部署',
        scope: { read: [], write: [] },
        next_gate: 'none',
        risk: 'R0'
      };
      const res = validateDecision(invalidData);
      assert.equal(res.valid, false);
      assert.match(res.errors.join('; '), /route 必须是 "dev"\|"bugfix"\|"explore"/);
      assert.throws(() => assertDecisionValid(invalidData), /决策契约校验失败/);
    });

    it('缺少必填字段或格式错误应被阻断', () => {
      const invalidData = {
        route: 'bugfix',
        reason: '',
        scope: 'not-an-object',
        risk: 'R9'
      };
      const res = validateDecision(invalidData);
      assert.equal(res.valid, false);
      assert.ok(res.errors.length >= 3);
    });

    it('包含未定义附加字段应被阻断', () => {
      const extraData = {
        route: 'explore',
        reason: '调研探索',
        scope: { read: [], write: [] },
        next_gate: 'user-confirm',
        risk: 'R0',
        extra_hacked_field: true
      };
      const res = validateDecision(extraData);
      assert.equal(res.valid, false);
      assert.match(res.errors.join('; '), /禁止未定义的附加字段 "extra_hacked_field"/);
    });
  });

  describe('BugfixReport 契约校验', () => {
    it('合法缺陷修复报告契约应通过校验', () => {
      const validReport = {
        root_cause: '绝对路径导致跨平台 MODULE_NOT_FOUND',
        reproduction: '在无该绝对路径的外部环境中 require 该模块',
        fix_boundary: ['scripts/hooks/enforce_allowlist.js'],
        evidence: 'node -e require 成功且 exit code 0'
      };
      const res = validateBugfixReport(validReport);
      assert.equal(res.valid, true);
      assert.equal(res.errors.length, 0);
      assert.doesNotThrow(() => assertBugfixReportValid(validReport));
    });

    it('fix_boundary 为空或非数组应被阻断', () => {
      const invalidReport = {
        root_cause: '根因分析',
        reproduction: '复现步骤',
        fix_boundary: [],
        evidence: '测试证据'
      };
      const res = validateBugfixReport(invalidReport);
      assert.equal(res.valid, false);
      assert.match(res.errors.join('; '), /fix_boundary 必须为非空字符串数组/);
      assert.throws(() => assertBugfixReportValid(invalidReport), /缺陷报告契约校验失败/);
    });
  });

  describe('ConfirmationReceipt 确认收据生命周期与安全校验', () => {
    it('应成功签发不可伪造的确认收据并验证通过', () => {
      const receipt = issueReceipt({
        task_id: 'task-contract-01',
        scope: {
          read: ['README.md'],
          write: ['skills/workflow/**', 'tests/unit/contract.test.js']
        },
        ttl_ms: 60000
      });

      assert.ok(receipt.receipt_id);
      assert.equal(receipt.task_id, 'task-contract-01');
      assert.ok(receipt.signature);
      assert.ok(receipt.plan_hash);

      const verification = verifyReceipt(receipt, 'write_to_file', 'skills/workflow/scripts/contract.js');
      assert.equal(verification.valid, true);
      assert.equal(verification.receipt_id, receipt.receipt_id);
    });

    it('读操作或只读工具应直接通过边界核验', () => {
      const receipt = issueReceipt({
        task_id: 'task-read-only',
        scope: { read: ['docs/**'], write: [] }
      });
      const verification = verifyReceipt(receipt, 'view_file', 'anywhere/secret.env');
      assert.equal(verification.valid, true);
    });

    it('尝试写入未授权范围文件应抛出 OutOfScope 阻断异常', () => {
      const receipt = issueReceipt({
        task_id: 'task-strict-scope',
        scope: {
          read: [],
          write: ['skills/workflow/**']
        }
      });

      assert.throws(
        () => verifyReceipt(receipt, 'write_to_file', 'package.json'),
        /\[ConfirmationReceipt OutOfScope\] 目标写入文件 "package.json" 超出确认收据授权范围/
      );
    });

    it('篡改元数据或签名应抛出 Tampered 阻断异常', () => {
      const receipt = issueReceipt({
        task_id: 'task-tamper',
        scope: { read: [], write: ['docs/**'] }
      });

      // 模拟篡改 scope 扩大权限
      receipt.scope.write.push('critical_system_file.js');
      assert.throws(
        () => verifyReceipt(receipt, 'write_to_file', 'docs/a.md'),
        /\[ConfirmationReceipt Tampered\] 收据签名无效或元数据已被篡改/
      );
    });

    it('过期收据应抛出 Expired 阻断异常', () => {
      const receipt = issueReceipt({
        task_id: 'task-expired',
        scope: { read: [], write: ['docs/**'] },
        ttl_ms: 10
      });

      // 人为让时间过期
      receipt.expires_at = new Date(Date.now() - 1000).toISOString();
      // 重新计算带过期时间的签名以单独测试过期校验
      const crypto = require('crypto');
      const expectedSignature = crypto.createHash('sha256')
        .update(`${receipt.receipt_id}:${receipt.task_id}:${JSON.stringify(receipt.scope)}:${receipt.plan_hash}:${receipt.expires_at}:jiaohuan-dev-workflow-receipt-salt-2026`)
        .digest('hex');
      receipt.signature = expectedSignature;

      assert.throws(
        () => verifyReceipt(receipt, 'write_to_file', 'docs/a.md'),
        /\[ConfirmationReceipt Expired\] 确认收据已于 .* 过期/
      );
    });
  });
});
