# workflow 核心功能维护 & 记忆沉淀

本文档为 `workflow` 专题的受控记忆文档，记录任务语义路由、生命周期链路、物理白名单与架构设计决策。

---

## 一、专题架构与职责 (Architecture & Scope)

- **专题标识**: `workflow`
- **核心职责**: 负责任务的语义路由决策，统筹开发（有实施变更/无实施变更）、只读诊断、缺陷修复 (Bugfix) 与探索 (Explore) 链路流转，把关代码审查 (`code-review`) 与用户确认门。
- **物理白名单范围**: 
  - `skills/workflow/**`
  - `docs/memory/workflow.md`
  - `docs/change/workflow/**`

---

## 二、架构已知事实与决策 (Architectural Facts & Decisions)

1. **轻量语义路由定位**: 本技能专注于输入输出路由映射，不维护持久状态机、租约或重试机制；受管临时目录 `path.json` 仅作为任务级跨智能体子上下文。
2. **完整闭环链路**: 
   - 开发链路：`memory-get -> dev -> code-review -> memory-put`；
   - 修复链路：`memory-get -> debug -> dev -> code-review -> memory-put`；
   - 只读诊断：`memory-get -> debug -> memory-put`；
   - 探索链路：`memory-get -> explore -> memory-put`。
3. **确认门红线**: 自动路由不等于修改授权；产生代码实施变更时必须经 `code-review` 独立核验与用户确认。
4. **纯粹标准化跨宿主 Plugin 架构**: 彻底移除 ZCode 差异化分支、专属导出脚本及 `session-reader` 技能，README 与 TODO 已全面完成残留清理，技能体系收敛为通用跨宿主标准规范。
5. **PreToolUse Hook 可移植性与自包含安全**: `scripts/hooks/enforce_allowlist.js` 清除机器绝对路径，支持跨平台动态探测全局 task-loop 插件候选；在独立 CI 或离线环境下自包含优雅降级放行，杜绝 `MODULE_NOT_FOUND` 异常。
6. **跨平台 CI 自动化工作流基建**: 建立 `.github/workflows/test.yml`，在 push/PR 到 master 时自动运行 Linux/Windows/macOS 跨平台与 Node 20/22 矩阵下的单元测试、记忆完整性质检（`npm run inspect`）与 Gotcha 经验库校验（`npm run validate`）。
7. **轻量运行上下文与循环保护熔断器**: 新增 `skills/workflow/scripts/run-context.js` 与单元测试，实现 `RunContext` 任务上下文、`ExecutionBudget` 多维资源限额控制器（工具调用/Shell/变更文件）以及 `LoopGuard` 循环动作特征识别与 3 次重复连续防空耗熔断器。
8. **机器可读输出契约与防自我授权确认收据**: 制定 `skills/workflow/schemas/` 机器可读 JSON Schema（`workflow-decision.schema.json`, `bugfix-report.schema.json`），实现 `contract.js` 零依赖原生契约校验器；实现 `confirmation.js` 防伪确认收据（包含 task_id、时效 TTL、SHA-256 签名与写边界比对），杜绝模型未获授权自行修改业务代码。
9. **受控资产与 CI 构建 Git 边界保障**: 优化 `.gitignore`，彻底移除对 `docs/` 及 `.agents/AGENTS.md`、`.agents/gotchas.jsonl` 的规则屏蔽，确保受控记忆资产纳入 Git 追踪，解决干净 Runner 缺失核心记忆引发的 CI 门禁失败问题；本地临时派单与运行时状态保持严格物理隔离。
10. **插件市场清单规范 (Marketplace Manifest)**: 根目录 `marketplace.json` 与 `.claude-plugin/marketplace.json` 采用双路径冗余维护标准生态市场清单，声明插件元数据、所属分类与本地源码入口，确保客户端通过 Git 仓库直接添加插件市场时的解析兼容性。
11. **敏捷轻量定位与双模生态发布结构**: 响应提示词与插件轻量敏捷本质，精简剥离过度工程化的测试套件与 CI 工作流，聚焦于记忆质检与经验库治理；仓库同时提供标准根目录 `plugin.json`（支持单插件直接添加）与双路径 `marketplace.json`（支持插件市场直接订阅），实现跨厂商生态通用集成。

---

## 三、专题变更明细索引 (Changes Index)

<!-- project-memory:changes:start -->
- [2026-09-20 清理 ZCode 与 session-reader 文档残留](../change/workflow/2026-09-20_清理ZCode与session-reader文档残留.md) - 彻底清理 README.md 与 TODO.md 中的 ZCode 分支、导出指南与 session-reader 残留，恢复纯粹跨宿主 Plugin 架构。
- [2026-09-20 生产就绪整改：清理硬编码 Hook 绝对路径并实现自包含降级](../change/workflow/2026-09-20_生产就绪整改_清理硬编码hook.md) - 消除 enforce_allowlist.js 绝对路径硬编码，增加跨平台动态探测与自包含降级。
- [2026-09-20 生产就绪整改：建立跨平台 CI 自动化工作流](../change/workflow/2026-09-20_生产就绪整改_建立CI自动化工作流.md) - 配置 GitHub Actions 覆盖 Linux/Windows/macOS 与 Node 20/22 矩阵测试及全量治理核验。
- [2026-09-20 生产就绪整改：轻量运行上下文、执行预算与循环保护熔断器](../change/workflow/2026-09-20_生产就绪整改_运行上下文与循环保护.md) - 实现 RunContext、ExecutionBudget 与 LoopGuard 循环保护熔断。
- [2026-09-20 生产就绪整改：输出契约校验器与确认收据防自我授权门禁](../change/workflow/2026-09-20_生产就绪整改_输出契约与确认收据.md) - 实现机器可读 Schema、contract.js 契约校验与 confirmation.js 确认收据及确定性评测。
- [2026-09-21 生产就绪整改：放行受控资产与CI构建修复](../change/workflow/2026-09-21_生产就绪整改_放行受控资产与CI构建修复.md) - 优化 .gitignore 放行受控核心资产，补充 checkIntegrity 异常测试用例。
- [2026-09-21 生产就绪整改：补充插件市场清单文件](../change/workflow/2026-09-21_生产就绪整改_补充插件市场清单文件.md) - 新建根目录与 .claude-plugin/ 目录 marketplace.json 标准市场清单。
- [2026-09-21 生产就绪整改：精简去CI与通用市场结构重构](../change/workflow/2026-09-21_生产就绪整改_精简去CI与通用市场结构重构.md) - 精简剥离 tests/ 与 .github/，重构 plugin.json 与 marketplace.json 双模安装结构。
<!-- project-memory:changes:end -->
