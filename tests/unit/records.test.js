'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const {
  sceneRecord,
  classifyFormalTarget,
  checkIntegrity
} = require('../../skills/project-memory/scripts/runtime/records');

describe('records unit tests', () => {
  describe('sceneRecord 标准四段式生成', () => {
    it('应生成包含标准四段式结构及完整元信息的 Markdown 记录', () => {
      const mockOptions = {
        title: '生产就绪整改',
        summary: '建立测试体系与包清单',
        problem: '项目此前缺少 package.json 与单元测试/集成测试体系。',
        facts: 'Node.js 20+ 内置 node:test 套件轻量且零外部依赖。',
        result: '全部单元测试与集成测试通过，Exit Code 0。',
        notes: '保持零依赖原则，严禁安装臃肿第三方依赖。',
        validity: 'active',
        confirmed: true
      };
      const assessment = { value: 'high', reason: '架构完备性建设' };
      const sourceFiles = ['temp/task-1/evidence.md'];
      const pathInfo = { summary: '完成调研与实施', keywords: '测试 package', facts: '' };

      const markdown = sceneRecord(
        '/mock/root',
        '/mock/root/docs/change/project-memory/2026-09-20_test.md',
        mockOptions,
        mockOptions.title,
        mockOptions.summary,
        assessment,
        sourceFiles,
        pathInfo,
        null
      );

      // 验证标题与元信息
      assert.ok(markdown.includes('### 生产就绪整改'));
      assert.ok(markdown.includes('- 摘要: 建立测试体系与包清单'));
      assert.ok(markdown.includes('- 价值评估: high - 架构完备性建设'));
      assert.ok(markdown.includes('- 有效性: active'));
      assert.ok(markdown.includes('- 证据草稿: temp/task-1/evidence.md'));

      // 验证四段式标题严格存在
      assert.ok(markdown.includes('#### 一、问题/需求'));
      assert.ok(markdown.includes('项目此前缺少 package.json 与单元测试/集成测试体系。'));

      assert.ok(markdown.includes('#### 二、原因分析'));
      assert.ok(markdown.includes('Node.js 20+ 内置 node:test 套件轻量且零外部依赖。'));

      assert.ok(markdown.includes('#### 三、测试结果'));
      assert.ok(markdown.includes('全部单元测试与集成测试通过，Exit Code 0。'));

      assert.ok(markdown.includes('#### 四、备注'));
      assert.ok(markdown.includes('保持零依赖原则，严禁安装臃肿第三方依赖。'));
    });

    it('缺省选填字段时应提供合理的默认四段式文本', () => {
      const mockOptions = {
        summary: '极简记录',
        confirmed: true
      };
      const assessment = { value: 'medium' };
      const markdown = sceneRecord(
        '/mock/root',
        '/mock/root/docs/change/test/record.md',
        mockOptions,
        '极简标题',
        mockOptions.summary,
        assessment,
        [],
        { summary: '无', keywords: '无', facts: '' },
        null
      );

      assert.ok(markdown.includes('#### 一、问题/需求\n\n极简记录'));
      assert.ok(markdown.includes('#### 二、原因分析\n\n已确认核心因果链路并完成验证。'));
      assert.ok(markdown.includes('#### 三、测试结果\n\n本地自测验证通过。'));
      assert.ok(markdown.includes('#### 四、备注\n\n无特殊风险，遵循最小改动原则。'));
    });
  });

  describe('classifyFormalTarget 归档目标路径分类与校验', () => {
    it('正确识别专题受控记忆目标 (docs/memory/<topic>.md)', () => {
      const root = '/mock/root';
      const target = path.resolve(root, 'docs/memory/project-memory.md');
      const classification = classifyFormalTarget(root, target);
      assert.strictEqual(classification.kind, 'topic');
      assert.strictEqual(classification.topicName, 'project-memory');
    });

    it('正确识别子功能目标 (docs/memory/<topic>/<feature>.md)', () => {
      const root = '/mock/root';
      const target = path.resolve(root, 'docs/memory/project-memory/cli.md');
      const classification = classifyFormalTarget(root, target);
      assert.strictEqual(classification.kind, 'feature');
      assert.strictEqual(classification.topicName, 'project-memory');
      assert.strictEqual(classification.featureName, 'cli');
    });

    it('无对应专题记忆时拒绝无主创建变更记录', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'records-test-'));
      try {
        const changeTarget = path.join(tempDir, 'docs', 'change', 'non-existent-topic', '2026-09-20_test.md');
        assert.throws(() => {
          classifyFormalTarget(tempDir, changeTarget);
        }, /专题受控记忆文件不存在/);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('checkIntegrity 完整性核验机制', () => {
    it('当前仓库的完整性核验状态应为 valid', () => {
      const projectRoot = path.resolve(__dirname, '../..');
      const integrity = checkIntegrity(projectRoot);
      assert.strictEqual(integrity.status, 'valid');
      assert.strictEqual(integrity.errors.length, 0);
      assert.ok(integrity.checked_files > 0);
    });
  });
});
