# memory-put 核心功能维护 & 记忆沉淀

本文档为 `memory-put` 专题的受控记忆文档，记录受控归档流转、四段式规范、安全脱敏核验、物理白名单与架构设计决策。

---

## 一、专题架构与职责 (Architecture & Scope)

- **专题标识**: `memory-put`
- **模块 Key**: `memory-put`
- **核心职责**: 负责在任务完成且具备可复用高价值事实时，汇总临时材料，执行脱敏扫描，向用户请求归档确认，将四段式变更写入对应 `docs/change/<专题>/`，并自动联动更新主记忆、专题记忆与 API 索引。负责目标业务项目专属领域的业务受控记忆归档、四段式记录维护、敏感信息拦截与质量保障；专职管理 `docs/memory/` 与 `docs/change/`，与通用踩坑经验（`.agents/gotchas.jsonl`）严格物理隔离。
- **物理白名单范围**: 
  - `skills/memory-put/**/*`
  - `docs/memory/memory-put.md`
  - `docs/change/memory-put/**/*`
  - `src/memory-put/**/*`
  - `tests/test_memory-put/**/*`

---

## 二、架构已知事实与决策 (Architectural Facts & Decisions)

1. **归档双重门禁**: 任务结束严禁自动归档；必须同时满足“具备可复用高价值事实”与“获得用户明确授权确认”。
2. **四段式新记录强制规范**: 新记录一律采用“一、问题/需求；二、原因分析；三、测试结果；四、备注”结构；严禁记录 Token、长 ID、密码或整段代码。
3. **专题强校验不变量**: 落盘到 `docs/change/<专题>/<记录>.md` 时，强校验对应 `docs/memory/<专题>.md` 必须存在，禁止无主创建。
4. **已证实事实 1**: 专题受控记忆初始化已建立。
5. **已证实事实 2**: `memory-put` 专职服务于目标业务项目受控记忆归档，仅记录业务架构设计事实、功能实现与排障路径，严禁收录 Plugin 级别或跨项目通用踩坑。
6. **已证实事实 3**: 通用踩坑与 Plugin 自迭代调试经验由 `session-gotcha-extractor` 输出至 `.agents/gotchas.jsonl`，实现业务领域事实与通用排障经验的严格分离。

---

## 三、专题变更记录索引 (Change Index)

<!-- project-memory:changes:start -->
- [2026-09-20 收敛业务记忆边界](../change/memory-put/2026-09-20_收敛业务记忆边界.md) - 明确 memory-put 专职业务受控记忆归档，与 session-gotcha-extractor 通用踩坑经验隔离。
<!-- project-memory:changes:end -->
