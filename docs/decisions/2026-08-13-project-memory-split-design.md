# 项目记忆拆分与轻量运行时设计

**日期：** 2026-08-13  
**状态：** 目标架构已实现；基础运行时已在隔离项目验证，后续真实业务验收另行授权。  
**范围：** 仅本仓库的 `project-memory` 集合；不注册、同步或改写全局技能(Skill)。

## 决策

项目记忆拆为轻量路由 `project-memory`、读取 `memory-get` 和归档 `memory-put`。主链路如下：

```text
开发：memory-get -> dev -> memory-put
诊断：memory-get -> debug -> memory-put
缺陷修复(Bugfix)：memory-get -> debug -> dev -> memory-put
探索(Explore)：memory-get -> explore -> memory-put
```

只有明确独立的任务或子会话拥有完整链路。异步子智能体(Agent)是同一任务的证据工作者，只能写命名临时草稿；主任务统一汇总并唯一执行正式归档。

## 职责边界

- `project-memory`：识别检索、完整链路或归档请求，传递任务标识、范围、检索回执(receipt)、约束、证据摘要、结果和归档决定；不保存正式内容，不承担调度。
- `memory-get`：先读规则，再按索引读最小必要记忆；得到不变量、历史意图和入口后停止扩展，不写正式记忆。
- `memory-put`：保存任务临时证据；仅在用户确认或明确要求时评估价值、去重、更新索引并写入 `docs/`。正式归档必须关联主任务和至少一份受管临时证据。

工作流状态机(State Machine)只用于当前智能体(Agent)的推理。运行时保存的是被动证据清单和归档材料，不拥有智能体(Agent)任务的调度器、租约、检查点或重试循环(Loop)；原生智能体(Agent)循环(Loop)才是调度方。用户手动触发保留轮转时，可在已验证归档后仅重试待完成的源材料清理。

## 记忆模型与文档落点

场景(Scene)是一个可复用业务或技术情境的完整记录，陷阱(Gotcha)是固定第六段，内容可空，不得建立平行索引。遗留 `gotcha-index` 仅可作为迁移输入，退出项目记忆主链。

正式文档只允许位于 `docs/`：

- `docs/MEMORY.md`：主索引和专题入口。
- `docs/memory/`：长期可复用的专题、功能与场景(Scene)。
- `docs/change/`：一次变更的范围、决策、验证、风险和关联历史；它保存历史转储，不取代专题记忆。

每个正式场景(Scene)固定六段：

1. 场景与目标；
2. 已证实事实与证据；
3. 处理与决策；
4. 结果与验证；
5. 边界与未知；
6. 陷阱(Gotcha)。

场景(Scene)头部记录链接元数据：关联 `AGENTS.md`、主 `MEMORY.md`、`docs/change/`、父/相关场景及临时证据相对路径。链接是可追溯性信息，不把临时草稿误写成正式事实。

## 初始化、索引和旧记忆

根 `AGENTS.md` 与主 `MEMORY.md` 以相对路径双向索引。有效已注册路径优先；若 `docs/MEMORY.md` 与根 `MEMORY.md` 都是未注册候选，优先前者。`AGENTS.md` 与 `MEMORY.md` 索引冲突必须停止并请求用户决定。

正式记录只能写到 `docs/` 下的明确目标。缺失框架可由统一入口初始化；发现既有未注册记忆时，必须由用户选择 `migrate`、`keep` 或双确认 `reset`。不得自动覆盖、迁移或物理删除旧记忆；过期内容应由新的场景(Scene)或 change 记录标记替代关系。

## 策略、临时证据和保留

唯一持久策略为 `<project>/.agents/project-memory/memory-policy.json`：

```json
{ "memory_get_mode": "auto" }
```

允许值为 `only_once`、`auto`、`manually`、`do_not_get`，默认 `auto`。`only_once` 的检索回执(receipt)只在当前任务/子会话上下文传递，用于避免重复读取；它不是历史事实、检索完成或正确性的证明。`manually` 使用 `--manual`，记忆树命令视为用户主动查询。

任务证据位于 `<project>/.agents/project-memory/temp/<task-id>/`，包括 `evidence.md`、`decisions.md`、`candidates.md` 与子智能体(Agent)命名草稿。临时材料保留七天，之后可按 ISO 周归档；未知文件、异常桶和恢复备份保留并报告。

## 实现边界

`skills/project-memory/scripts/project-memory.js` 是唯一外部命令行(CLI)与文件写入入口；`scripts/runtime/` 是其内部实现。`tools/project-memory-settings/` 是仅绑定 `127.0.0.1` 的本地图形界面(GUI)，经统一入口读取策略、轮转和清理，不直接写正式记忆，不注册计划任务，也不改全局智能体(Agent)设置。

这些运行时和图形界面(GUI)是项目记忆基础设施的实现，不构成独立技能(Skill)家族。2026-08-17 已在隔离项目手工验证 CLI、GUI、归档和保留；不等同于真实业务环境验收。
