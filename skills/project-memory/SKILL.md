---
name: project-memory
description: 在用户明确启动独立任务、需要读取项目记忆、收集临时证据或经确认归档时使用。
---

# 项目记忆(Project Memory)

按 `workflow` 选择开发、诊断(Debug)、缺陷修复(Bugfix)或探索(Explore)链路；`bugfix` 实际走 `memory-get -> debug -> dev -> memory-put`。本技能是交接契约，不是调度器、知识图谱或跨智能体(Agent)状态机(State Machine)。

- `AGENTS.md` 存规则和入口，`MEMORY.md` 存受控索引；冲突停止。正式记录只进 `docs/`。
- 主任务独占 `temp/<task>/task.json`、`path.json` 和正式归档；子智能体(Agent)只写 `children/<agent>/` 草稿。
- `path.json` 仅保存简短节点、父节点、状态、证据引用和结论，不保存原始思维链。
- `outline --file <项目内 Markdown>` 只读标题导航；`get --tree` 只读受控记忆分支。
- 结束时列出实际路由、检索/归档状态和实际引用的记忆文档；无引用写“无”。
