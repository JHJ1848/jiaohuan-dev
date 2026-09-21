# memory-get 核心功能维护 & 记忆沉淀

本文档为 `memory-get` 专题的受控记忆文档，记录三层层级检索、最小上下文策略、物理白名单与架构设计决策。

---

## 一、专题架构与职责 (Architecture & Scope)

- **专题标识**: `memory-get`
- **核心职责**: 负责在任务启动、诊断或开发前，以分层形式只读检索项目约束、架构事实、变更明细与 API 契约，提供检索回执 (`receipt`)，支持关键词检索与树状查看 (`--tree`)。
- **物理白名单范围**: 
  - `skills/memory-get/**`
  - `docs/memory/memory-get.md`
  - `docs/change/memory-get/**`

---

## 二、架构已知事实与决策 (Architectural Facts & Decisions)

1. **三层层级检索规范**:
   - 第一层（主记忆与工程约束）：检索 `.agents/AGENTS.md` 与 `docs/MEMORY.md`；
   - 第二层（专题记忆与API）：按需检索 `docs/memory/<专题>.md` 与 `docs/api/<模块>.md`；
   - 第三层（具体变更明细）：按需深入检索 `docs/change/<专题>/YYYY-MM-DD_中文简述.md`。
2. **纯只读红线**: 本技能只负责文档过滤与加载，严禁向正式 `docs/` 写入任何内容。
3. **策略兼容性**: 支持 `auto`, `manually`, `only_once`, `do_not_get` 策略；兼容读取历史平铺变更（`docs/change/*.md`）及旧五/六段式文档。

---

## 三、专题变更明细索引 (Changes Index)

<!-- project-memory:changes:start -->
<!-- project-memory:changes:end -->
