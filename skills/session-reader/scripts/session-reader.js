#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROLES = new Set(['user', 'assistant']);
const PROVIDERS = new Set(['codex', 'claude', 'gemini', 'file']);
const FORMAT_VALUES = new Set(['json', 'markdown']);

function fail(message) {
  throw new Error(message);
}

function usage(message) {
  if (message) {
    process.stderr.write(`session-reader: ${message}\n`);
  }
  process.stderr.write('用法：session-reader.js read --file <文件> [--provider <名称>] [--query <关键词>] [--from <序号>] [--to <序号>] [--format json|markdown]\n');
  process.stderr.write('或：session-reader.js read --provider <codex|claude|gemini> --session <会话ID> [同上选项]\n');
  process.exitCode = 1;
}

function parseArgs(argv) {
  const command = argv[0] || 'read';
  if (command !== 'read' && command !== 'inspect') {
    usage(`不支持的命令：${command}`);
    return null;
  }
  const options = { command };
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      usage(`未预期的参数：${token}`);
      return null;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      usage(`缺少 --${key} 的取值。`);
      return null;
    }
    options[key] = value;
    index += 1;
  }
  return options;
}

function providerRoot(provider) {
  const home = process.env.USERPROFILE || os.homedir();
  const roots = {
    codex: [path.join(home, '.codex', 'sessions'), path.join(home, '.codex', 'archived_sessions')],
    claude: [path.join(home, '.claude', 'projects'), path.join(home, '.claude', 'sessions')],
    gemini: [path.join(home, '.gemini', 'tmp'), path.join(home, '.gemini', 'history')],
  };
  return roots[provider] || [];
}

function isRegularFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (error) {
    return false;
  }
}

function walkFiles(root, sessionId, result, limit) {
  if (result.length >= limit || !fs.existsSync(root)) {
    return;
  }
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (error) {
    return;
  }
  for (const entry of entries) {
    if (result.length >= limit) return;
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkFiles(target, sessionId, result, limit);
      continue;
    }
    if (!entry.isFile()) continue;
    const lowerName = entry.name.toLowerCase();
    if (!lowerName.endsWith('.jsonl') && !lowerName.endsWith('.json') && !lowerName.endsWith('.md')) continue;
    if (lowerName.includes(sessionId.toLowerCase())) {
      result.push(target);
    }
  }
}

function resolveSource(options) {
  if (options.file && options.session) {
    fail('--file 与 --session 只能二选一。');
  }
  const provider = String(options.provider || (options.file ? 'file' : '')).toLowerCase();
  if (!PROVIDERS.has(provider)) {
    fail('--provider 只能是 codex、claude、gemini 或 file。');
  }
  if (options.file) {
    const filePath = path.resolve(options.file);
    if (!isRegularFile(filePath)) fail(`来源文件不存在或不是普通文件：${filePath}`);
    return { provider, sessionId: options.session || '', filePath };
  }
  if (!options.session) {
    fail('必须提供 --file 或 --session。');
  }
  if (provider === 'file') {
    fail('provider=file 必须配合 --file。');
  }
  const matches = [];
  for (const root of providerRoot(provider)) {
    walkFiles(root, String(options.session), matches, 20);
  }
  if (matches.length === 0) {
    fail(`未按会话 ID 找到 ${provider} 来源；请改用 --file 指定厂商导出文件。`);
  }
  if (matches.length > 1) {
    fail(`会话 ID 匹配到多个来源（${matches.length} 个）；请改用 --file 明确指定。`);
  }
  return { provider, sessionId: options.session, filePath: matches[0] };
}

function normalizeRole(value) {
  const role = String(value || '').toLowerCase();
  if (role === 'user' || role === 'human' || role === '用户') return 'user';
  if (role === 'assistant' || role === 'ai' || role === 'model' || role === '助手') return 'assistant';
  return null;
}

function textFromContent(value) {
  if (typeof value === 'string') return value;
  if (!value) return '';
  if (Array.isArray(value)) return value.map(textFromContent).filter(Boolean).join('\n');
  if (typeof value !== 'object') return '';
  if (value.type && !['text', 'input_text', 'output_text'].includes(value.type)) return '';
  for (const key of ['text', 'content', 'output_text', 'message']) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const text = textFromContent(value[key]);
      if (text) return text;
    }
  }
  return '';
}

function candidateMessage(item) {
  const candidates = [item, item && item.message, item && item.payload, item && item.payload && item.payload.message];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    let role = normalizeRole(candidate.role);
    if (!role && candidate.type === 'user_message') role = 'user';
    if (!role && candidate.type === 'assistant_message') role = 'assistant';
    if (!ROLES.has(role)) continue;
    const values = [candidate.content, candidate.text, candidate.message, candidate.output];
    const text = values.map(textFromContent).find((value) => value.trim()) || '';
    if (text.trim()) return { role, text: text.trim() };
  }
  return null;
}

function parseJsonLines(content, provider) {
  const messages = [];
  const omitted = new Set();
  let invalidLines = 0;
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    let item;
    try {
      item = JSON.parse(line);
    } catch (error) {
      invalidLines += 1;
      return;
    }
    const message = candidateMessage(item);
    if (message) {
      const previous = messages[messages.length - 1];
      if (!previous || previous.role !== message.role || previous.text !== message.text) {
        messages.push({ ...message, source_line: index + 1 });
      }
      return;
    }
    const type = String(item.type || (item.payload && item.payload.type) || '').toLowerCase();
    if (type.includes('tool')) omitted.add('tool');
    else if (type.includes('system')) omitted.add('system');
    else if (type.includes('developer')) omitted.add('developer');
    else if (type || item.payload) omitted.add('unknown');
  });
  if (invalidLines > 0) omitted.add('invalid-json-line');
  return { messages, omitted: [...omitted], line_count: lines.length, invalid_lines: invalidLines, provider };
}

function parseMarkdown(content) {
  const messages = [];
  const omitted = new Set();
  let role = null;
  let buffer = [];
  const flush = () => {
    const text = buffer.join('\n').trim();
    if (role && text) messages.push({ role, text });
    buffer = [];
  };
  const omittedRole = (value) => {
    const label = String(value || '').toLowerCase();
    if (label === '系统' || label === 'system') return 'system';
    if (label === '开发者' || label === 'developer') return 'developer';
    if (label === '工具' || label === 'tool') return 'tool';
    return 'unknown';
  };
  const roleFromLine = (line) => {
    const omittedHeading = line.match(/^\s*#{1,6}\s*(系统|system|开发者|developer|工具|tool)(?:\s*\((?:system|developer|tool)\))?\s*[:：]?\s*$/i);
    if (omittedHeading) return { omitted: omittedRole(omittedHeading[1]) };
    const heading = line.match(/^\s*#{1,6}\s*(用户|user|助手|assistant|AI|ai)(?:\s*\((?:user|assistant)\))?\s*[:：]?\s*$/i);
    if (heading) return normalizeRole(heading[1]);
    const omittedPrefix = line.match(/^\s*(?:\*\*)?\s*(系统|system|开发者|developer|工具|tool)(?:\s*\((?:system|developer|tool)\))?\s*(?:\*\*)?\s*[:：]/i);
    if (omittedPrefix) return { omitted: omittedRole(omittedPrefix[1]) };
    const prefix = line.match(/^\s*(?:\*\*)?\s*(用户|user|助手|assistant|AI|ai)(?:\s*\((?:user|assistant)\))?\s*(?:\*\*)?\s*[:：]\s*(.*)$/i);
    if (prefix) return { role: normalizeRole(prefix[1]), text: prefix[2] };
    return null;
  };
  for (const line of content.split(/\r?\n/)) {
    const detected = roleFromLine(line);
    if (detected && detected.omitted) {
      flush();
      role = null;
      omitted.add(detected.omitted);
      continue;
    }
    if (detected && typeof detected === 'string') {
      flush();
      role = detected;
      continue;
    }
    if (detected && typeof detected === 'object') {
      flush();
      role = detected.role;
      if (detected.text) buffer.push(detected.text);
      continue;
    }
    if (role) buffer.push(line);
  }
  flush();
  if (messages.length === 0 && content.trim()) omitted.add('unknown-markdown-structure');
  return { messages, omitted, line_count: content.split(/\r?\n/).length, invalid_lines: 0 };
}

function parseContent(content, filePath, provider) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.md' || extension === '.markdown' || extension === '.txt') {
    return parseMarkdown(content);
  }
  return parseJsonLines(content, provider);
}

function numberOption(value, name, fallback) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) fail(`--${name} 必须是正整数。`);
  return number;
}

function selectMessages(messages, options) {
  const from = numberOption(options.from, 'from', 1);
  const to = numberOption(options.to, 'to', messages.length || 1);
  if (to < from) fail('--to 不能小于 --from。');
  let selected = messages.map((message, index) => ({ ...message, index: index + 1 })).filter((message) => message.index >= from && message.index <= to);
  if (options.query) {
    const query = String(options.query);
    selected = selected.filter((message) => message.text.includes(query));
  }
  return { selected, from, to };
}

function sourceHash(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function packet(source, parsed, selected, options) {
  const omitted = new Set(parsed.omitted || []);
  const messages = selected.selected.map((message, index) => ({
    index: message.index || index + 1,
    role: message.role,
    text: message.text,
    ...(message.source_line ? { source_line: message.source_line } : {}),
  }));
  return {
    schema: 1,
    kind: 'session-packet',
    source: {
      provider: source.provider,
      session_id: source.sessionId || '',
      file: source.filePath,
      sha256: sourceHash(source.filePath),
      size: fs.statSync(source.filePath).size,
    },
    selection: {
      query: options.query || '',
      from: selected.from,
      to: selected.to,
      matched: messages.length,
    },
    coverage: {
      roles: ['user', 'assistant'],
      omitted: [...omitted],
      warnings: messages.length === 0 ? ['未找到可见 user/assistant 消息；请检查来源格式或扩大范围。'] : [],
      line_count: parsed.line_count,
      invalid_lines: parsed.invalid_lines,
    },
    messages,
  };
}

function markdownPacket(result) {
  const lines = [
    '# 会话包(Session Packet)',
    `- provider: ${result.source.provider}`,
    `- session_id: ${result.source.session_id || '未提供'}`,
    `- sha256: ${result.source.sha256}`,
    `- scope: ${result.selection.from}-${result.selection.to}${result.selection.query ? `，query=${result.selection.query}` : ''}`,
    `- matched: ${result.selection.matched}`,
    `- omitted: ${result.coverage.omitted.join(', ') || '无'}`,
    '',
  ];
  (result.messages || []).forEach((message) => {
    lines.push(`## ${message.role === 'user' ? '用户(user)' : 'AI(assistant)'} #${message.index}`);
    lines.push(message.text, '');
  });
  return lines.join('\n');
}

function main(argv) {
  const options = parseArgs(argv);
  if (!options) return;
  const source = resolveSource(options);
  const content = fs.readFileSync(source.filePath, 'utf8');
  const parsed = parseContent(content, source.filePath, source.provider);
  const selected = selectMessages(parsed.messages, options);
  const result = packet(source, parsed, selected, options);
  if (options.command === 'inspect') {
    delete result.messages;
  }
  process.stdout.write(options.format === 'markdown' ? `${markdownPacket(result)}\n` : `${JSON.stringify(result, null, 2)}\n`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`session-reader: ${error.message}\n`);
  process.exitCode = 1;
}
