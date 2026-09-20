---
name: memory-get
plugin: jiaohuan-dev
description: "[jiaohuan-dev] 在独立任务或子会话的探索、诊断、开发前需要读取最小项目规则、历史意图和相关记忆时使用。"
---

# 记忆读取 (Memory Get)

遵循 `rules/engineering-principles.md`。只读，严禁修改正式 `docs/`。

## 触发条件
- 启动新任务、排查问题、开发功能前需获取工程约束、领域事实或历史演进。

## 执行步骤
1. **分层检索**：
   - 第一层（主记忆与约束）：读取 `.agents/AGENTS.md` 与 `docs/MEMORY.md`；
   - 第二层（专题记忆与API）：读取 `docs/memory/<专题>.md` 与 `docs/api/<模块>.md`；
   - 第三层（变更记录）：按需读取 `docs/change/<专题>/YYYY-MM-DD_中文简述.md`。
2. **执行检索**：
   - 基础检索：`node skills/project-memory/scripts/project-memory.js get --query <关键词> --task <主任务ID>`；
   - 树状结构：`node skills/project-memory/scripts/project-memory.js get --tree --query <关键词>`；
   - 强行或手动读取：使用 `--force` 或 `--manual`。

## 输入与输出
- **输入**：`--query`（关键词）、`--target`（指定文档路径）、`--task`（任务ID）。
- **输出**：匹配的文档集合、检索回执 (`receipt`)、引用的记忆文档列表。

## 停止条件与兼容边界
- 发现记忆冲突、非法路径或未初始化的旧记忆时停止处理并提示修复；
- 兼容读取历史平铺变更（`docs/change/*.md`）、五段式及六段式场景文档。
