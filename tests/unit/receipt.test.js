'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const {
  verifyReceipt,
  appendFormalRecord,
} = require('../../skills/project-memory/scripts/runtime/records');

const {
  evaluateTwoStageMatch,
  retrieve,
} = require('../../skills/project-memory/scripts/runtime/retrieval');

function createFixture(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'docs', 'memory'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'docs', 'change'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.agents', 'project-memory'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'AGENTS.md'),
    '<!-- project-memory:index:start -->\nmemory_file: docs/MEMORY.md\nmemory_runtime: .agents/project-memory/\n<!-- project-memory:index:end -->\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(dir, '.agents', 'project-memory', 'memory-policy.json'),
    JSON.stringify({ memory_get_mode: 'auto', memory_put_mode: 'manually' }),
    'utf8'
  );
  return dir;
}

describe('receipt & two-stage retrieval unit tests (确认收据校验与检索增强)', () => {
  describe('verifyReceipt 确认收据校验 (P0-6 真实授权证明)', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const targetFile = path.resolve(projectRoot, 'docs/memory/project-memory.md');

    it('有效收据 (未过期且 scope 匹配) 应成功通过校验', () => {
      const validReceipt = {
        receipt_id: 'rcpt-test-001',
        expires_at: new Date(Date.now() + 60000).toISOString(),
        scope: ['docs/memory/**', 'docs/change/**'],
      };

      const verified = verifyReceipt(projectRoot, validReceipt, targetFile);
      assert.strictEqual(verified.receipt_id, 'rcpt-test-001');
    });

    it('支持 JSON 字符串与单个字符串 scope 匹配', () => {
      const receiptJson = JSON.stringify({
        receipt_id: 'rcpt-test-str',
        expires_at: new Date(Date.now() + 60000).toISOString(),
        scope: 'docs/memory/project-memory.md',
      });

      const verified = verifyReceipt(projectRoot, receiptJson, targetFile);
      assert.strictEqual(verified.receipt_id, 'rcpt-test-str');
    });

    it('过期收据应抛出阻断异常', () => {
      const expiredReceipt = {
        receipt_id: 'rcpt-expired',
        expires_at: new Date(Date.now() - 10000).toISOString(),
        scope: ['docs/memory/**'],
      };

      assert.throws(
        () => verifyReceipt(projectRoot, expiredReceipt, targetFile),
        /确认收据已过期/
      );
    });

    it('目标路径不在 scope 范围内时应抛出越界阻断异常', () => {
      const outOfScopeReceipt = {
        receipt_id: 'rcpt-scope-mismatch',
        expires_at: new Date(Date.now() + 60000).toISOString(),
        scope: ['docs/memory/bugfix.md', 'docs/change/bugfix/**'],
      };

      assert.throws(
        () => verifyReceipt(projectRoot, outOfScopeReceipt, targetFile),
        /不在确认收据授权范围/
      );
    });
  });

  describe('appendFormalRecord 授权流转分支测试', () => {
    it('既未提供 receipt 且无 confirmed 标志时，应返回 requires_archive_confirmation 阻断', () => {
      const tempDir = createFixture('receipt-test-block-');
      try {
        const memoryContent = [
          '# 主记忆',
          '<!-- project-memory:main-index:start -->',
          'agents_file: ../AGENTS.md',
          'topics: memory/',
          '<!-- project-memory:main-index:end -->',
          '<!-- project-memory:topics:start -->',
          '- [专题](memory/test.md)',
          '<!-- project-memory:topics:end -->',
        ].join('\n');
        fs.writeFileSync(path.join(tempDir, 'docs/MEMORY.md'), memoryContent, 'utf8');
        fs.writeFileSync(path.join(tempDir, 'docs/memory/test.md'), '# 专题\n', 'utf8');

        const result = appendFormalRecord(tempDir, {
          title: '测试归档',
          summary: '测试未授权阻断',
          task: 'task-test',
          target: 'docs/memory/test.md',
        });

        assert.strictEqual(result.status, 'requires_archive_confirmation');
        assert.ok(result.hint.includes('--receipt') || result.hint.includes('--confirmed'));
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('未提供 receipt 但提供 confirmed 标志时，应兼容放行并标记 confirmation_type 为 legacy_flag', () => {
      const tempDir = createFixture('receipt-test-legacy-');
      try {
        fs.mkdirSync(path.join(tempDir, '.agents/project-memory/temp/task-legacy'), { recursive: true });
        const memoryContent = [
          '# 主记忆',
          '<!-- project-memory:main-index:start -->',
          'agents_file: ../AGENTS.md',
          'topics: memory/',
          '<!-- project-memory:main-index:end -->',
          '<!-- project-memory:topics:start -->',
          '- [专题](memory/test.md)',
          '<!-- project-memory:topics:end -->',
        ].join('\n');
        fs.writeFileSync(path.join(tempDir, 'docs/MEMORY.md'), memoryContent, 'utf8');
        fs.writeFileSync(path.join(tempDir, 'docs/memory/test.md'), '# 专题\n', 'utf8');
        fs.writeFileSync(path.join(tempDir, '.agents/project-memory/temp/task-legacy/evidence.md'), '证据数据', 'utf8');

        const result = appendFormalRecord(tempDir, {
          title: '传统模式归档',
          summary: '兼容旧版 --confirmed 标志',
          task: 'task-legacy',
          target: 'docs/memory/test.md',
          confirmed: true,
          value: 'high',
        });

        assert.strictEqual(result.status, 'archived');
        assert.strictEqual(result.confirmation_type, 'legacy_flag');

        const content = fs.readFileSync(path.join(tempDir, 'docs/memory/test.md'), 'utf8');
        assert.ok(content.includes('- 确认类型: legacy_flag'));
        assert.ok(content.includes('legacy_flag'));
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('提供有效 receipt 时，应放行并标记 confirmation_type 为 verified_receipt', () => {
      const tempDir = createFixture('receipt-test-verified-');
      try {
        fs.mkdirSync(path.join(tempDir, '.agents/project-memory/temp/task-rcpt'), { recursive: true });
        const memoryContent = [
          '# 主记忆',
          '<!-- project-memory:main-index:start -->',
          'agents_file: ../AGENTS.md',
          'topics: memory/',
          '<!-- project-memory:main-index:end -->',
          '<!-- project-memory:topics:start -->',
          '- [专题](memory/test.md)',
          '<!-- project-memory:topics:end -->',
        ].join('\n');
        fs.writeFileSync(path.join(tempDir, 'docs/MEMORY.md'), memoryContent, 'utf8');
        fs.writeFileSync(path.join(tempDir, 'docs/memory/test.md'), '# 专题\n', 'utf8');
        fs.writeFileSync(path.join(tempDir, '.agents/project-memory/temp/task-rcpt/evidence.md'), '证据数据', 'utf8');

        const receipt = {
          receipt_id: 'RCPT-2026-0920-01',
          expires_at: new Date(Date.now() + 60000).toISOString(),
          scope: ['docs/memory/test.md'],
        };

        const result = appendFormalRecord(tempDir, {
          title: '收据授权归档',
          summary: '验证 P0-6 真实收据授权通过',
          task: 'task-rcpt',
          target: 'docs/memory/test.md',
          receipt,
          value: 'high',
        });

        assert.strictEqual(result.status, 'archived');
        assert.strictEqual(result.confirmation_type, 'verified_receipt');
        assert.strictEqual(result.receipt_id, 'RCPT-2026-0920-01');

        const content = fs.readFileSync(path.join(tempDir, 'docs/memory/test.md'), 'utf8');
        assert.ok(content.includes('- 确认类型: verified_receipt'));
        assert.ok(content.includes('RCPT-2026-0920-01'));
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('evaluateTwoStageMatch 与 Top-K 检索增强 (P1-5)', () => {
    it('Stage 1 与 Stage 2 应分别匹配元数据与正文词频并累加得分', () => {
      const content = [
        '# 用户认证鉴权架构设计',
        '',
        '- 摘要: 包含基于 JWT 与 OAuth2 的认证鉴权机制',
        '- 关键词: 认证 鉴权 token session',
        '',
        '## 详细说明',
        '系统在网关层面校验 JWT token，并在拦截器中核验用户权限与 token 签名。',
      ].join('\n');

      const terms = ['认证', 'token'];
      const res = evaluateTwoStageMatch(content, terms, { label: '认证设计', description: '鉴权模块' });

      assert.ok(res.score > 20, `预期得分应大于 20，实际为: ${res.score}`);
      assert.ok(res.stage1_matched);
      assert.ok(res.stage2_matched);
      assert.ok(res.matched_by.includes('title'));
      assert.ok(res.matched_by.includes('keywords'));
      assert.ok(res.matched_by.includes('content'));
    });

    it('retrieve 检索结果应按 score 降序排列并支持 Top-K 截断', () => {
      const tempDir = createFixture('retrieval-test-');
      try {
        const memoryContent = [
          '# 主记忆',
          '<!-- project-memory:main-index:start -->',
          'agents_file: ../AGENTS.md',
          'topics: memory/',
          '<!-- project-memory:main-index:end -->',
          '<!-- project-memory:topics:start -->',
          '- [订单专题](memory/order.md) - 交易与订单处理中心',
          '- [支付专题](memory/payment.md) - 支付与结算通道',
          '- [用户专题](memory/user.md) - 账号体系',
          '<!-- project-memory:topics:end -->',
        ].join('\n');
        fs.writeFileSync(path.join(tempDir, 'docs/MEMORY.md'), memoryContent, 'utf8');

        // 订单文档（多次包含订单，高分）
        fs.writeFileSync(
          path.join(tempDir, 'docs/memory/order.md'),
          '# 订单中心\n- 关键词: 订单 交易 履约\n订单创建、订单支付、订单发货与订单退款流转。\n',
          'utf8'
        );
        // 支付文档（只在正文中提了一次订单，低分）
        fs.writeFileSync(
          path.join(tempDir, 'docs/memory/payment.md'),
          '# 支付中心\n- 关键词: 微信 支付宝\n接收来自订单的支付回调。\n',
          'utf8'
        );
        // 用户文档（不包含）
        fs.writeFileSync(
          path.join(tempDir, 'docs/memory/user.md'),
          '# 用户中心\n- 关键词: 账号 手机号\n用户注册与登录。\n',
          'utf8'
        );

        const result = retrieve(tempDir, { query: '订单', limit: 2, explicit: true });
        assert.strictEqual(result.status, 'retrieved');
        assert.ok(result.documents.length <= 2, 'Top-K 截断应生效，返回条数不超过 2');

        const orderDoc = result.documents.find((d) => d.path === 'docs/memory/order.md');
        assert.ok(orderDoc, '订单文档应在 Top-K 检索结果中');
        assert.ok(orderDoc.score > 0);
        assert.ok(Array.isArray(orderDoc.matched_by));
        assert.ok(orderDoc.matched_by.length > 0);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
