'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const {
  acquireLock,
  releaseLock,
  withLock,
  DEFAULT_STALE_TIMEOUT_MS
} = require('../../skills/project-memory/scripts/runtime/lock');

describe('lock unit tests (并发文件锁机制)', () => {
  it('应成功获取锁并正常释放', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-test-'));
    const lockFile = path.join(tempDir, 'test.lock');
    try {
      const handle = acquireLock(lockFile, { task: 'task-1' });
      assert.strictEqual(handle.acquired, true);
      assert.strictEqual(fs.existsSync(lockFile), true);

      // 验证锁文件内容记录了 pid、timestamp、task
      const content = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      assert.strictEqual(content.pid, process.pid);
      assert.strictEqual(content.task, 'task-1');
      assert.ok(typeof content.timestamp === 'number');

      // 释放锁
      releaseLock(lockFile);
      assert.strictEqual(fs.existsSync(lockFile), false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('并发竞争场景：同一锁未释放时，再次获取应在超时后抛出异常', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-conflict-test-'));
    const lockFile = path.join(tempDir, 'conflict.lock');
    try {
      acquireLock(lockFile, { task: 'task-owner' });

      // 第二个调用者尝试获取，设置较短的 timeout=100ms
      assert.throws(() => {
        acquireLock(lockFile, { timeout: 100, retryInterval: 20, task: 'task-contender' });
      }, /获取文件并发锁超时/);

      releaseLock(lockFile);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('死锁自动回收机制：陈旧锁超过 staleTimeout 应被自动清除并重新获取', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-stale-test-'));
    const lockFile = path.join(tempDir, 'stale.lock');
    try {
      // 人为制造一个已过期的陈旧锁（模拟崩溃留下的锁）
      const pastTime = Date.now() - 2000;
      const stalePayload = JSON.stringify({
        pid: 999999,
        timestamp: pastTime,
        task: 'crashed-agent',
        created_at: new Date(pastTime).toISOString()
      });
      fs.writeFileSync(lockFile, stalePayload, 'utf8');

      // 设置 staleTimeout 为 500ms（小于 2000ms），应判定为死锁并自动回收
      const handle = acquireLock(lockFile, { staleTimeout: 500, timeout: 200, task: 'recovering-agent' });
      assert.strictEqual(handle.acquired, true);

      const newContent = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      assert.strictEqual(newContent.task, 'recovering-agent');

      releaseLock(lockFile);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('withLock 应自动管理生命周期并在发生异常时安全释放锁', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'withlock-test-'));
    const lockFile = path.join(tempDir, 'withlock.lock');
    try {
      // 正常流程
      const result = withLock(lockFile, () => {
        assert.strictEqual(fs.existsSync(lockFile), true);
        return 42;
      });
      assert.strictEqual(result, 42);
      assert.strictEqual(fs.existsSync(lockFile), false);

      // 异常流程
      assert.throws(() => {
        withLock(lockFile, () => {
          assert.strictEqual(fs.existsSync(lockFile), true);
          throw new Error('测试崩溃');
        });
      }, /测试崩溃/);

      // 验证异常后锁依然被安全释放
      assert.strictEqual(fs.existsSync(lockFile), false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
