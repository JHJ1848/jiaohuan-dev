---
name: workflow
plugin: jiaohuan-dev
description: "[jiaohuan-dev] 在开发、诊断、缺陷修复或任务含义不明的工作开始时使用，用于选择最小工作流、并行边界和下一道确认门。"
---

# 工作流 (Workflow)

遵循 `rules/engineering-principles.md`。本技能负责任务语义路由，不维护状态机或持久队列。

## 核心路由表

| 任务语义 | 执行链路 | 下一关确认门 |
|---|---|---|
| **开发 (有实施变更)** | `memory-get -> dev -> code-review -> memory-put` | 确认目标、范围、验收标准 |
| **开发 (仅文档/无实施变更)** | `memory-get -> dev -> memory-put` | 确认目标、范围、验收标准 |
| **只读诊断** | `memory-get -> bugfix -> memory-put` | 确认根因或排障事实 |
| **缺陷修复 (Bugfix)** | `memory-get -> bugfix -> dev -> code-review -> memory-put` | 确认根因与最小修复计划 |
| **探索 (Explore)** | `memory-get -> explore -> memory-put` | 澄清目标或决策下一步 |

## 执行规范
1. **统一输入输出**：每次路由输出：`路由`、`依据`、`边界`、`下一关`。
2. **审查收尾**：涉及可审查的实施变更时，在 `memory-put` 前必须经 `code-review` 独立核验；未通过审查不得归档。
3. **安全与授权红线**：自动路由不等于修改授权；只有经用户确认的计划才能进入 `dev` 实施。
