---
name: workflow
description: 在开发、诊断、缺陷修复或任务含义不明的工作开始时使用，用于选择最小工作流和下一道确认门。
---

# 工作流(Workflow)

详细工程约束以 `rules/engineering-principles.md` 为准。本技能只做当前上下文的语义路由，不保存状态机(State Machine)、任务队列或重试。

| 语义 | 链路 | 下一关 |
|---|---|---|
| 开发 | `memory-get -> dev -> memory-put` | 确认目标、范围和验收 |
| 仅诊断 | `memory-get -> debug -> memory-put` | 确认根因或未知项 |
| 缺陷修复(Bugfix) | `memory-get -> debug -> dev -> memory-put` | 确认最小修复计划 |
| 探索(Explore) | `memory-get -> explore -> memory-put` | 确认后续是诊断、开发还是停止 |

- 每次输出：`路由`、`依据`、`边界`、`下一关`。语义、业务含义或影响范围不清时一律进入探索(Explore)，不得静默写代码。
- 自动路由不等于修改授权；只有确认后的 `dev` 能改动。
- 只有用户明确选择的独立任务或独立子会话执行完整链路。异步智能体(Agent)只写临时草稿，主任务唯一执行 `memory-put`。
