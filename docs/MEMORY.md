# 项目记忆与治理中枢 (docs/MEMORY.md)

本文档为“叫唤-开发-工作流 (jiaohuan-develop-workflow)”的**唯一受控主记忆枢纽**，记录项目定位、核心架构准则、专题索引、全局变更记录与 API 契约。

---

## 一、项目定位与记忆入口

- **项目定位**：跨宿主 AI Agent 插件包，集合“叫唤-开发-工作流”的自定义技能 (Skill) 与规则 (Rule)。
  - `main` 分支：服务 Claude Code 与 Codex（并保留 Antigravity 根清单）；
  - `ZCode` 分支：专精 ZCode 宿主，插件源经 `tools/export-zcode.js` 导出到 `~/.zcode/plugin-workspace/jiaohuan-develop-workflow`。
- **使用方式**：可被其他项目通过 `plugins.json` 引用或作为全局插件配置加载。
- **受控主记忆**：`docs/MEMORY.md` 是全项目唯一主记忆权威入口。根目录 `MEMORY.md` 仅作为向下兼容垫片保留。

---

## 二、核心架构准则 (Core Architectural Principles)

本准则为跨模块、跨会话冲突裁决的唯一权威依据：

1. **约束优先于便利**：业务约束、工程安全与白名单隔离永远优先于临时快捷实现。
2. **原始证据优先于推测**：记忆只能记录已确认的事实与断言，严禁将假设、推测或未验证结论写成既成事实。
3. **三层记忆严格分层**：
   - 第一层（主记忆与工程约束）：`AGENTS.md`（工程约束与任务识别）+ `docs/MEMORY.md`（核心准则、全局索引与不变量）；
   - 第二层（专题受控记忆）：`docs/memory/<专题>.md` 仅维护长期架构设计、领域事实、业务契约及索引，严禁堆砌单次改动流水账；
   - 第三层（专题变更明细）：单次工程改动统一归档入 `docs/change/<专题>/YYYY-MM-DD_中文简述.md`，规范采用四段式。
4. **历史兼容与意图推测**：新逻辑必须兼容已确认的历史约束与业务初衷，严禁破坏历史业务不变量；在排查复杂历史逻辑时强制执行意图推测节点。
5. **最小可逆改动**：只改动目标必要范围内的代码，严禁顺带重构、无关格式化或吞没异常；新改动与旧逻辑冲突时优先寻求兼容解。
6. **文档与代码分离**：API 契约归入 `docs/api/`，业务记忆归入 `docs/memory/`，单次改动归入 `docs/change/`，临时草稿归入受管临时目录，严禁跨层混杂。

---

## 三、记忆双向绑定索引

<!-- project-memory:main-index:start -->
agents_file: ../.agents/AGENTS.md
topics: memory/
change_records: change/
apis: api/
<!-- project-memory:main-index:end -->

---

## 四、专题索引 (Topics Index)

<!-- project-memory:topics:start -->
- [workflow](memory/workflow.md) - 任务语义路由、生命周期链路、代码审查确认门与并行控制。
- [explore](memory/explore.md) - 只读探索取证、意图澄清、调用链梳理与架构决策分流。
- [bugfix](memory/bugfix.md) - 缺陷诊断与最小修复闭环（承接原 debug 链路与 bugfix 规范），意图推测与四段式验证。
- [dev](memory/dev.md) - 受控开发实施、魔法值治理、日志链建设与验收自测闭环（与 bugfix 共享会话）。
- [project-memory](memory/project-memory.md) - 本地记忆统一底层 CLI 工具库（scripts/project-memory.js）与全局门面契约。
- [memory-get](memory/memory-get.md) - 三层层级只读检索、最小上下文策略与树状结构提取。
- [memory-put](memory/memory-put.md) - 任务收尾受控归档流转、四段式规范、安全脱敏核验与索引联动。
- [session-gotcha-extractor](memory/session-gotcha-extractor.md) - 工程场景与避坑经验提炼引擎、JSONL 经验库与反向赋能自迭代。
- [memory](memory/memory.md) - 负责 memory 专属领域的业务实现、接口治理、三层记忆架构维护与质量保障。
- [debug-http-replay-and-redaction](memory/debug-http-replay-and-redaction.md) - HTTP 接口排障脱敏规范、写读断言回放循环与敏感请求头隔离治理。
<!-- project-memory:topics:end -->

---

## 五、全局变更索引 (Global Changes Index)

<!-- project-memory:changes:start -->
- [2026-08-10 初始化与防坑网络建立](change/project-memory/2026-08-17_运行时验收与路由收敛.md) - 初始化项目结构，建立基础技能与防坑网络。
- [2026-08-13 项目记忆架构轻量化拆分](change/project-memory/2026-08-17_运行时验收与路由收敛.md) - project-memory 收敛为轻量语义路由，新增 memory-get 与 memory-put。
- [2026-08-14 运行时模块化与四层工作流](change/project-memory/2026-08-17_运行时验收与路由收敛.md) - runtime 目录职责解耦，工作流收敛为四层。
- [2026-08-17 接口排障脱敏与按需标题树](change/bugfix/2026-08-17_调试证据与Markdown标题树.md) - 接口证据脱敏规范与 outline 标题树解析设计。
- [2026-08-17 运行时验收与路由收敛](change/project-memory/2026-08-17_运行时验收与路由收敛.md) - 完成 CLI/GUI 隔离验收与 Explore 只读路由增加。
- [2026-08-18 归档前代码审查节点](change/project-memory/2026-08-17_运行时验收与路由收敛.md) - 在实施变更与归档间新增 code-review 独立审查收尾节点。
- [2026-08-21 跨宿主插件规范发布](change/project-memory/2026-08-17_运行时验收与路由收敛.md) - 明确多宿主插件发布体系，补充日志链与防篡改不变量。
- [2026-08-27 ZCode 宿主分支体系](change/project-memory/2026-08-17_运行时验收与路由收敛.md) - 建立 ZCode 分支差异化导出与合集感知 Hook。
- [2026-09-07 意图推测固定节点集成](change/memory/2026-09-10_三层记忆架构规范升级与全链路联动改造.md) - engineering-principles.md 集成意图推测为一等分析节点。
- [2026-09-10 三层记忆架构规范升级与全链路联动改造](change/memory/2026-09-10_三层记忆架构规范升级与全链路联动改造.md) - 全合集确立三层受控记忆分层与 1:1 强绑定拓扑。
- [2026-09-20 AI Agent 本地记忆 Plugin 全面重构](change/memory/2026-09-20_AI_Agent本地记忆Plugin全面重构.md) - 完成本地记忆 Plugin 全面重构：唯一主记忆收敛、四段式文档契约、底层运行时升级、Skill 精简与纯原生单页看板。
- [2026-09-20 全量 Skill 专题受控记忆规范补齐与三层目录对齐](change/memory/2026-09-20_全量Skill专题受控记忆规范补齐与三层目录对齐.md) - 补齐 docs/change/ 全量 8 个专题目录，迁移 debug 变更至 bugfix，规范化 11 个专题受控记忆二层结构并全量注册。
- [2026-09-20 生产就绪整改：基础 package.json 与原生测试套件](change/project-memory/2026-09-20_生产就绪整改_package与测试套件.md) - 建立基础 package.json 与零依赖原生测试套件 (Pass 28)。
- [2026-09-20 生产就绪整改：并发写锁与记忆防提示词注入边界](change/project-memory/2026-09-20_生产就绪整改_并发锁与记忆防注入.md) - 实现文件排他锁死锁回收机制与检索防注入沙箱头包裹。
- [2026-09-20 生产就绪整改：确认收据校验与两阶段检索增强](change/project-memory/2026-09-20_生产就绪整改_确认收据校验与检索增强.md) - 实现确认收据检验集成与两阶段打分及 Top-K 检索。
<!-- project-memory:changes:end -->

---

## 六、API 文档索引 (API Contracts Index)

<!-- project-memory:apis:start -->
- [API 规范总览](api/README.md) - 接口契约规范目录入口、CLI 命令行接口与设计规范。
<!-- project-memory:apis:end -->

---

## 七、记忆维护规则与兼容说明

1. **新记录归档**：必须通过 `memory-put` 写入对应专题目录 `docs/change/<专题>/YYYY-MM-DD_中文简述.md`，内容严格遵循四段式结构。
2. **历史记录兼容**：对历史上存在的平铺式（`docs/change/*.md`）、五段式及六段式记录保持完全向下兼容读取与检索，未经明确授权不得批量重写历史文件。
3. **双向注册约束**：主记忆 `docs/MEMORY.md` 必须与 `.agents/AGENTS.md` 维持相对路径双向标记绑定。
