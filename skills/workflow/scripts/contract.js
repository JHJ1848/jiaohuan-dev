/**
 * [Workflow Runtime] Contract Validator
 * 
 * 机器可读输出契约校验器 (Decision & BugfixReport)。
 * 零第三方依赖，纯原生 CommonJS 实现。
 */

const ALLOWED_ROUTES = new Set(['dev', 'bugfix', 'explore']);
const ALLOWED_RISKS = new Set(['R0', 'R1', 'R2', 'R3', 'R4']);

/**
 * 校验 Workflow 决策契约 (WorkflowDecision)
 * @param {any} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDecision(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['数据必须为非空 Object'] };
  }

  // 1. route 校验
  if (typeof data.route !== 'string' || !ALLOWED_ROUTES.has(data.route)) {
    errors.push(`route 必须是 "dev"|"bugfix"|"explore" 之一，当前值为 "${data.route}"`);
  }

  // 2. reason 校验
  if (typeof data.reason !== 'string' || data.reason.trim().length === 0) {
    errors.push('reason 必须为非空字符串');
  }

  // 3. scope 校验
  if (!data.scope || typeof data.scope !== 'object' || Array.isArray(data.scope)) {
    errors.push('scope 必须是包含 read 和 write 数组的对象');
  } else {
    const scopeKeys = Object.keys(data.scope);
    const validScopeKeys = new Set(['read', 'write']);
    for (const k of scopeKeys) {
      if (!validScopeKeys.has(k)) {
        errors.push(`scope 包含未知字段 "${k}"`);
      }
    }

    if (!Array.isArray(data.scope.read)) {
      errors.push('scope.read 必须为字符串数组');
    } else {
      for (let i = 0; i < data.scope.read.length; i++) {
        if (typeof data.scope.read[i] !== 'string') {
          errors.push(`scope.read[${i}] 必须为字符串`);
        }
      }
    }

    if (!Array.isArray(data.scope.write)) {
      errors.push('scope.write 必须为字符串数组');
    } else {
      for (let i = 0; i < data.scope.write.length; i++) {
        if (typeof data.scope.write[i] !== 'string') {
          errors.push(`scope.write[${i}] 必须为字符串`);
        }
      }
    }
  }

  // 4. next_gate 校验
  if (typeof data.next_gate !== 'string' || data.next_gate.trim().length === 0) {
    errors.push('next_gate 必须为非空字符串');
  }

  // 5. risk 校验
  if (typeof data.risk !== 'string' || !ALLOWED_RISKS.has(data.risk)) {
    errors.push(`risk 必须是 "R0"|"R1"|"R2"|"R3"|"R4" 之一，当前值为 "${data.risk}"`);
  }

  // 6. additionalProperties 校验
  const allowedRootKeys = new Set(['route', 'reason', 'scope', 'next_gate', 'risk']);
  for (const k of Object.keys(data)) {
    if (!allowedRootKeys.has(k)) {
      errors.push(`禁止未定义的附加字段 "${k}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 校验 Bugfix 报告契约 (BugfixReport)
 * @param {any} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateBugfixReport(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['数据必须为非空 Object'] };
  }

  // 1. root_cause
  if (typeof data.root_cause !== 'string' || data.root_cause.trim().length === 0) {
    errors.push('root_cause 必须为非空字符串');
  }

  // 2. reproduction
  if (typeof data.reproduction !== 'string' || data.reproduction.trim().length === 0) {
    errors.push('reproduction 必须为非空字符串');
  }

  // 3. fix_boundary
  if (!Array.isArray(data.fix_boundary) || data.fix_boundary.length === 0) {
    errors.push('fix_boundary 必须为非空字符串数组');
  } else {
    for (let i = 0; i < data.fix_boundary.length; i++) {
      if (typeof data.fix_boundary[i] !== 'string' || data.fix_boundary[i].trim().length === 0) {
        errors.push(`fix_boundary[${i}] 必须为非空字符串`);
      }
    }
  }

  // 4. evidence
  if (typeof data.evidence !== 'string' || data.evidence.trim().length === 0) {
    errors.push('evidence 必须为非空字符串');
  }

  // 5. additionalProperties 校验
  const allowedRootKeys = new Set(['root_cause', 'reproduction', 'fix_boundary', 'evidence']);
  for (const k of Object.keys(data)) {
    if (!allowedRootKeys.has(k)) {
      errors.push(`禁止未定义的附加字段 "${k}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 断言决策契约合法，非法抛出异常
 * @param {any} data
 */
function assertDecisionValid(data) {
  const res = validateDecision(data);
  if (!res.valid) {
    throw new Error(`[Workflow Contract Error] 决策契约校验失败: ${res.errors.join('; ')}`);
  }
}

/**
 * 断言缺陷修复报告契约合法，非法抛出异常
 * @param {any} data
 */
function assertBugfixReportValid(data) {
  const res = validateBugfixReport(data);
  if (!res.valid) {
    throw new Error(`[Workflow Contract Error] 缺陷报告契约校验失败: ${res.errors.join('; ')}`);
  }
}

module.exports = {
  validateDecision,
  validateBugfixReport,
  assertDecisionValid,
  assertBugfixReportValid
};
