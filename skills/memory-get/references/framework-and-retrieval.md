# 记忆框架与读取

## 初始化与边界

- 根 `AGENTS.md` 保存项目约束和记忆入口；`MEMORY.md` 保存受控索引与已证实事实。两者相对路径双向注册；读取后发现规则、目标或范围冲突时，以停止并请用户决定为准，不得用记忆覆盖约束；路径逃出项目或两个候选记忆冲突时同样停止。
- 正式归档目标只能是 `docs/` 下的 Markdown。建议为 `docs/memory/<专题>.md`、`docs/memory/<专题>/<功能>.md` 或 `docs/change/<记录>.md`；项目外目标必须拒绝并给出该建议。
- `AGENTS.md` 缺失记忆入口时，`get` 与 `put` 都触发初始化检查。没有记忆时创建 `docs/MEMORY.md`、`docs/memory/`、`docs/change/` 与双向索引。
- 发现旧 `MEMORY.md` 时先返回选择：`migrate`（备份并改造成受控格式）、`keep`（仅保留旧记忆读取，正式归档前再迁移）、`reset`（备份后新建 `docs/MEMORY.md`，需 `--confirm-reset`）。不自动删除。已登记入口优先；无登记而 `docs/MEMORY.md` 与根文件都存在时优先前者；两者冲突时停止。

## 读取策略

策略文件为 `<project>/.agents/project-memory/memory-policy.json`，JSON 字段 `memory_get_mode` 默认 `auto`：

- `only_once`：新会话、独立任务或独立子会话先读一次；检索回执仅是当前上下文提示。
- `auto`：缺失信息、历史意图或不确定约束时自动最小检索。
- `manually`：仅用户显式查询；普通查询加 `--manual`。
- `do_not_get`：不执行读取；仍说明跳过原因。

先命中受控索引标签；未命中才扫描已登记文件的标题、摘要、检索词和路径摘要。`get --tree` 仅在用户明确要求了解记忆时输出相关主记忆、专题和子功能枝叶；`outline` 只返回 Markdown 标题、层级和行号，不输出正文。

## 输出契约

响应末尾列出所有实际读取的主记忆、专题、子功能和变更记录；无命中写“记忆引用：无”。不得用标题树或未读取的索引伪造事实依据。
