'use strict';

const { TOPICS_INDEX_START, TOPICS_INDEX_END, FEATURES_INDEX_START, FEATURES_INDEX_END, CHANGE_INDEX_START, CHANGE_INDEX_END } = require('./constants');
const { fail } = require('./errors');
const { path, readText, existingFile, samePath, isInside, toProjectPath, assertSafeDocsTarget, assertSafeProjectFile } = require('./filesystem');
const { markerBody, ensureFramework, frameworkIsReadable, readPolicy } = require('./framework');
const { safeTaskId } = require('./tasks');
const { parseHeadings } = require('./markdown-outline');

function parseIndexEntries(content, start, end) {
  const body = markerBody(content, start, end);
  if (body === null || body.trim() === '') {
    return [];
  }
  return body.split(/\r?\n/).map((line) => {
    const match = line.match(/^\s*-\s+\[([^\]]+)\]\(([^)]+)\)(?:\s+-\s+(.*))?\s*$/);
    if (!match) {
      return null;
    }
    return { label: match[1], href: match[2], description: match[3] || '', raw: line };
  }).filter(Boolean);
}

function documentSearchText(content) {
  const headings = parseHeadings(content).map((heading) => heading.title);
  const metadata = content.split(/\r?\n/).filter((line) => /(?:摘要|summary|检索词|关键词|路径摘要|path\s*summary|keywords)\s*[:：]/i.test(line));
  return [...headings, ...metadata].join(' ');
}

function indexEntryMatches(entry, terms, extra = '') {
  if (terms.length === 0) {
    return false;
  }
  const haystack = `${entry.label} ${entry.href} ${entry.description} ${extra}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function resolveIndexedDocument(projectRoot, ownerFile, href) {
  if (href.includes('://') || href.startsWith('#')) {
    return null;
  }
  const candidate = path.resolve(path.dirname(ownerFile), href);
  if (!isInside(projectRoot, candidate) || path.extname(candidate).toLowerCase() !== '.md' || !existingFile(candidate)) {
    return null;
  }
  try {
    assertSafeProjectFile(projectRoot, candidate, true);
    return candidate;
  } catch (error) {
    return null;
  }
}

function isControlledMemoryDocument(projectRoot, memoryPath, target) {
  if (samePath(memoryPath, target)) {
    return true;
  }
  const mainContent = readText(memoryPath);
  for (const topic of parseIndexEntries(mainContent, TOPICS_INDEX_START, TOPICS_INDEX_END)) {
    const topicPath = resolveIndexedDocument(projectRoot, memoryPath, topic.href);
    if (!topicPath) {
      continue;
    }
    if (samePath(topicPath, target)) {
      return true;
    }
    for (const feature of parseIndexEntries(readText(topicPath), FEATURES_INDEX_START, FEATURES_INDEX_END)) {
      const featurePath = resolveIndexedDocument(projectRoot, topicPath, feature.href);
      if (featurePath && samePath(featurePath, target)) {
        return true;
      }
    }
  }
  for (const change of parseIndexEntries(mainContent, CHANGE_INDEX_START, CHANGE_INDEX_END)) {
    const changePath = resolveIndexedDocument(projectRoot, memoryPath, change.href);
    if (changePath && samePath(changePath, target)) {
      return true;
    }
  }
  return false;
}

function makeReceipt(options) {
  const stem = options.task ? String(options.task) : 'context';
  const safeStem = stem.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80) || 'context';
  return `memory-get:${safeStem}:${Date.now()}`;
}

function receiptMatchesTask(receipt, taskId) {
  if (typeof receipt !== 'string' || !receipt.startsWith('memory-get:')) {
    return false;
  }
  if (!taskId) {
    return true;
  }
  return receipt.startsWith(`memory-get:${safeTaskId(taskId)}:`);
}

function queryTerms(options) {
  return (options.query || '').split(',').map((term) => term.trim().toLowerCase()).filter(Boolean);
}

function addTreeFeature(topic, feature, featurePath, projectRoot) {
  const key = toProjectPath(projectRoot, featurePath);
  if (!topic.featurePaths.has(key)) {
    topic.featurePaths.add(key);
    topic.features.push({ entry: feature, path: featurePath });
  }
}

function addTreeTopic(topics, topicEntries, topic, topicPath, projectRoot) {
  const key = toProjectPath(projectRoot, topicPath);
  if (!topics.has(key)) {
    const selected = { entry: topic, path: topicPath, features: [], featurePaths: new Set() };
    topics.set(key, selected);
    topicEntries.push(selected);
  }
  return topics.get(key);
}

function documentNode(kind, entry, documentPath, projectRoot, children) {
  return {
    kind,
    label: entry.label,
    path: toProjectPath(projectRoot, documentPath),
    description: entry.description,
    content: readText(documentPath),
    children,
  };
}

function buildMemoryTree(projectRoot, memoryPath, terms) {
  const mainContent = readText(memoryPath);
  const topics = new Map();
  const topicEntries = [];
  const changes = new Map();
  const changeEntries = [];

  for (const topic of parseIndexEntries(mainContent, TOPICS_INDEX_START, TOPICS_INDEX_END)) {
    const topicPath = resolveIndexedDocument(projectRoot, memoryPath, topic.href);
    if (!topicPath) {
      continue;
    }
    const topicContent = readText(topicPath);
    const topicMatches = indexEntryMatches(topic, terms, documentSearchText(topicContent));
    const featureEntries = parseIndexEntries(topicContent, FEATURES_INDEX_START, FEATURES_INDEX_END);
    if (topicMatches) {
      const selectedTopic = addTreeTopic(topics, topicEntries, topic, topicPath, projectRoot);
      for (const feature of featureEntries) {
        const featurePath = resolveIndexedDocument(projectRoot, topicPath, feature.href);
        if (featurePath) {
          addTreeFeature(selectedTopic, feature, featurePath, projectRoot);
        }
      }
      continue;
    }
    for (const feature of featureEntries) {
      const featurePath = resolveIndexedDocument(projectRoot, topicPath, feature.href);
      const featureContent = featurePath ? readText(featurePath) : '';
      if (!indexEntryMatches(feature, terms, documentSearchText(featureContent))) {
        continue;
      }
      if (featurePath) {
        const selectedTopic = addTreeTopic(topics, topicEntries, topic, topicPath, projectRoot);
        addTreeFeature(selectedTopic, feature, featurePath, projectRoot);
      }
    }
  }

  for (const change of parseIndexEntries(mainContent, CHANGE_INDEX_START, CHANGE_INDEX_END)) {
    const changePath = resolveIndexedDocument(projectRoot, memoryPath, change.href);
    const changeContent = changePath ? readText(changePath) : '';
    if (!changePath || !indexEntryMatches(change, terms, documentSearchText(changeContent))) {
      continue;
    }
    const key = toProjectPath(projectRoot, changePath);
    if (!changes.has(key)) {
      const selectedChange = { entry: change, path: changePath };
      changes.set(key, selectedChange);
      changeEntries.push(selectedChange);
    }
  }

  return {
    kind: 'memory',
    label: '项目记忆',
    path: toProjectPath(projectRoot, memoryPath),
    content: mainContent,
    children: [
      ...topicEntries.map((topic) => documentNode(
        'topic',
        topic.entry,
        topic.path,
        projectRoot,
        topic.features.map((feature) => documentNode('feature', feature.entry, feature.path, projectRoot, [])),
      )),
      ...changeEntries.map((change) => documentNode('change', change.entry, change.path, projectRoot, [])),
    ],
  };
}

function retrieve(projectRoot, options) {
  const terms = queryTerms(options);
  const framework = ensureFramework(projectRoot, options);
  if (!frameworkIsReadable(framework)) {
    return framework;
  }
  if (options.tree && options.target) {
    fail('get --tree 不能与 --target 同用；请用 --query 选择已索引的记忆分支。');
  }
  if (options.tree && terms.length === 0) {
    fail('get --tree 必须提供非空的 --query。');
  }
  const memoryPath = path.resolve(projectRoot, framework.memory);
  const { policy } = readPolicy(projectRoot);
  if (policy.memory_get_mode === 'do_not_get' && !options.force) {
    return { status: 'skipped', reason: 'do_not_get', memory: toProjectPath(projectRoot, memoryPath) };
  }
  const manuallyRequested = options.manual || options.tree;
  if (policy.memory_get_mode === 'manually' && !options.force && !manuallyRequested) {
    return { status: 'skipped', reason: 'manually', memory: toProjectPath(projectRoot, memoryPath) };
  }
  if (policy.memory_get_mode === 'only_once' && receiptMatchesTask(options.receipt, options.task)) {
    return { status: 'skipped', reason: 'only_once_receipt', receipt_scope: 'current_context_hint', memory: toProjectPath(projectRoot, memoryPath), receipt: options.receipt };
  }

  const selected = [memoryPath];
  const matchedIndexes = [];
  if (options.target) {
    const candidate = path.resolve(projectRoot, options.target);
    const target = samePath(candidate, memoryPath)
      ? assertSafeProjectFile(projectRoot, candidate, true)
      : assertSafeDocsTarget(projectRoot, candidate, true);
    if (!samePath(target, memoryPath)) {
      if (!isControlledMemoryDocument(projectRoot, memoryPath, target)) {
        fail('get --target 只能选择主记忆或已登记索引的 docs/ 文档。');
      }
      selected.push(target);
    }
  } else if (framework.status !== 'kept_legacy_memory' && terms.length > 0) {
    const mainContent = readText(memoryPath);
    const selectedTopicPaths = new Set();
    for (const topic of parseIndexEntries(mainContent, TOPICS_INDEX_START, TOPICS_INDEX_END)) {
      const topicPath = resolveIndexedDocument(projectRoot, memoryPath, topic.href);
      if (!topicPath) {
        continue;
      }
      const topicContent = readText(topicPath);
      const topicMatches = indexEntryMatches(topic, terms, documentSearchText(topicContent));
      if (topicMatches) {
        selected.push(topicPath);
        selectedTopicPaths.add(topicPath);
        matchedIndexes.push(toProjectPath(projectRoot, topicPath));
      }
      for (const feature of parseIndexEntries(topicContent, FEATURES_INDEX_START, FEATURES_INDEX_END)) {
        const featurePath = resolveIndexedDocument(projectRoot, topicPath, feature.href);
        const featureContent = featurePath ? readText(featurePath) : '';
        if (!indexEntryMatches(feature, terms, documentSearchText(featureContent))) continue;
        if (!selectedTopicPaths.has(topicPath)) {
          selected.push(topicPath);
          selectedTopicPaths.add(topicPath);
          matchedIndexes.push(toProjectPath(projectRoot, topicPath));
        }
        if (featurePath) {
          selected.push(featurePath);
          matchedIndexes.push(toProjectPath(projectRoot, featurePath));
        }
      }
    }
    for (const change of parseIndexEntries(mainContent, CHANGE_INDEX_START, CHANGE_INDEX_END)) {
      const changePath = resolveIndexedDocument(projectRoot, memoryPath, change.href);
      const changeContent = changePath ? readText(changePath) : '';
      if (!indexEntryMatches(change, terms, documentSearchText(changeContent))) {
        continue;
      }
      if (changePath) {
        selected.push(changePath);
        matchedIndexes.push(toProjectPath(projectRoot, changePath));
      }
    }
  }

  const documents = [];
  const seen = new Set();
  for (const filePath of selected) {
    const key = process.platform === 'win32' ? filePath.toLowerCase() : filePath;
    if (!seen.has(key)) {
      seen.add(key);
      documents.push({ path: toProjectPath(projectRoot, filePath), content: readText(filePath) });
    }
  }
  const result = {
    status: 'retrieved',
    memory: toProjectPath(projectRoot, memoryPath),
    policy: policy.memory_get_mode,
    receipt: makeReceipt(options),
    receipt_scope: 'current_context_hint',
    files: documents.map((document) => document.path),
    matched_indexes: matchedIndexes,
    unresolved_terms: terms.length > 0 && matchedIndexes.length === 0 ? terms : [],
  };
  if (options.tree) {
    result.memory_tree = buildMemoryTree(projectRoot, memoryPath, terms);
  } else {
    result.documents = documents;
  }
  return result;
}

module.exports = { parseIndexEntries, retrieve };
