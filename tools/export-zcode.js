#!/usr/bin/env node
'use strict';

// 叫唤开发工作流 -> ZCode 官方标准目录一键导出脚本。
// 用法：node tools/export-zcode.js [--dest <目录>] [--force]
// 默认导出到 ~/.zcode/plugin-workspace/jiaohuan-develop-workflow，
// 完成后提示用户在 ZCode 客户端插件市场中选择该本地目录完成安装。

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const EXPORT_ITEMS = [
  '.zcode-plugin',
  'hooks',
  'skills',
  'rules',
  'tools',
  'README.md',
  'marketplace.json',
];

function parseArgs(argv) {
  const options = { dest: path.join(os.homedir(), '.zcode', 'plugin-workspace', 'jiaohuan-develop-workflow') };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--dest') {
      const value = argv[index + 1];
      if (!value) fail('--dest 需要一个目录参数。');
      options.dest = path.resolve(value);
      index += 1;
    } else if (token === '--force') {
      options.force = true;
    } else {
      fail(`未知的参数：${token}`);
    }
  }
  return options;
}

function fail(message) {
  process.stderr.write(`export-zcode: ${message}\n`);
  process.exit(1);
}

function gitInfo() {
  try {
    return {
      branch: execSync('git branch --show-current', { cwd: REPO_ROOT, encoding: 'utf8' }).trim(),
      commit: execSync('git rev-parse HEAD', { cwd: REPO_ROOT, encoding: 'utf8' }).trim(),
    };
  } catch (error) {
    return { branch: '', commit: '' };
  }
}

function main() {
  if (typeof fs.cpSync !== 'function') {
    fail('需要 Node.js >= 16.7（缺少 fs.cpSync）。');
  }
  const options = parseArgs(process.argv.slice(2));

  for (const item of EXPORT_ITEMS) {
    if (!fs.existsSync(path.join(REPO_ROOT, item))) {
      fail(`仓库缺少 ${item}，请确认在 ZCode 分支的仓库根目录运行。`);
    }
  }

  const { branch, commit } = gitInfo();
  if (!branch) {
    process.stdout.write('export-zcode: 未取得 Git 信息（可能是压缩包下载），跳过分支校验。\n');
  } else if (branch !== 'ZCode' && !options.force) {
    fail(`当前分支为 ${branch}，仅允许在 ZCode 分支导出；如确认继续请加 --force。`);
  }

  fs.rmSync(options.dest, { recursive: true, force: true });
  fs.mkdirSync(options.dest, { recursive: true });
  for (const item of EXPORT_ITEMS) {
    fs.cpSync(path.join(REPO_ROOT, item), path.join(options.dest, item), { recursive: true });
  }

  const exportedAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(options.dest, 'EXPORT-INFO.md'),
    [
      '# 导出副本说明',
      '',
      '- 用途：ZCode 本地插件市场引用源，避免引用 Git 工作区（分支切换会改变文件）。',
      `- 来源仓库：${REPO_ROOT}`,
      `- 来源分支：${branch || '未知（无 Git 信息）'}`,
      `- 来源提交：${commit || '未知（无 Git 信息）'}`,
      `- 导出时间：${exportedAt}`,
      '- 市场清单：根目录 marketplace.json（市场名 jiaohuan-local，插件 jiaohuan-develop-workflow）。',
      '- 刷新方式：检出最新 ZCode 分支后执行 node tools/export-zcode.js，再在 ZCode 客户端重新加载插件。',
      '',
    ].join('\n'),
    'utf8'
  );

  process.stdout.write(
    [
      '',
      '✅ 导出完成：' + options.dest,
      '',
      '下一步（在 ZCode 客户端中操作）：',
      '  1. 打开 Settings → Plugin Management → Discover 标签。',
      '  2. 点击右上角 “+”（添加插件市场）。',
      `  3. 在输入框粘贴上面的目录路径，或点“选择目录”选中该文件夹后点“添加插件市场”。`,
      '  4. 确认出现市场 jiaohuan-local 与插件卡片 jiaohuan-develop-workflow。',
      '  5. 在插件卡片上点击安装（Get）；新开会话后验证：',
      '     - 技能列表出现 jiaohuan-develop-workflow 的 10 个技能（如 workflow、debug、memory-get）。',
      '     - 会话启动时出现【叫唤开发工作流合集感知】注入提醒（SessionStart hook 生效）。',
      '',
      '更新插件：检出最新 ZCode 分支后重新运行 node tools/export-zcode.js，再在客户端重新加载插件。',
      '',
    ].join('\n')
  );
}

try {
  main();
} catch (error) {
  fail(error && error.message ? error.message : String(error));
}
