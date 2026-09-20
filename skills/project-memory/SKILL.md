---
name: project-memory
plugin: jiaohuan-dev
description: "[jiaohuan-dev] 在用户明确启动独立任务、需要读取项目记忆、收集临时证据或经确认归档时使用。"
---

# 项目记忆 (Project Memory)

遵循 `rules/engineering-principles.md`。本技能提供本地记忆的 CLI 和基础规则，供 `memory-get` 与 `memory-put` 使用。

## 核心架构职责
1. **三层记忆契约**：
   - 第一层：`.agents/AGENTS.md`（约束与任务识别）+ `docs/MEMORY.md`（唯一主记忆枢纽）；根目录 `MEMORY.md` 为兼容垫片；
   - 第二层：`docs/memory/<专题>.md`（专题架构事实与索引）+ `docs/api/<模块>.md`（接口契约规范）；
   - 第三层：`docs/change/<专题>/YYYY-MM-DD_中文简述.md`（四段式单次改动明细）。
2. **生命周期闭环**：
   - 任务开始：调用 `memory-get` 分层检索上下文；
   - 过程管理：主任务维护 `.agents/project-memory/temp/<task>/` 下的临时草稿与 `path.json`；
   - 实施改动：通过 `code-review` 独立核验；
   - 任务收尾：经用户明确确认后调用 `memory-put` 归档。

## 核心命令
- **检查状态与完整性**: `node skills/project-memory/scripts/project-memory.js inspect`
- **初始化或修复绑定**: `node skills/project-memory/scripts/project-memory.js init`
- **分层检索**: `node skills/project-memory/scripts/project-memory.js get --query <关键词>`
- **正式归档**: `node skills/project-memory/scripts/project-memory.js put --task <任务ID> --title <标题> --summary <摘要> --value <high|medium> --target docs/change/<专题>/<记录>.md --confirmed`
- **临时材料管理**: `temp`, `draft`, `path`, `rotate`, `cleanup`

## 停止条件与边界
- 严禁绕过临时证据直接归档；
- 严禁在未经用户明确授权下物理覆写历史变更记录；
- **简洁写入**：临时草稿、变更明细和专题摘要只写客观事实、必要字段和验证结果；避免套话、空话、重复背景和无实际作用的修饰语。
