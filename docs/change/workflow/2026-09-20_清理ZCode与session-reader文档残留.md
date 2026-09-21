# 2026-09-20 清理 ZCode 与 session-reader 文档残留

- 摘要: 彻底清理 README.md 与 TODO.md 中关于 ZCode 分支、.zcode-plugin、安装指南与 session-reader 技能的历史残留，恢复为纯粹通用的跨宿主标准化工作流插件。
- 价值评估: medium - 消除文档与现实实现的不一致，确保跨宿主说明简洁纯粹
- 有效性: active
- 关联专题: [workflow](../../memory/workflow.md)

---

#### 一、问题/需求

在本项目彻底移除 ZCode 差异化分支与 `session-reader` 技能后，全局核心文档中仍存在大量过期描述：
1. `README.md` 包含关于 ZCode 分支、`.zcode-plugin/` 清单、`tools/export-zcode.js` 导出脚本及 `session-reader` 专题图/表格说明；
2. `README.md` 包含冗长的“ZCode 安装指南”全节（前置条件、导出步骤、市场添加、常见问题与 Hook 边界）以及尾部“ZCode 差异化边界”；
3. `TODO.md` 中残留关于 ZCode 客户端安装验收、ZCode 分支 `plugin.json` 移除及 `session-reader` 隔离样例验收的历史待办项；
4. 需将 `session-gotcha-extractor` 的说明纠正为自感应提炼与指令沉淀避坑经验，恢复项目为纯粹通用的跨宿主标准化 Plugin 架构。

---

#### 二、原因分析

1. 历史演进断层：项目此前曾针对 ZCode 宿主维护了差异化分支与导出体系，并在技能集中引入了会话源读取适配器 `session-reader`；
2. 架构收敛要求：后续决策收敛了边界，移除了特定宿主差异分支与会话原始读取技能，但全局说明文档（README/TODO）未同步做外科手术式清理，造成对开发者与使用者的误导。

---

#### 三、测试结果

1. **文档文本搜索核查**：
   - 在 `README.md` 中全局搜索 `zcode`（不区分大小写）和 `session-reader`，结果均为 0 处匹配；
   - 在 `TODO.md` 中全局搜索 `zcode`（不区分大小写）和 `session-reader`，结果均为 0 处匹配；
2. **结构完整性验证**：
   - `README.md` 技能专题图表格收敛为 9 项有效技能（已移除已物理删除的 `skill-session-reader.svg` 引用与表格行）；
   - `session-gotcha-extractor` 说明已精确更新为：“在工程开发与排查过程中自感应提炼高价值场景与避坑经验，或在用户明确指令下沉淀 Gotcha 记录并反向赋能工作流”；
   - 彻底删除“ZCode 安装指南”全节与尾部差异化边界段落，文档结构紧凑连贯；
   - 运行项目记忆检查工具验证：无破坏性改动，符合三层记忆规范。

---

#### 四、备注

1. **白名单控制**：本次清理仅在 `README.md`、`TODO.md`、`docs/memory/workflow.md` 与 `docs/change/workflow/**` 物理白名单内实施；
2. **纯粹性保证**：叫唤开发工作流正式恢复为纯粹跨宿主标准 Plugin 架构（支持 Claude Code、Codex 等），无宿主专属分支绑架。
