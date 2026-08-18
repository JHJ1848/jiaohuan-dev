---
name: bugfix
description: 在用户使用旧名称请求缺陷排查或修复，或出现编译失败、数据异常、接口偏差、外部依赖和历史逻辑疑点时使用。
---

# 缺陷修复(Bugfix)

这是 `workflow` 的兼容入口，不复制工作流、不维护独立状态机(State Machine)或陷阱(Gotcha)索引。

`memory-get -> debug -> dev -> code-review -> memory-put`

- 先由 `debug` 建立场景-目标卡、恢复历史意图、验证假设并确认最小计划；未确认时不得修改。
- 高影响事件先止损、隔离或回退并保留现场证据，风险受控后再诊断；具体分流见 `../debug/references/diagnosis-playbook.md`。
- `dev` 只实施确认计划；出现新疑点或验证失败回到 `debug`。完成实施变更后先进入 `code-review`，再按 `memory-put` 询问归档。
