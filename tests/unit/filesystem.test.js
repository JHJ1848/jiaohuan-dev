'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const {
  readText,
  writeTextAtomic,
  writeJsonAtomic,
  existingFile,
  samePath,
  isInside,
  toProjectPath,
  relativeFromFile,
  ensureSafeDirectory,
  assertSafeExistingDirectory,
  assertSafeProjectFile,
  ensureSafeDocsDirectory,
  assertSafeDocsTarget,
  resolveProjectRoot
} = require('../../skills/project-memory/scripts/runtime/filesystem');

describe('filesystem runtime unit tests', () => {
  describe('isInside', () => {
    it('应正确判断子路径位于基准目录内', () => {
      const base = path.resolve('/mock/project');
      const child = path.resolve('/mock/project/docs/memory/topic.md');
      assert.strictEqual(isInside(base, child), true);
    });

    it('自身路径应视作在自身内部', () => {
      const base = path.resolve('/mock/project');
      assert.strictEqual(isInside(base, base), true);
    });

    it('跨越到上级或外部目录时应判定为不在内部 (目录越界防护)', () => {
      const base = path.resolve('/mock/project');
      const outside = path.resolve('/mock/project/../other/file.txt');
      const sibling = path.resolve('/mock/other');
      assert.strictEqual(isInside(base, outside), false);
      assert.strictEqual(isInside(base, sibling), false);
    });
  });

  describe('samePath', () => {
    it('跨平台规范化判断路径一致性', () => {
      const p1 = path.join('foo', 'bar', 'baz.md');
      const p2 = path.join('foo', '.', 'bar', 'baz.md');
      assert.strictEqual(samePath(p1, p2), true);

      if (process.platform === 'win32') {
        assert.strictEqual(samePath('C:\\Foo\\Bar.md', 'c:\\foo\\bar.md'), true);
      }
    });
  });

  describe('toProjectPath & relativeFromFile', () => {
    it('toProjectPath 应生成统一正斜杠相对路径', () => {
      const root = path.resolve('/mock/root');
      const target = path.resolve('/mock/root/docs/change/test.md');
      assert.strictEqual(toProjectPath(root, target), 'docs/change/test.md');
    });

    it('relativeFromFile 应计算从来源文件目录到目标文件的正斜杠路径', () => {
      const file = path.resolve('/mock/root/docs/memory/topic.md');
      const target = path.resolve('/mock/root/docs/change/topic/record.md');
      assert.strictEqual(relativeFromFile(file, target), '../change/topic/record.md');
    });
  });

  describe('readText & writeTextAtomic & writeJsonAtomic', () => {
    it('writeTextAtomic 应原子化写入且读写无 BOM 残留', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-test-'));
      const testFile = path.join(tempDir, 'sample.txt');
      try {
        writeTextAtomic(testFile, 'Hello Project Memory\n');
        assert.strictEqual(existingFile(testFile), true);
        assert.strictEqual(readText(testFile), 'Hello Project Memory\n');

        // 测试 BOM 头剥离
        const bomContent = '\uFEFFBOM Content';
        fs.writeFileSync(testFile, bomContent, 'utf8');
        assert.strictEqual(readText(testFile), 'BOM Content');

        // 测试 writeJsonAtomic
        const jsonFile = path.join(tempDir, 'data.json');
        writeJsonAtomic(jsonFile, { key: 'value' });
        const jsonContent = JSON.parse(readText(jsonFile));
        assert.deepStrictEqual(jsonContent, { key: 'value' });
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('ensureSafeDirectory & assertSafeProjectFile & assertSafeDocsTarget', () => {
    it('安全目录创建与越界阻断', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-security-test-'));
      try {
        const validDir = path.join(tempDir, 'sub', 'dir');
        ensureSafeDirectory(tempDir, validDir);
        assert.strictEqual(fs.existsSync(validDir), true);
        assert.strictEqual(assertSafeExistingDirectory(tempDir, validDir), validDir);

        // 越界创建应报错拦截
        const invalidDir = path.join(tempDir, '..', 'escaped-dir');
        assert.throws(() => {
          ensureSafeDirectory(tempDir, invalidDir);
        }, /必须位于项目内/);

        // docs 目标安全核验
        const docsDir = ensureSafeDocsDirectory(tempDir);
        assert.strictEqual(fs.existsSync(docsDir), true);

        const validDocsTarget = path.join(tempDir, 'docs', 'memory', 'test.md');
        assert.strictEqual(assertSafeDocsTarget(tempDir, validDocsTarget, false), validDocsTarget);

        // 非 .md 文件或不在 docs/ 内的文件应被拒绝
        const nonMdTarget = path.join(tempDir, 'docs', 'script.js');
        assert.throws(() => {
          assertSafeDocsTarget(tempDir, nonMdTarget, false);
        }, /Markdown/);

        const outsideDocsTarget = path.join(tempDir, 'src', 'test.md');
        assert.throws(() => {
          assertSafeDocsTarget(tempDir, outsideDocsTarget, false);
        }, /Markdown/);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('resolveProjectRoot', () => {
    it('能解析显式传入的有效项目根目录', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'root-test-'));
      try {
        const resolved = resolveProjectRoot(tempDir);
        assert.strictEqual(samePath(resolved, tempDir), true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('若传入不存在的目录应抛出异常', () => {
      assert.throws(() => {
        resolveProjectRoot(path.join(os.tmpdir(), 'non-existent-dir-' + Date.now()));
      }, /项目根目录不存在/);
    });
  });
});
