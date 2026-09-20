---
name: memory-put
description: 在独立任务或子会话结束后需要汇总临时证据、请求归档确认并把高价值事实写入项目 docs 记忆时使用。
---

# 记忆归档 (Memory Put)

遵循 `rules/engineering-principles.md`。任务结束不自动归档；必须经用户确认并完成价值评估。

## 触发条件
- 任务完成且具备可复用的已证实事实、架构决策或排查路径，且用户明确授权归档。

## 执行步骤
1. **收集临时证据**：主任务在 `.agents/project-memory/temp/<task>/` 积累临时证据草稿与 `path.json`。
2. **安全红线核验**：扫描脱敏，严禁记录 Token、密钥、密码、完整日志、代码行号或整段代码。
3. **正式落盘**：
   - 具体变更写入：`docs/change/<专题>/YYYY-MM-DD_中文简述.md`（要求对应 `docs/memory/<专题>.md` 存在）；
   - 新记录统一采用**四段式**：一、问题/需求；二、原因分析；三、测试结果；四、备注；
   - 接口契约规范若有变更更新至 `docs/api/<模块>.md`；
   - 专题文档 `docs/memory/<专题>.md` 仅追加变更索引摘要（1-2句），不堆砌流水账。
4. **命令调用**：
   ```bash
   node skills/project-memory/scripts/project-memory.js put --task <任务ID> --title <标题> --summary <一句话摘要> --value <high|medium> --target docs/change/<专题>/YYYY-MM-DD_中文简述.md --confirmed
   ```

## 输入与输出
- **输入**：`--task`, `--title`, `--summary`, `--value`, `--target`, `--confirmed`。
- **输出**：归档状态 (`archived`)、更新的索引文档列表。

## 停止条件与兼容边界
- 缺少受管临时证据、脱敏校验失败、对应专题记忆不存在时停止并报错；
- 对历史平铺、五段式、六段式记录保持只读结构兼容。
