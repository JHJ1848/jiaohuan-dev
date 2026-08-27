---
name: session-reader
description: 在需要读取用户指定的 Codex、Claude、Gemini、ZCode 或导出会话的指定范围时使用；只读输出标准化会话包，不复制原始记录或写入正式记忆。
---

# 会话读取(Session Reader)

只读取用户明确指定的会话来源或导出文件，输出统一会话包(Session Packet)，供 `session-gotcha-extractor` 提炼。

- 指定厂商会话：`node scripts/session-reader.js read --provider <codex|claude|gemini|zcode> --session <会话ID>`。
- 指定导出文件：`node scripts/session-reader.js read --file <JSONL或Markdown>`。
- 指定内容：追加 `--query <字面关键词>`、`--from <消息序号>`、`--to <消息序号>`。
- 输出格式：默认 JSON；需要人读时使用 `--format markdown`。

边界：

1. 只保留可见的用户和 AI 消息；系统提示词、开发者规则、隐藏推理、工具原文和未识别事件必须省略并报告。
2. 不全盘搜索，不复制厂商原始记录，不写 `.agents/skills` 或正式 `docs/`。
3. 当前会话未被宿主导出时，只能处理模型可见上下文，并明确覆盖范围，不声称拥有完整原文。
4. 读取结果交给 `session-gotcha-extractor`；正式项目记忆仍由 `memory-put` 经用户确认后写入。

详细字段和厂商适配边界见 `references/session-packet-contract.md`。
