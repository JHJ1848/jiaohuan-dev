'use strict';

const { POLICY_VALUES } = require('./constants');
const { readText, existingFile, toProjectPath, runtimePaths } = require('./filesystem');
const { inspectFramework } = require('./framework');

function inspect(projectRoot) {
  const framework = inspectFramework(projectRoot);
  const paths = runtimePaths(projectRoot);
  let policy = { memory_get_mode: 'auto', source: 'default' };
  if (existingFile(paths.policy)) {
    try {
      const parsed = JSON.parse(readText(paths.policy));
      if (POLICY_VALUES.has(parsed.memory_get_mode)) {
        policy = { memory_get_mode: parsed.memory_get_mode, source: 'runtime' };
      } else {
        policy = { invalid: true, source: 'runtime' };
      }
    } catch (error) {
      policy = { invalid: true, source: 'runtime' };
    }
  }
  return {
    status: 'inspected',
    project_root: projectRoot,
    runtime_path: toProjectPath(projectRoot, paths.runtime),
    framework,
    policy,
    summary: framework.status === 'ready' ? '项目记忆框架已就绪。' : `项目记忆框架状态：${framework.status}。`,
  };
}

module.exports = { inspect };
