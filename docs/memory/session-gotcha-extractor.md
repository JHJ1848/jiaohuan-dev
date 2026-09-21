# session-gotcha-extractor 核心功能维护 & 记忆沉淀

本文档为 `session-gotcha-extractor` 专题的受控记忆文档，记录 Plugin 级内置记忆自迭代引擎、双层 JSONL 路由存储、物理白名单与架构设计决策。

---

## 一、专题架构与职责 (Architecture & Scope)

- **专题标识**: `session-gotcha-extractor`
- **核心职责**: 作为 **Plugin 级内置记忆自迭代引擎**，负责在开发 (dev)、排障 (bugfix) 与探索 (explore) 过程中自动感应或响应用户指令提炼场景经验与避坑要点，基于通用性评估执行双层 JSONL 路由存储，并沉淀正向引导与硬约束，驱动工作流和 Plugin 自身能力自迭代。
- **物理白名单范围**: 
  - `skills/session-gotcha-extractor/**`
  - `docs/memory/session-gotcha-extractor.md`
  - `docs/change/session-gotcha-extractor/**`
  - `.agents/gotchas.jsonl`
  - `docs/gotchas.jsonl`

---

## 二、架构已知事实与决策 (Architectural Facts & Decisions)

1. **Plugin 级内置记忆定位**: 突破单次会话或单项目限制，作为插件内置的避坑认知底座，实现跨会话认知沉淀。
2. **双层 JSONL 路由存储策略**:
   - **全局存储 (`~/.agents/gotchas.jsonl`)**: 沉淀跨工程、跨语言、跨技术栈普适的通用设计模型、编码红线与调试停手铁律，反哺 Plugin 自身全局进化；
   - **项目存储 (`<项目根目录>/.agents/gotchas.jsonl`)**: 沉淀与当前工程环境、特定依赖、私有配置强绑定的专用经验，隔离全局知识库；
   - **路由决策依据**: 严格基于场景的**通用性评估 (Generality Assessment)**。
3. **JSONL 记录契约**: 单行合法 JSON，强制 UTF-8 编码且禁止 BOM 头。必填字段包含 `scope` (`global` | `project`)、`category` (`bugfix` | `dev` | `explore`)、`title`、`scene`、`symptom`、`misjudgment`、`root_cause_and_solution`、`guidance_and_constraint` 及 `value_assessment`。
4. **反向赋能自迭代机制**: 提炼的核心条目必须包含正向操作指引 (`guidance`) 与硬性红线约束 (`constraint`)，用于反哺对应技能手册与全局工程准则。
5. **轻量 CLI 双层治理**: `scripts/gotcha.js` 统一支持 `--scope <project|global|all>` 的追加、检索与完整性校验。

---

## 三、专题变更明细索引 (Changes Index)

<!-- project-memory:changes:start -->
- [2026-09-20 重构为场景自迭代引擎](../change/session-gotcha-extractor/2026-09-20_重构为场景自迭代引擎.md) - 解耦 session-reader，确立三大分类、自感应提取与反向赋能机制。
- [2026-09-20 内置记忆双层路由升级](../change/session-gotcha-extractor/2026-09-20_内置记忆双层路由升级.md) - 升级为 Plugin 级内置记忆，落地基于通用性评估的全局库与项目库双层 JSONL 路由及 CLI 治理。
<!-- project-memory:changes:end -->
