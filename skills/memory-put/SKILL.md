---
name: memory-put
plugin: jiaohuan-dev
description: "[jiaohuan-dev] 在独立任务或子会话结束后，经用户确认将目标业务项目的架构设计、功能实现或 Bug 排障等业务受控记忆归档至 docs/ 目录时使用。"
---

# 业务记忆受控归档 (Memory Put)

遵循 `rules/engineering-principles.md`。专职服务于目标具体业务项目的业务级受控记忆归档，任务结束不自动归档，必须经用户确认并完成价值评估。

## 职责边界与隔离
- **业务受控记忆**：仅收录目标业务项目的长期架构设计事实、业务功能实现与 Bug 排障记录，归档落盘至 `docs/memory/` 与 `docs/change/`；
- **边界隔离**：严禁将 Plugin 级别的通用踩坑经验或全局 Gotchas 写入 `memory-put`；跨项目通用经验由 `session-gotcha-extractor` 提取为 JSONL 存储至 `.agents/gotchas.jsonl`，实现物理与逻辑隔离。

## 触发条件
- 目标业务任务完成，产生已证实的架构决策、业务逻辑或排查路径，且用户明确授权归档。

## 执行步骤
1. **收集临时证据**：主任务在 `.agents/project-memory/temp/<task>/` 积累临时证据草稿与 `path.json`。
2. **安全红线核验**：扫描脱敏，严禁记录 Token、密钥、密码、完整日志、代码行号或整段代码。
3. **正式落盘**：
   - 变更明细落盘：`docs/change/<专题>/YYYY-MM-DD_中文简述.md`（要求对应 `docs/memory/<专题>.md` 存在）；
   - 新记录严格采用**四段式**：一、问题/需求；二、原因分析；三、测试结果；四、备注；
   - **简洁写入**：归档内容只写问题、原因、结果和必要备注；避免套话、空话、重复背景和无实际作用的修饰语。
   - 接口契约规范若有变更更新至 `docs/api/<模块>.md`；
   - 专题文档 `docs/memory/<专题>.md` 追加变更索引摘要（1-2句），严禁堆砌流水账。
4. **命令调用**：
   ```bash
   node skills/project-memory/scripts/project-memory.js put --task <任务ID> --title <标题> --summary <一句话摘要> --value <high|medium> --target docs/change/<专题>/YYYY-MM-DD_中文简述.md --confirmed
   ```

## 输入与输出
- **输入**：`--task`, `--title`, `--summary`, `--value`, `--target`, `--confirmed`。
- **输出**：归档状态 (`archived`)、更新的索引文档列表。

## 停止条件与兼容边界
- 缺少受管临时证据、脱敏校验失败、对应专题记忆不存在时停止并报错；
- 试图归档通用踩坑经验或 Plugin 自迭代记录时拒绝落盘并提示转由 `session-gotcha-extractor` 处理；
- 对历史平铺、五段式、六段式记录保持只读结构兼容。
