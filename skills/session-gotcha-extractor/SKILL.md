---
name: session-gotcha-extractor
description: 在用户要求从历史智能体会话提炼可复用工程经验、误判或排障证据时使用，不用于直接修改项目记忆。
---

# 会话陷阱提炼

术语：场景(Scene)是完整上下文；陷阱(Gotcha)是场景内可复用误判；循环(Loop)、智能体(Agent)、状态机(State Machine)按 `rules/engineering-principles.md` 定义。

1. 仅处理开发或诊断会话；非工程会话简述并停止。
2. 提取场景、症状、误判、已证实证据、修复边界和未知项；不把旧快照或推断写成事实。
3. 输出为 `memory-put` 的证据或候选临时草稿；不得直接写正式 `MEMORY.md`、不得创建平行陷阱(Gotcha)索引。
4. 未根治的问题交给 `debug`；正式归档仅由主任务经用户确认后执行 `memory-put`。
