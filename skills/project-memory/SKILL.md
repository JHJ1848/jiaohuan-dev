---
name: project-memory
description: 在用户明确启动独立任务、需要读取项目记忆、收集临时证据或经确认归档时使用。
---

# 项目记忆(Project Memory)

按 `workflow` 选择开发、诊断(Debug)、缺陷修复(Bugfix)或探索(Explore)链路。本技能是 `memory-get` 与 `memory-put` 的交接契约，不是调度器、知识图谱或跨智能体(Agent)状态机(State Machine)。

- 启动时先执行 `memory-get`；结束后仅在用户确认时执行 `memory-put`。有实施变更时，开发/修复链路在两者之间经过 `code-review`。
- `AGENTS.md` 存规则和入口，`MEMORY.md` 存受控索引；冲突停止。正式记录只进 `docs/`。
- 主任务独占临时证据、`task.json`、`path.json` 和正式归档；`path.json` 是任务级临时跨智能体(Agent)子上下文，不是流程状态机(State Machine)。子智能体(Agent)只写草稿。
- 具体读取、初始化、索引、价值评估、场景(Scene)、保留和输出契约分别以 `../memory-get/references/framework-and-retrieval.md` 与 `../memory-put/references/archival-contract.md` 为准。
- `code-review` 需要历史约束、场景(Scene)、陷阱(Gotcha)或冲突证据时，复用 `memory-get` 的最小查询和已登记文档范围；本技能不执行审查，也不维护审查状态。
- 结束时列出实际路由、检索/归档状态和全部实际记忆引用；无引用写“无”。
