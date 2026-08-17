---
name: memory-get
description: 在独立任务或子会话的探索、诊断、开发前需要读取最小项目规则、历史意图和相关记忆时使用。
---

# 记忆读取(Memory Get)

按 `rules/engineering-principles.md` 和 `project-memory` 执行；只读，不写正式 `docs/`。

- 先检查双向索引和策略。冲突、未注册旧记忆或项目外目标停止处理。
- 用 `get --query <关键词> --task <主任务>` 读取最小上下文；`manually` 使用 `--manual`，用户明确查看分支时用 `get --tree`。
- 索引标签未命中时，只扫描已登记文档的标题、摘要、检索词和路径摘要，再读取候选正文；不扫全仓、不建缓存。
- 用户明确查看任意项目 Markdown 结构时用 `outline --file <路径> [--depth 1-6]`；标题树不是正文阅读或事实证明。
- 输出约束、入口、历史意图、未知项、检索回执(receipt)或跳过原因，并列“记忆引用”。
