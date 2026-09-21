'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const { run } = require('../../skills/project-memory/scripts/runtime/cli');
const { readText, existingFile } = require('../../skills/project-memory/scripts/runtime/filesystem');

describe('project-memory lifecycle integration tests', () => {
  it('完整闭环流程验证：init -> get -> temp/draft/path -> put -> inspect', () => {
    // 1. 创建隔离临时工程环境
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-lifecycle-fixture-'));
    try {
      // 构造工程边界标记与初始 AGENTS.md
      fs.mkdirSync(path.join(tempDir, '.git'), { recursive: true });
      const initialAgentsMd = '# Local Rules (AGENTS.md)\n\n<!-- project-memory:index:start -->\n<!-- project-memory:index:end -->\n';
      fs.writeFileSync(path.join(tempDir, 'AGENTS.md'), initialAgentsMd, 'utf8');

      // 2. 执行 init 初始化
      const initResult = run(['init', '--project-root', tempDir]);
      assert.strictEqual(initResult.status, 'initialized');
      assert.strictEqual(initResult.memory, 'docs/MEMORY.md');
      assert.strictEqual(existingFile(path.join(tempDir, 'docs', 'MEMORY.md')), true);
      assert.strictEqual(existingFile(path.join(tempDir, '.agents', 'project-memory', 'memory-policy.json')), true);

      // 验证 AGENTS.md 与 docs/MEMORY.md 建立了双向标记绑定
      const updatedAgents = readText(path.join(tempDir, 'AGENTS.md'));
      assert.ok(updatedAgents.includes('memory_file: docs/MEMORY.md'));
      const updatedMemory = readText(path.join(tempDir, 'docs', 'MEMORY.md'));
      assert.ok(updatedMemory.includes('agents_file: ../AGENTS.md'));

      // 3. 执行 get 检索
      const getResult = run(['get', '--project-root', tempDir, '--query', '架构准则']);
      assert.strictEqual(getResult.status, 'retrieved');
      assert.ok(Array.isArray(getResult.files));
      assert.ok(getResult.files.includes('docs/MEMORY.md'));

      // 4. 模拟任务过程数据：temp 证据、draft 草稿与 path 决策链
      const taskId = 'lifecycle-task-001';

      // 4.1 写入主任务临时材料 (temp)
      const tempResult = run([
        'temp',
        '--project-root', tempDir,
        '--task', taskId,
        '--type', 'evidence',
        '--text', '排查确认：底层运行时模块解耦良好，需要集成测试闭环覆盖。'
      ]);
      assert.strictEqual(tempResult.status, 'recorded');
      assert.strictEqual(tempResult.task, taskId);

      // 4.2 写入子任务草稿 (draft)
      const draftResult = run([
        'draft',
        '--project-root', tempDir,
        '--task', taskId,
        '--agent', 'worker-1',
        '--type', 'candidates',
        '--text', '子任务验证完成，支持 node:test 原生驱动。'
      ]);
      assert.strictEqual(draftResult.status, 'recorded');

      // 4.3 写入排查路径图 (path)
      const pathResult = run([
        'path',
        '--project-root', tempDir,
        '--task', taskId,
        '--node', 'N1',
        '--summary', '排查测试覆盖度',
        '--status', '已证实',
        '--conclusion', '补充 integration 端到端闭环单测'
      ]);
      assert.strictEqual(pathResult.status, 'path_updated');
      assert.strictEqual(pathResult.node.id, 'N1');

      // 5. 准备归档目标专题记忆 docs/memory/core-system.md
      const topicFile = path.join(tempDir, 'docs', 'memory', 'core-system.md');
      const topicInitialContent = [
        '# [专题受控记忆] 核心系统 (core-system)',
        '',
        '## 专题变更索引',
        '<!-- project-memory:changes:start -->',
        '<!-- project-memory:changes:end -->',
        ''
      ].join('\n');
      fs.writeFileSync(topicFile, topicInitialContent, 'utf8');

      // 6. 执行正式归档 (put)
      const changeTarget = 'docs/change/core-system/2026-09-20_生产就绪测试套件集成.md';
      const putResult = run([
        'put',
        '--project-root', tempDir,
        '--task', taskId,
        '--title', '生产就绪测试套件集成',
        '--summary', '完成端到端生命周期闭环验证与测试套件构建',
        '--problem', '缺少自动化回归能力与生命周期端到端校验。',
        '--facts', '采用 node:test 与 node:assert 原生执行，轻量且完全独立。',
        '--result', '集成测试与单元测试全部 PASS，Exit Code 0。',
        '--notes', '保障三层记忆治理与白名单约束长效运行。',
        '--value', 'high',
        '--target', changeTarget,
        '--confirmed'
      ]);

      assert.strictEqual(putResult.status, 'archived');
      assert.strictEqual(putResult.target, changeTarget);
      assert.strictEqual(existingFile(path.join(tempDir, changeTarget)), true);

      // 验证生成的变更记录包含四段式
      const changeRecordContent = readText(path.join(tempDir, changeTarget));
      assert.ok(changeRecordContent.includes('#### 一、问题/需求'));
      assert.ok(changeRecordContent.includes('#### 二、原因分析'));
      assert.ok(changeRecordContent.includes('#### 三、测试结果'));
      assert.ok(changeRecordContent.includes('#### 四、备注'));

      // 验证 docs/MEMORY.md 全局变更索引已追加
      const finalMainMemory = readText(path.join(tempDir, 'docs', 'MEMORY.md'));
      assert.ok(finalMainMemory.includes('生产就绪测试套件集成'));

      // 验证专题记忆 docs/memory/core-system.md 变更索引已追加
      const finalTopicMemory = readText(topicFile);
      assert.ok(finalTopicMemory.includes('生产就绪测试套件集成'));

      // 7. 执行完整性校验 (inspect)
      const inspectResult = run(['inspect', '--project-root', tempDir]);
      assert.strictEqual(inspectResult.status, 'inspected');
      assert.strictEqual(inspectResult.integrity.status, 'valid');
      assert.strictEqual(inspectResult.integrity.errors.length, 0);
      assert.strictEqual(inspectResult.integrity.changes_count, 1);
      assert.ok(inspectResult.integrity.checked_files >= 1);
    } finally {
      // 清理临时隔离测试工程
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
