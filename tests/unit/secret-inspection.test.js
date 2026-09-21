'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const {
  secretKinds,
  assertNoSecrets
} = require('../../skills/project-memory/scripts/runtime/secret-inspection');

describe('secret-inspection unit tests', () => {
  describe('secretKinds 敏感凭据正则检测', () => {
    it('应准确检测 JWT Token', () => {
      const sample = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const kinds = secretKinds(sample);
      assert.ok(kinds.includes('JWT') || kinds.includes('授权头'));
    });

    it('应准确检测云平台与服务密钥 (AWS / GitHub / OpenAI)', () => {
      assert.deepStrictEqual(secretKinds('AKIAIOSFODNN7EXAMPLE'), ['云密钥']);
      assert.deepStrictEqual(secretKinds('ghp_1234567890abcdef1234567890abcdef'), ['云密钥']);
      assert.deepStrictEqual(secretKinds('sk-1234567890abcdef1234567890abcdef'), ['云密钥']);
    });

    it('应检测 Authorization 请求头', () => {
      const header = 'Authorization: Bearer mySecretToken123456';
      const kinds = secretKinds(header);
      assert.ok(kinds.includes('授权头'));
    });

    it('应检测 Cookie / Set-Cookie', () => {
      const cookieLine = 'Cookie: sessionid=abcdef1234567890; token=xyz';
      const kinds = secretKinds(cookieLine);
      assert.ok(kinds.includes('Cookie'));
    });

    it('应检测键值凭据字段 (api_key, password 等)', () => {
      assert.ok(secretKinds('api_key="12345678abcdef"').includes('凭据字段'));
      assert.ok(secretKinds('password: secretpass123').includes('凭据字段'));
      assert.ok(secretKinds('client_secret = "topsecretvalue"').includes('凭据字段'));
    });

    it('应检测 URL 中的内嵌密码', () => {
      const url = 'https://admin:superSecretPwd@example.com/api';
      const kinds = secretKinds(url);
      assert.ok(kinds.includes('带密码地址'));
    });
  });

  describe('脱敏放行机制 (isRedacted)', () => {
    it('通用脱敏占位符应被安全放行', () => {
      assert.deepStrictEqual(secretKinds('api_key = "<redacted>"'), []);
      assert.deepStrictEqual(secretKinds('Authorization: Bearer [已脱敏]'), []);
      assert.deepStrictEqual(secretKinds('password: ***'), []);
      assert.deepStrictEqual(secretKinds('token: masked'), []);
      assert.deepStrictEqual(secretKinds('secret = redacted'), []);
      assert.deepStrictEqual(secretKinds('Cookie: 已脱敏'), []);
    });

    it('环境变量风格常量占位符应被安全放行', () => {
      assert.deepStrictEqual(secretKinds('api_key: MY_SECRET_API_KEY_PLACEHOLDER'), []);
      assert.deepStrictEqual(secretKinds('password: DEFAULT_DATABASE_PASSWORD'), []);
    });
  });

  describe('assertNoSecrets 归档阻断门禁', () => {
    it('当输入字段中存在敏感信息时应抛出阻断异常', () => {
      const fields = [
        { label: '摘要', value: '修复了接口鉴权问题' },
        { label: '原因分析', value: '由于使用了硬编码密钥 sk-1234567890abcdef1234567890abcdef 导致泄露' }
      ];
      assert.throws(() => {
        assertNoSecrets('/mock/root', fields, []);
      }, /正式归档检测到疑似凭据/);
    });

    it('当引用的任务临时证据文件中存在敏感信息时应抛出阻断异常', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-test-'));
      const secretFile = path.join(tempDir, 'evidence.txt');
      try {
        fs.writeFileSync(secretFile, 'curl -H "Authorization: Bearer realSensitiveToken123456" https://api.com', 'utf8');
        assert.throws(() => {
          assertNoSecrets(tempDir, [{ label: '摘要', value: '正常摘要' }], ['evidence.txt']);
        }, /正式归档检测到疑似凭据/);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('无敏感信息或已完整脱敏时应顺利通过', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-pass-test-'));
      const safeFile = path.join(tempDir, 'safe.txt');
      try {
        fs.writeFileSync(safeFile, 'curl -H "Authorization: Bearer <redacted>" https://api.com', 'utf8');
        const fields = [
          { label: '摘要', value: '安全摘要说明' },
          { label: '问题/需求', value: '统一凭据管理' },
          { label: '原因分析', value: '排查使用了 api_key = "<redacted>" 进行鉴权' }
        ];
        assert.doesNotThrow(() => {
          assertNoSecrets(tempDir, fields, ['safe.txt']);
        });
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
