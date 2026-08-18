---
name: workflow
description: 在开发、诊断、缺陷修复或任务含义不明的工作开始时使用，用于选择最小工作流、并行边界和下一道确认门。
---

# 工作流(Workflow)

详见 `../../rules/engineering-principles.md`。本技能只做语义路由，不维护流程状态机(State Machine)、任务队列、租约或重试；受管 `temp/<task>/path.json` 只是任务级临时跨智能体(Agent)子上下文。

| 语义 | 链路 | 下一关 |
|---|---|---|
| 开发（有实施变更） | `memory-get -> dev -> code-review -> memory-put` | 确认目标、范围、验收 |
| 开发（仅文档/无实施变更） | `memory-get -> dev -> memory-put` | 确认目标、范围、验收 |
| 仅诊断 | `memory-get -> debug -> memory-put` | 确认根因或未知项 |
| 缺陷修复(Bugfix) | `memory-get -> debug -> dev -> code-review -> memory-put` | 确认最小修复计划 |
| 探索(Explore) | `memory-get -> explore -> memory-put` | 决定诊断、开发或停止 |

- 每次输出：`路由`、`依据`、`边界`、`下一关`。语义、业务含义或影响范围不清时进入探索(Explore)，不得静默改代码。
- 多个独立目标或并行请求，必须先让用户选择：主智能体(Agent)串行、异步子智能体(Agent)取证，或独立子会话/独立任务；未选择不得混用。
- 主智能体(Agent)串行的每个独立任务，以及用户明确选择的独立子会话，都执行完整链路。异步子智能体(Agent)止于 `temp/<task>/children/<agent>/` 草稿，主任务唯一执行 `memory-put`。
- 开发或修复产生可审查的实施变更时，`code-review` 是归档前的独立收尾节点；仅文档整理或未产生实施变更时可由 `dev` 直接交 `memory-put`。审查固定 diff 基点和范围，检查规格(Spec)、规范(Standards)、兼容性与影响面，并按改动模块按 `memory-get` 策略扫描历史坑点和冲突；`do_not_get`、未授权的 `manually` 或已命中的 `only_once` 要记录跳过原因/receipt，不把 receipt 当作事实证明。
- 主任务把只读审查报告写入受管 `temp/<task>/` 证据，并在 `path.json` 记录基点/范围、Spec/Standards 结果、历史检索或跳过回执、发现与结论。已提交且基点明确时可复用全局 `code-review`；未提交时按 `requesting-code-review` 传递 `git diff HEAD`（含 staged/unstaged）、`git status --short`、未跟踪文件内容、需求/计划和工作区状态请求独立审查。
- 本合集没有统一 issue tracker 时，以用户确认的需求和 `dev` 计划作为 Spec；没有可用 Spec 时跳过 Spec 轴并记录原因，不虚构需求。Fowler smell baseline 只作非阻断判断，只有违反已确认规格或仓库规范才回流。审查只读检查并报告现有测试缺口，遵从项目默认不自动写/跑测试；测试缺口本身不阻断，除非用户另行授权。
- `code-review` 的阻断、重要或未证实发现不得直接归档：已证实修复回到 `dev`，根因或历史冲突回到 `debug`，修复后再次审查；没有独立审查能力时标记未执行并交用户决定。
- 自动路由不等于修改授权；只有确认后的 `dev` 能改动。
