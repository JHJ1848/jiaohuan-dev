# 会话包(Session Packet)合同

## 输出结构

```json
{
  "schema": 1,
  "kind": "session-packet",
  "source": {
    "provider": "codex",
    "session_id": "会话标识或空",
    "file": "来源文件绝对路径",
    "sha256": "来源指纹",
    "size": 0
  },
  "selection": {
    "query": "字面关键词或空",
    "from": 1,
    "to": 20,
    "matched": 2
  },
  "coverage": {
    "roles": ["user", "assistant"],
    "omitted": ["system", "developer", "tool", "unknown"],
    "warnings": []
  },
  "messages": [
    { "index": 1, "role": "user", "text": "用户消息原文" },
    { "index": 2, "role": "assistant", "text": "AI 可见回复" }
  ]
}
```

## 读取规则

- `user` 和 `assistant` 是唯一默认保留的角色。
- `tool` 只计入省略统计，不输出完整工具结果；证据应引用原文件或用户另行提供的脱敏材料。
- `system`、`developer`、内部推理和权限上下文永不输出。
- `--query` 是字面包含筛选，不是语义专题识别；专题边界由提炼 Skill 和用户确认决定。
- `--from`、`--to` 按标准化消息序号截取，序号从 1 开始。
- 读取器只输出结果，不写原始快照。需要审计时保存来源指纹和范围引用即可。

## 厂商边界

| 厂商 | 当前来源 | 处理方式 |
| --- | --- | --- |
| Codex | rollout JSONL 或用户导出文件 | 识别 `response_item`、`event_msg` 中的可见 user/assistant 消息 |
| Claude | project JSONL 或用户导出文件 | 识别 `user`、`assistant` 记录及其文本内容 |
| Gemini | 用户指定 JSONL/Markdown 优先 | 只读取能识别出角色和文本的结构，未知结构明确返回警告 |
| 其他 | 用户指定文件 | 使用通用角色/文本字段，不能可靠识别时停止 |

厂商目录和字段不是稳定公共接口。适配器必须允许以后替换来源解析，不得让提炼或记忆归档依赖具体路径。
