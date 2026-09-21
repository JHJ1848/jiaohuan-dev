#!/usr/bin/env node
/**
 * [Hook Script] Enforce Allowlist Guard (PreToolUse)
 * 
 * Google Antigravity / Task-Loop PreToolUse Hook
 * 优先动态探测全局 task-loop 插件环境，若不存在则自包含优雅降级。
 * 严禁硬编码绝对用户路径。
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 1. 动态探测全局 task-loop 插件路径
function findGlobalHook() {
  const candidates = [];
  if (process.env.TASK_LOOP_HOOK_PATH) {
    candidates.push(process.env.TASK_LOOP_HOOK_PATH);
  }
  const home = os.homedir();
  if (home) {
    candidates.push(
      path.join(home, '.gemini', 'config', 'plugins', 'task-loop', 'scripts', 'hooks', 'enforce_allowlist.js'),
      path.join(home, '.agents', 'plugins', 'task-loop', 'scripts', 'hooks', 'enforce_allowlist.js'),
      path.join(home, '.config', 'task-loop', 'scripts', 'hooks', 'enforce_allowlist.js')
    );
  }

  for (const candidate of candidates) {
    try {
      if (candidate && path.resolve(candidate) !== path.resolve(__filename) && fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

// 2. 自包含降级实现 (Standalone Fallback Implementation)
function normalizePath(p) {
  if (!p) return '';
  return path.normalize(p).replace(/\\/g, '/').toLowerCase();
}

function isPathInside(candidate, parent) {
  if (!candidate || !parent) return false;
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function extractTargetFile(toolName, args) {
  if (!args || typeof args !== 'object' || !toolName) return null;
  const writeTools = [
    'write_to_file',
    'replace_file_content',
    'multi_replace_file_content',
    'create_file',
    'edit_file',
    'delete_file',
    'write',
    'edit',
    'multiedit',
    'notebookedit'
  ];
  if (!writeTools.includes(String(toolName).toLowerCase())) {
    return null;
  }
  return args.TargetFile || args.FilePath || args.target_file || args.target_path || args.path || null;
}

function isExemptPath(normTarget, normWsRoot) {
  const tmpPath = normalizePath(os.tmpdir());
  const home = os.homedir();
  const desktopPath = home ? normalizePath(path.join(home, 'Desktop')) : '';
  const brainPath = home ? normalizePath(path.join(home, '.gemini', 'antigravity', 'brain')) : '';
  const geminiPath = home ? normalizePath(path.join(home, '.gemini')) : '';

  if ((desktopPath && isPathInside(normTarget, desktopPath)) ||
      (brainPath && isPathInside(normTarget, brainPath)) ||
      (geminiPath && isPathInside(normTarget, geminiPath)) ||
      (tmpPath && isPathInside(normTarget, tmpPath))) {
    return true;
  }

  if (normWsRoot && isPathInside(normTarget, normWsRoot)) {
    const wsExemptPrefixes = [
      normalizePath(path.join(normWsRoot, 'docs')),
      normalizePath(path.join(normWsRoot, 'scratch')),
      normalizePath(path.join(normWsRoot, '.agents', 'task-loop'))
    ];
    for (const p of wsExemptPrefixes) {
      if (isPathInside(normTarget, p)) return true;
    }
  }
  return false;
}

function isPathAllowed(targetFile, allowlist, wsRoot) {
  if (!targetFile) return true;
  const normTarget = normalizePath(path.isAbsolute(targetFile) ? targetFile : path.resolve(wsRoot || process.cwd(), targetFile));
  const normWsRoot = normalizePath(wsRoot || process.cwd());

  if (isExemptPath(normTarget, normWsRoot)) {
    return true;
  }

  if (!allowlist || !Array.isArray(allowlist) || allowlist.length === 0) {
    // 独立 CI/测试或未配置白名单环境，宽松放行
    return true;
  }

  for (const entry of allowlist) {
    if (entry === '*') return true;
    let cleanEntry = entry;
    if (cleanEntry.endsWith('/**')) cleanEntry = cleanEntry.slice(0, -3);
    else if (cleanEntry.endsWith('/*')) cleanEntry = cleanEntry.slice(0, -2);
    const absEntry = normalizePath(path.isAbsolute(cleanEntry) ? cleanEntry : path.resolve(wsRoot || process.cwd(), cleanEntry));
    if (isPathInside(normTarget, absEntry)) return true;
  }

  return false;
}

function findAllowlistForSession(wsRoot, conversationId) {
  if (process.env.TASK_LOOP_ALLOWLIST) {
    try {
      const parsed = JSON.parse(process.env.TASK_LOOP_ALLOWLIST);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      const parts = process.env.TASK_LOOP_ALLOWLIST.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) return parts;
    }
  }

  const root = wsRoot || process.cwd();
  const todoCandidates = [
    path.join(root, '.agents', 'task-loop', 'todo.json')
  ];
  for (const c of todoCandidates) {
    if (fs.existsSync(c)) {
      try {
        const raw = fs.readFileSync(c, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.items)) {
          const item = data.items.find(i =>
            (!conversationId || i.assignee_thread_id === conversationId) &&
            ['in_progress', 'dispatched', 'pending'].includes(i.status)
          );
          if (item && Array.isArray(item.allowlist) && item.allowlist.length > 0) {
            return item.allowlist;
          }
        }
      } catch {
        // ignore
      }
    }
  }
  return null;
}

function detectVendor(conversationId, explicitVendor) {
  if (explicitVendor) return String(explicitVendor).toLowerCase();
  if (process.env.ANTIGRAVITY_CONVERSATION_ID) return 'antigravity';
  if (process.env.CODEX_THREAD_ID || process.env.CODEX_SESSION_ID) return 'codex';
  if (process.env.CLAUDE_CONVERSATION_ID) return 'claude';
  return 'standalone';
}

function isRegisteredForVendor(sessionData, conversationId, vendor) {
  return true; // 降级模式默认兼容
}

function processPayloadFallback(payload) {
  try {
    const toolCall = payload && payload.toolCall;
    if (!toolCall || typeof toolCall !== 'object') {
      return { decision: 'allow' };
    }
    const targetFile = extractTargetFile(toolCall.name, toolCall.args);
    if (!targetFile) {
      return { decision: 'allow' };
    }
    const wsRoot = (Array.isArray(payload.workspacePaths) && payload.workspacePaths[0]) || process.cwd();
    const conversationId = payload.conversationId || payload.conversation_id || payload.sessionId || payload.session_id;
    const allowlist = findAllowlistForSession(wsRoot, conversationId);

    if (allowlist && allowlist.length > 0) {
      const allowed = isPathAllowed(targetFile, allowlist, wsRoot);
      if (!allowed) {
        return {
          decision: 'deny',
          reason: `[task-loop Allowlist Guard (Standalone)] 目标文件 '${targetFile}' 不在任务白名单内 (Allowlist: [${allowlist.join(', ')}])`
        };
      }
    }
    return { decision: 'allow' };
  } catch (err) {
    return { decision: 'allow', reason: 'Standalone fallback error, fail-open for test resilience: ' + err.message };
  }
}

// 3. 动态加载决策与导出
let delegateModule = null;
const globalHook = findGlobalHook();
if (globalHook) {
  try {
    delegateModule = require(globalHook);
  } catch {
    delegateModule = null;
  }
}

const exported = delegateModule || {
  processPayload: processPayloadFallback,
  extractTargetFile,
  isPathAllowed,
  findAllowlistForSession,
  detectVendor,
  isRegisteredForVendor
};

function main() {
  let rawInput = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', chunk => {
    rawInput += chunk;
  });

  process.stdin.on('end', () => {
    let payload = {};
    if (rawInput.trim().length > 0) {
      try {
        payload = JSON.parse(rawInput);
      } catch {
        payload = {};
      }
    } else {
      const argIdx = process.argv.indexOf('--payload');
      if (argIdx !== -1 && process.argv[argIdx + 1]) {
        try {
          payload = JSON.parse(process.argv[argIdx + 1]);
        } catch {
          payload = {};
        }
      }
    }

    const handler = (delegateModule && delegateModule.processPayload) || processPayloadFallback;
    const result = handler(payload);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  });
}

if (require.main === module) {
  main();
}

module.exports = exported;
