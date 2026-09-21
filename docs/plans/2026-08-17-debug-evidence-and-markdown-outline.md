# 调试证据与 Markdown 标题树实施计划

> **流程：** 开发、诊断(Debug)、缺陷修复(Bugfix)、探索(Explore)均由 `workflow` 路由；异步智能体(Agent)只交临时证据，主任务唯一归档。

**目标：** 将脱敏接口复测和按需 Markdown 标题树纳入现有轻量工作流。

**架构：** 统一 CLI 增加只读 `outline` 子命令；`debug` 使用独立 Bash 请求检查脚本。两者都不新增持久状态、全仓缓存或正式记忆写入口。

**技术：** Node.js 标准库、Bash、curl；不新增依赖。

**规范：** [2026-08-17-debug-evidence-and-markdown-outline-design.md](../decisions/2026-08-17-debug-evidence-and-markdown-outline-design.md)

## 任务

- [x] 新增标题树解析器，限制项目内 `.md`，跳过 YAML 头和代码围栏。
- [x] 在统一 CLI 暴露 `outline --file --depth`。
- [x] 新增脱敏 HTTP 请求检查脚本，支持秘密请求头环境变量、状态码和关键字段断言。
- [x] 将最小修改、请求证据、凭据脱敏和失败回交规则写入 `rules`、`debug`、`dev`、`memory-put`。
- [x] 更新 README、决策、变更记录、专题记忆和主索引。
- [x] 在隔离样例项目执行 CLI、GUI、Bash mock 请求和归档验证；未执行真实登录或业务接口请求。
