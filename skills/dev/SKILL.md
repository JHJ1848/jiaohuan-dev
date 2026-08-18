---
name: dev
description: 在需求或修复计划已明确并获确认后，需要实施最小改动、保持不变量并交接验收时使用。
---

# 开发(Dev)

遵从 `../../rules/engineering-principles.md`；只执行已确认的范围。实施前必须读 `references/implementation-and-verification.md`。

- 核对目标、不变量、历史约束、影响范围和验收。语义、数据范围或风险出现新疑点时停止并回到 `debug` 或探索(Explore)。
- 只做最小、可逆改动；不顺手重构、不加未经证实的回退(fallback)、默认值或吞错。
- 主任务把已证实实施结果更新到 `path.json` 和临时证据；复杂或高风险改动明确交由用户实测。
- 接口验证按已确认的最小请求对执行，失败回到 `debug`。完成实施变更后先交 `code-review`，再交 `memory-put`，不自动归档。
