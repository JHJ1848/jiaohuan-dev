#!/usr/bin/env node
/**
 * @file gotcha.js
 * @description Plugin 级内置记忆自迭代 CLI，支持项目级与全局级双层 JSONL 路由存储、检索与完整性校验。
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '../../../');
const PROJECT_GOTCHAS_PATH = path.join(ROOT_DIR, '.agents', 'gotchas.jsonl');
const LEGACY_GOTCHAS_PATH = path.join(ROOT_DIR, 'docs', 'gotchas.jsonl');
const GLOBAL_GOTCHAS_PATH = path.join(os.homedir(), '.agents', 'gotchas.jsonl');

const VALID_CATEGORIES = ['bugfix', 'dev', 'explore'];
const VALID_SCOPES = ['global', 'project'];
const REQUIRED_FIELDS = [
  'scope', 'category', 'title', 'scene', 'symptom',
  'misjudgment', 'root_cause_and_solution',
  'guidance_and_constraint', 'value_assessment'
];

/**
 * 解析命令行参数
 * @param {string[]} args 
 * @returns {Record<string, string>}
 */
function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--global' || arg === '-g') {
      parsed.scope = 'global';
    } else if (arg === '--project' || arg === '-p') {
      parsed.scope = 'project';
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        parsed[key] = next;
        i++;
      } else {
        parsed[key] = 'true';
      }
    }
  }
  return parsed;
}

/**
 * 根据 scope 解析目标存储路径
 * @param {string} scope 
 * @param {string} [customTarget] 
 * @returns {string}
 */
function resolveTargetPath(scope, customTarget) {
  if (customTarget) return path.resolve(process.cwd(), customTarget);
  if (scope === 'global') return GLOBAL_GOTCHAS_PATH;
  return PROJECT_GOTCHAS_PATH;
}

/**
 * 校验单条 Gotcha 记录合法性
 * @param {object} item 
 * @param {number} [lineNum] 
 * @returns {string[]}
 */
function validateEntry(item, lineNum = 0) {
  const errors = [];
  const prefix = lineNum > 0 ? `第 ${lineNum} 行: ` : '';

  for (const field of REQUIRED_FIELDS) {
    if (!item[field]) {
      // 兼容历史未打标 scope 的记录，容错推断
      if (field === 'scope') {
        item.scope = 'project';
      } else {
        errors.push(`${prefix}缺少必要字段 '${field}'`);
      }
    }
  }
  if (item.scope && !VALID_SCOPES.includes(item.scope)) {
    errors.push(`${prefix}scope '${item.scope}' 不合法，必须为: ${VALID_SCOPES.join(', ')}`);
  }
  if (item.category && !VALID_CATEGORIES.includes(item.category)) {
    errors.push(`${prefix}category '${item.category}' 不合法，必须为: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (item.guidance_and_constraint) {
    if (typeof item.guidance_and_constraint.guidance !== 'string' || !item.guidance_and_constraint.guidance.trim()) {
      errors.push(`${prefix}guidance_and_constraint.guidance 必须为非空字符串`);
    }
    if (typeof item.guidance_and_constraint.constraint !== 'string' || !item.guidance_and_constraint.constraint.trim()) {
      errors.push(`${prefix}guidance_and_constraint.constraint 必须为非空字符串`);
    }
  }
  if (item.value_assessment) {
    if (!['high', 'medium'].includes(item.value_assessment.level)) {
      errors.push(`${prefix}value_assessment.level 必须为 'high' 或 'medium'`);
    }
    if (typeof item.value_assessment.rationale !== 'string' || !item.value_assessment.rationale.trim()) {
      errors.push(`${prefix}value_assessment.rationale 必须为非空字符串`);
    }
  }
  return errors;
}

/**
 * 确保项目级文件就绪（若无则从旧路径平滑初始化并补充 scope 字段）
 */
function ensureProjectGotchasReady() {
  if (!fs.existsSync(PROJECT_GOTCHAS_PATH)) {
    let seedContent = '';
    if (fs.existsSync(LEGACY_GOTCHAS_PATH)) {
      const oldLines = fs.readFileSync(LEGACY_GOTCHAS_PATH, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
      seedContent = oldLines.map(l => {
        try {
          const parsed = JSON.parse(l);
          if (!parsed.scope) parsed.scope = 'project';
          return JSON.stringify(parsed);
        } catch {
          return l;
        }
      }).join('\n') + '\n';
    }
    fs.mkdirSync(path.dirname(PROJECT_GOTCHAS_PATH), { recursive: true });
    fs.writeFileSync(PROJECT_GOTCHAS_PATH, seedContent, 'utf8');
  }
}

/**
 * 校验目标 JSONL 文件
 * @param {string} targetPath 
 * @param {string} label 
 * @returns {number} 有效行数
 */
function validateFile(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    console.log(`[gotcha] [${label}] 存储文件不存在 (跳过): ${targetPath}`);
    return 0;
  }
  const content = fs.readFileSync(targetPath, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  let totalErrors = [];

  lines.forEach((line, idx) => {
    try {
      const item = JSON.parse(line);
      const errs = validateEntry(item, idx + 1);
      if (errs.length > 0) totalErrors.push(...errs);
    } catch (e) {
      totalErrors.push(`第 ${idx + 1} 行不是有效 JSON: ${e.message}`);
    }
  });

  if (totalErrors.length > 0) {
    console.error(`[gotcha] [${label}] 校验失败 (${totalErrors.length} 处错误):`);
    totalErrors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
  console.log(`[gotcha] [${label}] 校验通过: ${lines.length} 条规范记录 (${targetPath})`);
  return lines.length;
}

/**
 * 子命令: 校验文件
 */
function handleValidate(args) {
  ensureProjectGotchasReady();
  const scope = args.scope || 'all';
  let checked = 0;

  if (scope === 'project' || scope === 'all') {
    checked += validateFile(PROJECT_GOTCHAS_PATH, '项目级');
  }
  if (scope === 'global' || scope === 'all') {
    checked += validateFile(GLOBAL_GOTCHAS_PATH, '全局级');
  }
  // 兼顾校验 legacy 文件若存在
  if (fs.existsSync(LEGACY_GOTCHAS_PATH)) {
    validateFile(LEGACY_GOTCHAS_PATH, '兼容历史');
  }
  console.log(`[gotcha] 校验执行完毕，累计核验通过有效记录。`);
}

/**
 * 子命令: 追加记录
 */
function handleAppend(args) {
  ensureProjectGotchasReady();
  let entry = {};
  if (args.file) {
    const raw = fs.readFileSync(path.resolve(process.cwd(), args.file), 'utf8');
    entry = JSON.parse(raw);
  } else {
    entry = {
      scope: args.scope || (args.global ? 'global' : 'project'),
      category: args.category,
      title: args.title,
      scene: args.scene,
      symptom: args.symptom,
      misjudgment: args.misjudgment,
      root_cause_and_solution: args.solution || args.root_cause_and_solution,
      guidance_and_constraint: {
        guidance: args.guidance,
        constraint: args.constraint
      },
      value_assessment: {
        level: args.level || 'high',
        generality: args.scope === 'global' ? 'universal' : (args.generality || 'project_specific'),
        rationale: args.rationale || args.reason
      }
    };
  }

  // 默认路由判定
  if (!entry.scope) {
    entry.scope = args.scope || (entry.value_assessment?.generality === 'universal' ? 'global' : 'project');
  }

  const targetPath = resolveTargetPath(entry.scope, args.target);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

  if (!entry.id) {
    let count = 1;
    if (fs.existsSync(targetPath)) {
      const lines = fs.readFileSync(targetPath, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
      count = lines.length + 1;
    }
    entry.id = `gotcha-${dateStr}-${String(count).padStart(4, '0')}`;
  }
  if (!entry.timestamp) entry.timestamp = now.toISOString();

  const errors = validateEntry(entry);
  if (errors.length > 0) {
    console.error('[gotcha] 记录字段不合法:');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

  const jsonLine = JSON.stringify(entry) + '\n';
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.appendFileSync(targetPath, jsonLine, 'utf8');
  console.log(`[gotcha] 成功追加到 [${entry.scope.toUpperCase()}] 库 (${targetPath}): [${entry.id}] ${entry.title}`);
}

/**
 * 子命令: 检索列表
 */
function handleList(args) {
  ensureProjectGotchasReady();
  const scope = args.scope || 'all';
  const filterCat = args.category;
  const targets = [];

  if (scope === 'project' || scope === 'all') targets.push({ path: PROJECT_GOTCHAS_PATH, scope: 'project' });
  if (scope === 'global' || scope === 'all') targets.push({ path: GLOBAL_GOTCHAS_PATH, scope: 'global' });

  console.log(`=== Gotchas 经验列表 (Scope: ${scope}, Category: ${filterCat || 'all'}) ===\n`);
  let matched = 0;

  for (const t of targets) {
    if (!fs.existsSync(t.path)) continue;
    const lines = fs.readFileSync(t.path, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
    lines.forEach(line => {
      try {
        const item = JSON.parse(line);
        if (!filterCat || item.category === filterCat) {
          matched++;
          console.log(`[${t.scope.toUpperCase()}] [${item.id}] [${item.category}] ${item.title}`);
          console.log(`  * 场景: ${item.scene}`);
          console.log(`  * 根因与解法: ${item.root_cause_and_solution}`);
          console.log(`  * 引导: ${item.guidance_and_constraint?.guidance}`);
          console.log(`  * 硬约束: ${item.guidance_and_constraint?.constraint}`);
          console.log(`  * 价值与通用性: [${item.value_assessment?.level}] [${item.value_assessment?.generality || item.scope}] ${item.value_assessment?.rationale}\n`);
        }
      } catch {}
    });
  }
  console.log(`共检索到 ${matched} 条记录。`);
}

// 主入口分发
const command = process.argv[2];
const parsedArgs = parseArgs(process.argv.slice(3));

switch (command) {
  case 'append':
    handleAppend(parsedArgs);
    break;
  case 'list':
    handleList(parsedArgs);
    break;
  case 'validate':
    handleValidate(parsedArgs);
    break;
  default:
    console.log(`用法: node gotcha.js <append|list|validate> [options]
  append   追加记录 (--scope <project|global> --category <bugfix|dev|explore> --title <str> ...)
  list     列出记录 (--scope <project|global|all> --category <bugfix|dev|explore>)
  validate 校验完整性 (--scope <project|global|all>)`);
    break;
}
