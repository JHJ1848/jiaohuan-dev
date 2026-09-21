/**
 * [Workflow Runtime] Confirmation Receipt Generator & Verifier
 * 
 * 轻量级用户确认收据 (Confirmation Receipt) 签发与强校验门禁。
 * 防止模型自我授权、越权写文件与篡改执行范围。
 * 纯原生 CommonJS，零外部依赖。
 */

const crypto = require('crypto');
const path = require('path');

const SECRET_SALT = 'jiaohuan-dev-workflow-receipt-salt-2026';

const WRITE_ACTIONS = new Set([
  'write_to_file',
  'replace_file_content',
  'multi_replace_file_content',
  'create_file',
  'edit_file',
  'delete_file',
  'write',
  'edit',
  'multiedit'
]);

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

function isPathCoveredByScope(targetPath, scopePatterns, projectRoot = process.cwd()) {
  if (!targetPath) return false;
  if (!Array.isArray(scopePatterns) || scopePatterns.length === 0) return false;

  const normTarget = normalizePath(path.isAbsolute(targetPath) ? targetPath : path.resolve(projectRoot, targetPath));

  for (const pattern of scopePatterns) {
    if (pattern === '*') return true;
    let clean = pattern;
    if (clean.endsWith('/**')) clean = clean.slice(0, -3);
    else if (clean.endsWith('/*')) clean = clean.slice(0, -2);

    const absScope = normalizePath(path.isAbsolute(clean) ? clean : path.resolve(projectRoot, clean));
    if (isPathInside(normTarget, absScope)) return true;
  }
  return false;
}

function calculateSignature(receiptId, taskId, scope, planHash, expiresAt) {
  const scopeStr = typeof scope === 'string' ? scope : JSON.stringify(scope);
  const content = `${receiptId}:${taskId}:${scopeStr}:${planHash}:${expiresAt}:${SECRET_SALT}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * 签发不可伪造的确认收据
 * @param {Object} options
 * @param {string} options.task_id 任务 ID
 * @param {Object|string[]} options.scope 授权范围 { read: [], write: [] } 或 string[]
 * @param {string} [options.plan_hash] 方案 Hash (缺省自动计算)
 * @param {number} [options.ttl_ms=300000] 有效期 (毫秒，默认 5 分钟)
 * @returns {Object} Receipt 收据对象
 */
function issueReceipt(options = {}) {
  if (!options.task_id || typeof options.task_id !== 'string') {
    throw new Error('[ConfirmationReceipt] task_id 必须为非空字符串');
  }
  if (!options.scope) {
    throw new Error('[ConfirmationReceipt] scope 不能为空');
  }

  const taskId = options.task_id.trim();
  const ttl = typeof options.ttl_ms === 'number' && options.ttl_ms > 0 ? options.ttl_ms : 300000;
  const now = Date.now();
  const issuedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + ttl).toISOString();

  let normalizedScope;
  if (Array.isArray(options.scope)) {
    normalizedScope = {
      read: [],
      write: options.scope.map(s => String(s).trim())
    };
  } else if (typeof options.scope === 'object') {
    normalizedScope = {
      read: Array.isArray(options.scope.read) ? options.scope.read.map(s => String(s).trim()) : [],
      write: Array.isArray(options.scope.write) ? options.scope.write.map(s => String(s).trim()) : []
    };
  } else {
    throw new Error('[ConfirmationReceipt] scope 格式不合法');
  }

  const planHash = options.plan_hash || crypto.createHash('sha256')
    .update(`${taskId}:${JSON.stringify(normalizedScope)}`)
    .digest('hex');

  const receiptId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `rcpt-${now}-${Math.random().toString(16).slice(2, 10)}`;

  const signature = calculateSignature(receiptId, taskId, normalizedScope, planHash, expiresAt);

  return {
    receipt_id: receiptId,
    task_id: taskId,
    scope: normalizedScope,
    plan_hash: planHash,
    issued_at: issuedAt,
    expires_at: expiresAt,
    signature
  };
}

/**
 * 校验确认收据的合法性、有效性与操作边界
 * @param {Object} receipt 收据对象
 * @param {string} targetAction 目标操作/工具名称
 * @param {string} [targetPath] 目标操作文件路径
 * @param {string} [projectRoot=process.cwd()] 项目根目录
 * @returns {{ valid: boolean, receipt_id: string }}
 */
function verifyReceipt(receipt, targetAction, targetPath, projectRoot = process.cwd()) {
  if (!receipt || typeof receipt !== 'object') {
    throw new Error('[ConfirmationReceipt Invalid] 收据对象不存在或格式错误');
  }

  const { receipt_id, task_id, scope, plan_hash, expires_at, signature } = receipt;
  if (!receipt_id || !task_id || !scope || !plan_hash || !expires_at || !signature) {
    throw new Error('[ConfirmationReceipt Invalid] 收据关键元数据字段缺失');
  }

  // 1. 防伪造防篡改签名校验
  const expectedSignature = calculateSignature(receipt_id, task_id, scope, plan_hash, expires_at);
  if (signature !== expectedSignature) {
    throw new Error('[ConfirmationReceipt Tampered] 收据签名无效或元数据已被篡改，拒绝执行');
  }

  // 2. 有效期校验
  const expiryTime = new Date(expires_at).getTime();
  if (isNaN(expiryTime) || Date.now() > expiryTime) {
    throw new Error(`[ConfirmationReceipt Expired] 确认收据已于 ${expires_at} 过期，必须重新请求授权确认`);
  }

  // 3. 操作白名单边界校验
  const actionLower = String(targetAction || '').toLowerCase();
  if (WRITE_ACTIONS.has(actionLower)) {
    if (!targetPath) {
      throw new Error(`[ConfirmationReceipt OutOfScope] 写入操作 "${targetAction}" 必须提供目标文件路径`);
    }

    const writePatterns = Array.isArray(scope.write) ? scope.write : [];
    const isCovered = isPathCoveredByScope(targetPath, writePatterns, projectRoot);
    if (!isCovered) {
      throw new Error(
        `[ConfirmationReceipt OutOfScope] 目标写入文件 "${targetPath}" 超出确认收据授权范围: [${writePatterns.join(', ')}]`
      );
    }
  }

  return {
    valid: true,
    receipt_id
  };
}

module.exports = {
  issueReceipt,
  verifyReceipt,
  isPathCoveredByScope
};
