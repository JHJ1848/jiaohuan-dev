# 2026-09-20 AI Agent 本地记忆 Plugin 全面重构

- 摘要: 全面重构 AI Agent 本地记忆 Plugin：确立 docs/MEMORY.md 为唯一受控主记忆与根目录兼容垫片，规范四段式记录契约，升级底层运行时（专题强校验、自动索引压缩、完整性检查），精简 8 个核心 Skill 并交付零依赖单页看板。
- 价值评估: high - 确立跨宿主统一记忆治理标准与完整性校验机制
- 有效性: active
- 关联API: [project-memory-cli](../../api/project-memory-cli.md)
- 关联专题: [memory](../../memory/memory.md)

---

#### 一、问题/需求

落实治理中枢派发的《AI Agent 本地记忆 Plugin 全面重构》整改计划，解决长期存在的五大核心痛点：
1. 主记忆定位分叉（根目录 `MEMORY.md` 与 `docs/MEMORY.md` 并存冲突）；
2. 缺乏任务识别规则导致 Plugin 能力与被集成项目文档边界混淆；
3. 变更记录缺乏统一标准结构，部分记录过于冗长且缺乏专题强校验；
4. 核心 Skill 文档中长篇复制工程原则，严重消耗上下文 Token；
5. 缺乏直观的记忆可视化浏览界面与引用完整性校验机制。

---

#### 二、原因分析

1. **口径分叉原因**：历史版本在推进三层记忆时未能将根目录文件彻底降级为兼容垫片，导致运行时 `inspectFramework` 在双候选存在时触发歧义；
2. **文档冗余原因**：各 Skill 独立编写时复制粘贴了大量公共原则，未形成“统一引用 `rules/engineering-principles.md`”的极简文档架构；
3. **接口契约缺失**：此前未建立独立的 `docs/api/` 规范目录，导致接口字段与业务记忆混杂；
4. **校验能力缺失**：底层运行时原先仅检查双向索引，未提供主记忆、专题、变更与 API 之间的全链路断链核验。

---

#### 三、测试结果

1. **CLI 运行时自测**：
   - 执行 `node skills/project-memory/scripts/project-memory.js inspect --project-root .`：
     * 返回 `status: ready`，`framework.status: ready`；
     * 自动触发 `checkIntegrity`，输出 `integrity.status: valid`，已核验文件 4 篇、专题 2 个、全局变更 11 篇、API 契约 1 篇，断链与错误数均为 0（Exit Code 0）；
   - 执行 `node skills/project-memory/scripts/project-memory.js get --query "架构准则"`：准确分层检索出受控主记忆与准则；
2. **Dashboard 离线测试**：
   - `dashboard/index.html` 成功构建，具备零依赖、免服务端纯原生特性，内嵌离线快照，支持树状拓扑、实时搜索筛选与标准四段式 Badge 渲染。

---

#### 四、备注

1. **兼容垫片说明**：根目录 `MEMORY.md` 仅为向下兼容垫片，禁止在此追加业务事实；
2. **四段式红线**：后续所有新记录必须严格遵循四段式，严禁大段贴代码、完整日志、代码行号或未证实假设；
3. **交付状态**：本任务全部 5 个阶段均已实施验证完毕，准备向主治理中枢发送结构化交付报告。
