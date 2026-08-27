#!/usr/bin/env node
'use strict';

// ZCode SessionStart 合集感知 Hook：每次会话启动只注入一条只读提醒。
// 不维护状态、不写文件、不阻塞会话；任何内部错误都按成功静默退出。

const fs = require('fs');
const path = require('path');

function pluginRoot() {
  return (
    process.env.ZCODE_PLUGIN_ROOT ||
    process.env.CLAUDE_PLUGIN_ROOT ||
    path.resolve(__dirname, '..')
  );
}

function skillNames(root) {
  const skillsDir = path.join(root, 'skills');
  try {
    return fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')))
      .sort();
  } catch (error) {
    return [];
  }
}

function buildContext() {
  const root = pluginRoot();
  const names = skillNames(root);
  if (names.length === 0) {
    return '【叫唤开发工作流】未在本插件中找到 skills/ 目录，请检查插件安装完整性。';
  }
  return [
    `【叫唤开发工作流合集感知】本会话已加载 jiaohuan-develop-workflow 插件（${names.length} 个技能）：${names.join('、')}。`,
    '接收任务时先按 workflow 选择最小闭环，并完整阅读涉及 Skill 的 SKILL.md 与 references/，不得跳过既有工作流盲目推测。',
    '主链路：memory-get -> dev / debug / explore -> code-review（有实施变更时）-> memory-put；正式记忆只能经用户确认后由 memory-put 写入目标项目 docs/。',
  ].join('\n');
}

try {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: buildContext(),
      },
    })
  );
  process.exit(0);
} catch (error) {
  // 注入失败不影响会话启动。
  process.exit(0);
}
