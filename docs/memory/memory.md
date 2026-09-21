# 专题受控记忆: memory

本文档为 `memory` 专题的受控记忆，记录本专题的架构设计、职责边界、物理白名单与长期已知事实。

---

## 一、专题架构与职责 (Architecture & Scope)

- **专题标识**: `memory`
- **核心职责**: 负责 AI Agent 本地记忆 Plugin 核心生命周期、三层记忆架构维护、检索归档运行时 (`runtime/`)、双向索引治理与质量保障。
- **物理白名单范围**: 
  - `skills/project-memory/**`
  - `skills/memory-get/**`
  - `skills/memory-put/**`
  - `docs/**` (含 `docs/MEMORY.md`, `docs/memory/**`, `docs/change/**`, `docs/api/**`)
  - `rules/engineering-principles.md`
  - `.agents/AGENTS.md`
  - `MEMORY.md`

---

## 二、架构已知事实与决策 (Architectural Facts & Decisions)

1. **唯一受控主记忆**: 全项目唯一受控主记忆为 `docs/MEMORY.md`。根目录 `MEMORY.md` 改造为标准向下兼容垫片，禁止在根目录追加业务事实。
2. **三层受控记忆分层**:
   - 第一层（主记忆与工程约束）：`.agents/AGENTS.md`（代码工程约束与任务识别）+ `docs/MEMORY.md`（核心准则、全局索引与不变量）；
   - 第二层（专题受控记忆）：`docs/memory/<专题>.md` 仅维护长期架构设计、领域事实、业务契约以及变更索引简述，严禁堆砌单次改动流水账；
   - 第三层（专题变更明细）：所有具体工程实施与排障改动统一归档到 `docs/change/<专题>/YYYY-MM-DD_中文简述.md`，规范采用四段式结构。
3. **新记录四段式与历史兼容**: 新记录一律采用“一、问题/需求；二、原因分析；三、测试结果；四、备注”四段式；对历史平铺式（`docs/change/*.md`）、五段式、六段式场景保持只读结构兼容。
4. **API 契约分离**: 接口定义归入 `docs/api/`，业务记忆归入 `docs/memory/`，改动明细归入 `docs/change/`，严禁跨层混写，严禁记录凭据与长 ID。
5. **底层运行时升级**: `skills/project-memory/scripts/runtime/` 支持专题强校验（禁止无主创建 change）、自动双向索引更新、摘要长度压缩及引用完整性检查 (`checkIntegrity`)。

---

## 三、专题变更明细索引 (Changes Index)

<!-- project-memory:changes:start -->
- [三层记忆架构规范升级与全链路联动改造](../change/memory/2026-09-10_三层记忆架构规范升级与全链路联动改造.md) - 全链路确立三层受控记忆架构，更新 records.js、memory-put、memory-get，并迁移既有历史文档。
- [AI Agent 本地记忆 Plugin 全面重构](../change/memory/2026-09-20_AI_Agent本地记忆Plugin全面重构.md) - 完成本地记忆 Plugin 全面重构：唯一主记忆收敛、四段式文档契约、底层运行时升级、Skill 精简与纯原生单页看板。
- [全量 Skill 专题受控记忆规范补齐与三层目录对齐](../change/memory/2026-09-20_全量Skill专题受控记忆规范补齐与三层目录对齐.md) - 补齐 docs/change/ 全量 8 个专题目录，迁移 debug 变更至 bugfix，规范化 11 个专题受控记忆二层结构并全量注册。
<!-- project-memory:changes:end -->
