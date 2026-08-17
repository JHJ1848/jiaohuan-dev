---
name: bugfix
description: 在用户使用旧名称请求缺陷排查或修复，或出现编译失败、数据异常、接口偏差、外部依赖和历史逻辑疑点时使用。
---

# 缺陷修复(Bugfix)

这是 `workflow` 的兼容入口，不复制工作流、不维护状态机(State Machine)或独立陷阱(Gotcha)索引。

`memory-get -> debug -> dev -> memory-put`

- 先由 `debug` 取证、恢复历史意图并确认最小计划；未确认时不得修改。
- `dev` 只实施确认计划；出现新疑点回到 `debug`。
- 输出路由、依据、边界和下一关；多任务与子智能体(Agent)边界遵从 `workflow`。
