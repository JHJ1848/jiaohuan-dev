#!/usr/bin/env bash
# 导出 ZCode 插件副本到仓库外的稳定引用源。
# ZCode 客户端引用 ~/.zcode/plugin-workspace/jiaohuan-develop-workflow，
# 不直接引用 Git 工作区；本脚本是仓库 -> 导出副本的唯一同步路径。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${ZCODE_EXPORT_DEST:-$HOME/.zcode/plugin-workspace/jiaohuan-develop-workflow}"
BRANCH="$(git -C "$REPO_ROOT" branch --show-current)"
COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD)"

if [ "$BRANCH" != "ZCode" ]; then
  echo "export-zcode: 当前分支为 ${BRANCH}，仅允许在 ZCode 分支执行导出。" >&2
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST"
cp -r \
  "$REPO_ROOT/.zcode-plugin" \
  "$REPO_ROOT/hooks" \
  "$REPO_ROOT/skills" \
  "$REPO_ROOT/rules" \
  "$REPO_ROOT/tools" \
  "$REPO_ROOT/README.md" \
  "$REPO_ROOT/marketplace.json" \
  "$DEST/"

cat > "$DEST/EXPORT-INFO.md" <<EOF
# 导出副本说明

- 用途：ZCode 本地插件市场引用源，避免引用 Git 工作区（分支切换会改变文件）。
- 来源仓库：$REPO_ROOT
- 来源分支：$BRANCH
- 来源提交：$COMMIT
- 导出时间：$(date -Iseconds)
- 市场清单：根目录 marketplace.json（市场名 jiaohuan-local，插件 jiaohuan-develop-workflow）。
- 刷新方式：检出最新 ZCode 分支后执行 bash tools/export-zcode.sh，再在 ZCode 客户端重新加载插件。
EOF

echo "export-zcode: 已导出到 $DEST（分支 $BRANCH，提交 $COMMIT）"
