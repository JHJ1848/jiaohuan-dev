# project-memory 核心功能维护 & 记忆沉淀

本文档为 `project-memory` 专题的受控记忆文档，记录本地记忆底层运行时 CLI、三层分层契约、物理白名单与架构设计决策。

---

## 一、专题架构与职责 (Architecture & Scope)

- **专题标识**: `project-memory`
- **核心职责**: 负责本地记忆体系的统一底层 Node.js CLI 工具库（`scripts/project-memory.js`）与全局门面契约，提供 `inspect`, `init`, `get`, `put`, `temp`, `draft`, `path` 等核心子命令，统领 `memory-get` 与 `memory-put` 协同。
- **物理白名单范围**: 
  - `skills/project-memory/**`
  - `docs/memory/project-memory.md`
  - `docs/change/project-memory/**`

---

## 二、架构已知事实与决策 (Architectural Facts & Decisions)

1. **统一运行时定位**: 本技能是跨宿主统一的 CLI 工具与门面契约，而非流程状态机或持久调度器。
2. **底层运行时模块化**: `scripts/runtime/` 严格解耦：
   - `constants.js`：定义标记、状态与常量；
   - `filesystem.js`：跨平台路径与文件读写；
   - `framework.js`：唯一主记忆检测与双向索引维护；
   - `records.js`：四段式落盘、强校验专题存在、API 索引联动与引用完整性校验 (`checkIntegrity`)；
   - `retrieval.js`：三层分层检索与记忆树构建。
3. **安全与红线要求**: 严禁将长整数 ID、Token、Cookie、生产凭据或完整日志写入记忆文档。

---

## 三、专题变更明细索引 (Changes Index)

<!-- project-memory:changes:start -->
- [运行时验收与路由收敛](../change/project-memory/2026-08-17_运行时验收与路由收敛.md) - 完成 CLI/GUI 隔离验收与 Explore 只读路由增加。
- [生产就绪整改：基础 package.json 与原生测试套件](../change/project-memory/2026-09-20_生产就绪整改_package与测试套件.md) - 建立基础 package.json 与零依赖原生测试套件 (Pass 28)。
- [生产就绪整改：并发写锁与记忆防提示词注入边界](../change/project-memory/2026-09-20_生产就绪整改_并发锁与记忆防注入.md) - 实现文件排他锁死锁回收机制与检索防注入沙箱头包裹。
- [生产就绪整改：确认收据校验与两阶段检索增强](../change/project-memory/2026-09-20_生产就绪整改_确认收据校验与检索增强.md) - 实现确认收据检验集成与两阶段打分及 Top-K 检索。
<!-- project-memory:changes:end -->
