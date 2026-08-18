'use strict';

const { VALUE_LEVELS, VALIDITY_VALUES, TOPICS_INDEX_START, TOPICS_INDEX_END, CHANGE_INDEX_START, CHANGE_INDEX_END, FEATURES_INDEX_START, FEATURES_INDEX_END } = require('./constants');
const { fail } = require('./errors');
const { fs, path, readText, writeTextAtomic, existingFile, toProjectPath, relativeFromFile, ensureSafeDirectory, assertSafeDocsTarget, assertSafeExistingDirectory, assertSafeProjectFile } = require('./filesystem');
const { ensureFramework, frameworkIsWritable, ensureMainMemoryStructure, markerBody, replaceMarkerBlock } = require('./framework');
const { parseIndexEntries } = require('./retrieval');
const { safeTaskId, taskDirectory, taskPathForManagedFile, readTaskManifest, readTaskPath, refreshTaskManifest } = require('./tasks');
const { assertNoSecrets } = require('./secret-inspection');
const { parseHeadings } = require('./markdown-outline');

function ensureTopicStructure(content, topicName) {
  const base = content.length > 0 ? content : `# ${topicName}\n`;
  if (markerBody(base, FEATURES_INDEX_START, FEATURES_INDEX_END) !== null) {
    return base;
  }
  const suffix = base.length === 0 ? '' : (base.endsWith('\n') ? '\n' : '\n\n');
  return `${base}${suffix}## 功能与场景\n\n${FEATURES_INDEX_START}\n${FEATURES_INDEX_END}\n`;
}

function compactText(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function markdownLabel(value) {
  return String(value).replace(/[\[\]]/g, '\\$&');
}

function indexDescription(value) {
  const compact = compactText(value);
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function upsertIndexEntry(content, start, end, label, href, description) {
  const current = parseIndexEntries(content, start, end);
  const entry = `- [${markdownLabel(label)}](${href}) - ${indexDescription(description)}`;
  const kept = current.filter((item) => item.href !== href).map((item) => item.raw);
  kept.push(entry);
  return replaceMarkerBlock(content, start, end, kept);
}

function writeTopicDocument(projectRoot, topicPath, topicName) {
  assertSafeDocsTarget(projectRoot, topicPath, false);
  const current = existingFile(topicPath) ? readText(topicPath) : '';
  const next = ensureTopicStructure(current, topicName);
  if (next !== current) {
    ensureSafeDirectory(projectRoot, path.dirname(topicPath));
    assertSafeDocsTarget(projectRoot, topicPath, false);
    writeTextAtomic(topicPath, next);
  }
}

function updateIndexes(projectRoot, framework, target, classification, title, summary) {
  const memoryPath = path.resolve(projectRoot, framework.memory);
  if (classification.kind === 'change') {
    let memoryContent = ensureMainMemoryStructure(readText(memoryPath), memoryPath, path.join(projectRoot, 'AGENTS.md'));
    memoryContent = upsertIndexEntry(memoryContent, CHANGE_INDEX_START, CHANGE_INDEX_END, title, relativeFromFile(memoryPath, target), summary);
    assertSafeProjectFile(projectRoot, memoryPath, true);
    writeTextAtomic(memoryPath, memoryContent);
    return { main: toProjectPath(projectRoot, memoryPath), topic: null };
  }
  writeTopicDocument(projectRoot, classification.topicPath, classification.topicName);
  if (classification.kind === 'feature') {
    let topicContent = readText(classification.topicPath);
    topicContent = upsertIndexEntry(topicContent, FEATURES_INDEX_START, FEATURES_INDEX_END, title, relativeFromFile(classification.topicPath, target), summary);
    assertSafeDocsTarget(projectRoot, classification.topicPath, true);
    writeTextAtomic(classification.topicPath, topicContent);
  }
  let memoryContent = ensureMainMemoryStructure(readText(memoryPath), memoryPath, path.join(projectRoot, 'AGENTS.md'));
  memoryContent = upsertIndexEntry(memoryContent, TOPICS_INDEX_START, TOPICS_INDEX_END, classification.topicName, relativeFromFile(memoryPath, classification.topicPath), summary);
  assertSafeProjectFile(projectRoot, memoryPath, true);
  writeTextAtomic(memoryPath, memoryContent);
  return { main: toProjectPath(projectRoot, memoryPath), topic: toProjectPath(projectRoot, classification.topicPath) };
}

function sceneContainsSummary(scene, summary) {
  return scene.split(/\r?\n/).some((line) => {
    const match = line.match(/^- (?:摘要|Summary):\s*(.*)$/);
    return match && compactText(match[1]) === summary;
  });
}

function lineStartOffset(content, lineNumber) {
  let offset = 0;
  for (let line = 1; line < lineNumber; line += 1) {
    const next = content.indexOf('\n', offset);
    if (next === -1) {
      return content.length;
    }
    offset = next + 1;
  }
  return offset;
}

function sceneRange(content, title) {
  const headings = parseHeadings(content);
  const index = headings.findIndex((heading) => heading.level === 3 && heading.title === title);
  if (index === -1) {
    return null;
  }
  const current = headings[index];
  const following = headings.slice(index + 1).find((heading) => heading.level <= 3);
  return {
    start: lineStartOffset(content, current.line),
    end: following ? lineStartOffset(content, following.line) : content.length,
  };
}

function appendSceneRecord(content, title, summary, record, replace) {
  const range = sceneRange(content, title);
  if (!range) {
    const prefix = content.length === 0 || content.endsWith('\n') ? content : `${content}\n`;
    return { content: `${prefix}${prefix.length > 0 ? '\n' : ''}${record}\n`, action: 'appended' };
  }
  const existingScene = content.slice(range.start, range.end);
  if (sceneContainsSummary(existingScene, summary)) {
    return { content, action: 'duplicate' };
  }
  if (!replace) {
    return { content, action: 'requires_replace_confirmation' };
  }
  const before = content.slice(0, range.start);
  const after = content.slice(range.end);
  const separatorAfter = after.length === 0 || after.startsWith('\n') ? '' : '\n';
  return { content: `${before}${record}\n${separatorAfter}${after}`, action: 'replaced' };
}

function sourceFilesForTask(projectRoot, taskId) {
  if (!taskId) {
    fail('正式归档必须提供 --task <主任务id>，以关联临时证据。');
  }
  const directory = taskDirectory(projectRoot, taskId);
  if (!fs.existsSync(directory)) {
    fail(`未找到主任务临时目录：${taskId}。请先通过 temp 或 draft 记录证据。`);
  }
  refreshTaskManifest(projectRoot, taskId);
  const manifest = readTaskManifest(projectRoot, taskId);
  if (!manifest) {
    fail(`主任务 ${taskId} 缺少有效 task.json，拒绝脱离临时证据正式归档。`);
  }
  assertSafeExistingDirectory(projectRoot, directory);
  return manifest.managed_files.filter((fileName) => fileName !== 'task.json').filter((fileName) => existingFile(taskPathForManagedFile(directory, fileName))).filter((fileName) => {
    try {
      assertSafeProjectFile(projectRoot, taskPathForManagedFile(directory, fileName), true);
      return true;
    } catch (error) {
      return false;
    }
  }).map((fileName) => toProjectPath(projectRoot, taskPathForManagedFile(directory, fileName))).sort();
}

function valueAssessment(options) {
  if (!options.value) {
    return { archive: false, status: 'requires_value_assessment' };
  }
  if (!VALUE_LEVELS.has(options.value)) {
    fail('--value 只能是 high、medium 或 low。');
  }
  if (options.value === 'low') {
    return { archive: false, status: 'not_archived_low_value', value: options.value, reason: compactText(options.assessment || '') };
  }
  return { archive: true, value: options.value, reason: compactText(options.assessment || '') };
}

function resolveFormalTarget(projectRoot, options) {
  if (options.target) {
    return assertSafeDocsTarget(projectRoot, path.resolve(projectRoot, options.target), false);
  }
  if (options.topic) {
    const topic = String(options.topic).trim();
    const feature = options.feature ? String(options.feature).trim() : null;
    if (!/^[^\\/:*?"<>|.][^\\/:*?"<>|]{0,119}$/.test(topic) || (feature && !/^[^\\/:*?"<>|.][^\\/:*?"<>|]{0,119}$/.test(feature))) {
      fail('专题和功能名称不能包含路径分隔符、保留文件名字符或前导点。');
    }
    const target = feature ? path.join(projectRoot, 'docs', 'memory', topic, `${feature}.md`) : path.join(projectRoot, 'docs', 'memory', `${topic}.md`);
    return assertSafeDocsTarget(projectRoot, target, false);
  }
  fail('正式归档需要 `docs/` 下的 --target；建议使用 docs/memory/<专题>.md 或 docs/memory/<专题>/<功能>.md。');
}

function classifyFormalTarget(projectRoot, target) {
  const docsPath = path.join(projectRoot, 'docs');
  const segments = toProjectPath(docsPath, target).split('/');
  if (segments[0] === 'memory' && segments.length === 2 && segments[1].toLowerCase().endsWith('.md')) {
    return { kind: 'topic', topicPath: target, topicName: path.basename(target, '.md') };
  }
  if (segments[0] === 'memory' && segments.length === 3 && segments[2].toLowerCase().endsWith('.md')) {
    return { kind: 'feature', topicPath: path.join(docsPath, 'memory', `${segments[1]}.md`), topicName: segments[1], featureName: path.basename(segments[2], '.md') };
  }
  if (segments[0] === 'change' && segments.length === 2 && segments[1].toLowerCase().endsWith('.md')) {
    return { kind: 'change' };
  }
  fail('正式归档目标只能是 docs/memory/<专题>.md、docs/memory/<专题>/<功能>.md 或 docs/change/<记录>.md。');
}

function replacementChangeRecord(projectRoot, options) {
  if (!options['change-record']) {
    fail('覆盖场景必须提供既有 docs/change/ 记录：--change-record docs/change/<记录>.md。');
  }
  const target = assertSafeDocsTarget(projectRoot, path.resolve(projectRoot, options['change-record']), true);
  if (classifyFormalTarget(projectRoot, target).kind !== 'change') {
    fail('--change-record 必须指向 docs/change/ 下的既有 Markdown 记录。');
  }
  return target;
}

function normalizeHeading(value, label) {
  const normalized = String(value || '').replace(/[\r\n]+/g, ' ').trim();
  if (!normalized) {
    fail(`必须提供 ${label}。`);
  }
  return normalized;
}

function controlledField(value, fallback) {
  const compact = compactText(value);
  return compact || fallback;
}

function controlledDate(value, label) {
  if (!value) {
    return '未注明';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(`${label} 必须使用 YYYY-MM-DD。`);
  }
  return value;
}

function controlledReferences(projectRoot, recordPath, value, label, multiple) {
  if (!value) {
    return '无';
  }
  const values = String(value).split(',').map((item) => item.trim()).filter(Boolean);
  if (values.length === 0 || (!multiple && values.length !== 1)) {
    fail(`${label} 必须包含${multiple ? '一个或多个引用' : '一个引用'}。`);
  }
  return values.map((item) => {
    const separator = item.indexOf('|');
    const text = separator === -1 ? '' : item.slice(0, separator).trim();
    const targetText = (separator === -1 ? item : item.slice(separator + 1)).trim();
    const target = assertSafeDocsTarget(projectRoot, path.resolve(projectRoot, targetText), false);
    const display = text || path.basename(target, '.md');
    if (!display || /[\r\n\[\]]/.test(display)) {
      fail(`${label} 包含无效的引用标签。`);
    }
    return `[${markdownLabel(display)}](${relativeFromFile(recordPath, target)})`;
  }).join(', ');
}

function shortenPathText(value, limit) {
  const text = compactText(value);
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

function pathMemoryInfo(pathRecord) {
  if (!pathRecord || pathRecord.nodes.length === 0) {
    return { summary: '无', keywords: '无', facts: '' };
  }
  const parents = new Set(pathRecord.nodes.map((node) => node.parent).filter(Boolean));
  const selected = [];
  const seen = new Set();
  const select = (node) => {
    if (!seen.has(node.id) && selected.length < 6) {
      seen.add(node.id);
      selected.push(node);
    }
  };
  for (const node of pathRecord.nodes) {
    if (!parents.has(node.id) && (node.status === '已证实' || node.status === '已实施')) {
      select(node);
    }
  }
  for (const node of pathRecord.nodes) {
    if (node.status === '已排除' && node.conclusion) {
      select(node);
    }
  }
  if (selected.length === 0) {
    return { summary: '无', keywords: '无', facts: '' };
  }
  const describe = (node) => `${node.id} ${node.summary} [${node.status}]${node.conclusion ? `：${shortenPathText(node.conclusion, 80)}` : ''}`;
  const summary = shortenPathText(selected.map(describe).join('；'), 360);
  const keywords = shortenPathText(selected.map((node) => `${node.summary}${node.conclusion ? ` ${node.conclusion}` : ''}`).join('；'), 240);
  return { summary, keywords, facts: `- 排查路径: ${summary}` };
}

function formalTextFields(options) {
  return [
    { label: '标题', value: options.title },
    { label: '摘要', value: options.summary || options.text },
    { label: '价值评估说明', value: options.assessment },
    { label: '场景与目标', value: options.goal },
    { label: '已证实事实与证据', value: options.facts },
    { label: '处理与决策', value: options.decision },
    { label: '结果与验证', value: options.result },
    { label: '边界与未知', value: options.boundary },
    { label: '陷阱(Gotcha)', value: options.gotcha },
  ];
}

function sceneRecord(projectRoot, target, options, title, summary, assessment, sourceFiles, pathInfo, changeRecord) {
  const validity = options.validity || 'active';
  if (!VALIDITY_VALUES.has(validity)) {
    fail('--validity 只能是 active、superseded、historical 或 needs-review。');
  }
  const goal = controlledField(options.goal, summary);
  const facts = controlledField(options.facts, '未记录已证实事实。');
  const factsWithPath = pathInfo.facts ? `${facts}\n\n${pathInfo.facts}` : facts;
  const decision = controlledField(options.decision, '未记录独立决策。');
  const result = controlledField(options.result, summary);
  const boundary = controlledField(options.boundary, '范围仅限于已归档的任务证据。');
  const gotcha = controlledField(options.gotcha, '无。');
  const authorization = options.explicit ? '调用方提供 --explicit；运行时不验证用户意图' : '调用方提供 --confirmed；运行时不验证用户确认';
  return [
    `### ${title}`,
    '',
    `- 摘要: ${summary}`,
    `- 价值评估: ${assessment.value}${assessment.reason ? ` - ${assessment.reason}` : ''}`,
    `- 有效性: ${validity}`,
    `- 最近核验: ${controlledDate(options['last-verified'], '--last-verified')}`,
    `- 复核日期: ${controlledDate(options['review-after'], '--review-after')}`,
    `- 替代关系: ${controlledReferences(projectRoot, target, options['superseded-by'], '--superseded-by', false)}`,
    `- 关联记录: ${controlledReferences(projectRoot, target, options.related, '--related', true)}`,
    `- 替代变更: ${changeRecord ? `[${markdownLabel(path.basename(changeRecord, '.md'))}](${relativeFromFile(target, changeRecord)})` : '无'}`,
    `- 依赖记录: ${controlledReferences(projectRoot, target, options['depends-on'], '--depends-on', true)}`,
    `- 证据草稿: ${sourceFiles.length > 0 ? sourceFiles.join(', ') : '无'}`,
    `- 路径摘要: ${pathInfo.summary}`,
    `- 检索词: ${pathInfo.keywords}`,
    `- 归档授权: ${authorization}。`,
    '',
    '#### 场景与目标',
    '',
    goal,
    '',
    '#### 已证实事实与证据',
    '',
    factsWithPath,
    '',
    '#### 处理与决策',
    '',
    decision,
    '',
    '#### 结果与验证',
    '',
    result,
    '',
    '#### 边界与未知',
    '',
    boundary,
    '',
    '#### 陷阱(Gotcha)',
    '',
    gotcha,
  ].join('\n');
}

function appendFormalRecord(projectRoot, options) {
  const framework = ensureFramework(projectRoot, options);
  if (!frameworkIsWritable(framework)) {
    return framework;
  }
  if (!options.explicit && !options.confirmed) {
    return { status: 'requires_archive_confirmation', task: options.task || null };
  }
  const assessment = valueAssessment(options);
  if (!assessment.archive) {
    const taskId = options.task ? safeTaskId(options.task) : null;
    return { ...assessment, task: taskId };
  }
  const title = normalizeHeading(options.title, '--title');
  const summary = compactText(options.summary || options.text);
  if (!summary) {
    fail('必须提供 --summary（或 --text）。');
  }
  const taskId = options.task ? safeTaskId(options.task) : null;
  const sourceFiles = sourceFilesForTask(projectRoot, taskId);
  if (sourceFiles.length === 0) {
    fail(`主任务 ${taskId} 没有受管临时证据，拒绝正式归档。`);
  }
  assertNoSecrets(projectRoot, formalTextFields(options), sourceFiles);
  const pathInfo = pathMemoryInfo(readTaskPath(projectRoot, taskId));
  const target = resolveFormalTarget(projectRoot, options);
  const classification = classifyFormalTarget(projectRoot, target);
  let record = sceneRecord(projectRoot, target, options, title, summary, assessment, sourceFiles, pathInfo, null);
  ensureSafeDirectory(projectRoot, path.dirname(target));
  const current = existingFile(target) ? readText(target) : `# ${path.basename(target, '.md')}\n`;
  const next = appendSceneRecord(current, title, summary, record, options.replace === true);
  if (next.action === 'duplicate') {
    const indexes = updateIndexes(projectRoot, framework, target, classification, title, summary);
    return { status: 'duplicate', target: toProjectPath(projectRoot, target), task: taskId, assessment: { value: assessment.value, reason: assessment.reason }, path_summary: pathInfo.summary, indexes };
  }
  if (next.action === 'requires_replace_confirmation') {
    return { status: 'requires_replace_confirmation', target: toProjectPath(projectRoot, target), task: taskId, assessment: { value: assessment.value, reason: assessment.reason }, hint: '同标题场景摘要已变化；核对历史变更后使用 --replace 覆盖，或改用新标题并关联替代记录。' };
  }
  if (next.action === 'replaced') {
    const changeRecord = replacementChangeRecord(projectRoot, options);
    record = sceneRecord(projectRoot, target, options, title, summary, assessment, sourceFiles, pathInfo, changeRecord);
    next.content = appendSceneRecord(current, title, summary, record, true).content;
  }
  assertSafeDocsTarget(projectRoot, target, false);
  writeTextAtomic(target, next.content);
  const indexes = updateIndexes(projectRoot, framework, target, classification, title, summary);
  return { status: 'archived', action: next.action, target: toProjectPath(projectRoot, target), task: taskId, assessment: { value: assessment.value, reason: assessment.reason }, path_summary: pathInfo.summary, indexes };
}

module.exports = { appendFormalRecord };
