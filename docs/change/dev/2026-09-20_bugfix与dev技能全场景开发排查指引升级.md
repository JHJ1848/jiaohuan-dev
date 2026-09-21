# 2026-09-20 bugfix与dev技能全场景开发排查指引升级

- 摘要: 全面升级 bugfix 与 dev 核心技能，建立六大实战排查范式、连续3次排除强制停手红线与 RCA 分析卡；确立新增功能前置五维审视、外科手术式修改、数据防击穿/防覆盖锁与用户测试要点指引卡，强化 code-review 独立审查收尾门禁。
- 价值评估: high - 确立工程级全场景排查与受控开发实施规范
- 有效性: active
- 关联API: [project-memory-cli](../../api/project-memory-cli.md)
- 关联专题: [dev](../../memory/dev.md), [bugfix](../../memory/bugfix.md)

---

#### 一、问题/需求

落实治理中枢派单任务，将实战排查经验、架构决策模型与开发安全红线深度融入核心技能：
1. `bugfix` 缺乏结构化实战排查指南，对于空列表穿透、历史逻辑冲突、跨端交互与脏数据处理缺乏场景化模型；
2. 排查过程缺乏严格的单变量控制与停手阻断机制，容易出现盲目反复试错；
3. `dev` 实施缺乏前置审视标准，对数据并发防击穿（负数/覆盖/软删除隐式漏配）缺乏防线；
4. 交付验收环节缺乏“编译通过 != 需求落地”的证据交付与用户测试指引卡，收尾门禁需与 `code-review` 强绑定。

---

#### 二、原因分析

1. **排查断层**：以往排查偏重临时经验，未将“角色标识 -> 编码映射 -> 业务门禁”与“时间轴 Git 考古三大断层（状态继承短路、过渡统配残留、审计原值防污染）”沉淀为标准化手册；
2. **试错失控**：缺少明确的量化红线，面对复杂未知问题容易过度陷入代码微调，缺少 3 轮独立排除后强制停手向用户请示的机制；
3. **防护漏洞**：数值扣减常因在内存计算导致并发穿透或负数，快照历史记录存在就地更新被篡改风险，手写 SQL 易遗漏软删除过滤；
4. **收尾松散**：开发完成后易忽视代码审查与人工验收指引，缺少标准化的【用户测试要点指引卡】。

---

#### 三、测试结果

1. **文档与规范完整性核验**：
   - 新建 `skills/bugfix/references/troubleshooting-playbook.md`，覆盖六大排查场景与 3 次排除停手红线；
   - 新建 `skills/bugfix/references/root-cause-analysis-card.md`，提供标准化 RCA 模板；
   - 升级 `skills/bugfix/SKILL.md`，强化六要素结构与参考手册索引；
   - 升级 `skills/dev/references/implementation-and-verification.md`，覆盖前置五维审视、外科手术式修改、结构与注释、数据防击穿、结构化日志链与用户测试要点指引卡；
   - 升级 `skills/dev/SKILL.md`，强化规范对齐与 `code-review` 收尾门禁；
2. **记忆完整性检查 (project-memory inspect)**：
   - 执行 `node skills/project-memory/scripts/project-memory.js inspect --project-root .` 验证全链路引用与格式，结果均为 Exit Code 0，引用有效且无断链。

---

#### 四、备注

1. **白名单约束**：严格遵守 Allowlist（`skills/bugfix/**`, `skills/dev/**`, `docs/memory/bugfix.md`, `docs/memory/dev.md`, `docs/change/dev/**`）；
2. **停手机制执行**：后续所有在 `bugfix` 模块中的排查，必须严格执行连续 3 次排除即停手向用户汇报的硬性红线；
3. **交付流转**：本次任务实施已通过自测验证，随后向主治理中枢发送结构化交付报告。
