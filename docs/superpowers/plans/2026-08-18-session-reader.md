# 会话读取(Session Reader)部署计划

> **执行约束：** 本计划按中央 `.agents/skills` 源优先实施；默认只读、不复制原始会话、不直接写正式记忆。自动化测试受项目规则限制，采用 Node 语法检查、脱敏结构核对和用户授权的隔离样例人工验收。

**目标：** 新增独立的 `session-reader` Skill，按厂商或用户指定文件读取会话的指定内容，输出统一会话包(Session Packet)，供 `session-gotcha-extractor` 提炼，而不重复保存厂商原始记录。

**架构：** `session-reader` 负责来源定位、范围选择和格式归一化；`session-gotcha-extractor` 负责工程对话提炼；`memory-put` 负责用户确认后的项目记忆归档。读取失败、来源不完整或厂商格式未识别时必须报告边界，不猜测或全盘扫描。

**技术栈：** Node.js 内置模块、JSONL/Markdown 读取、SHA-256 来源指纹；不新增第三方依赖、不引入数据库、不建设全局缓存。

**规格：** 会话包合同见 `skills/session-reader/references/session-packet-contract.md`。

## 全局约束

- 中央共享源为 `C:\Users\48631\.agents\skills`；覆盖其他端点前先备份。
- 主分支文档使用简洁中文，首次出现的通用术语采用“中文(English)”。
- 默认读取可见的用户和 AI 对话；不读取或保存系统提示词、开发者规则、隐藏推理和未经筛选的敏感工具输出。
- 默认不写原始会话快照；只输出会话包并由提炼流程生成临时草稿。
- 正式记忆仍只能通过 `memory-put` 写入项目 `docs/`。
- 不修改 Git 历史，不访问真实业务项目或厂商登录状态。

---

### 任务 1：建立 Skill 与会话包合同

**文件：**

- 创建：`C:\Users\48631\.agents\skills\session-reader\SKILL.md`
- 创建：`C:\Users\48631\.agents\skills\session-reader\references\session-packet-contract.md`
- 镜像创建：`skills/session-reader/SKILL.md`
- 镜像创建：`skills/session-reader/references/session-packet-contract.md`

**接口：**

- 输入：`--provider`、`--session` 或 `--file`，可选 `--query`、`--from`、`--to`、`--format`。
- 输出：`schema=1` 的 `session-packet`，包含来源、范围、覆盖边界和可见消息。
- 不输出：原始路径之外的全盘索引、秘密值、隐藏角色和未识别大对象。

- [x] 写入触发条件、读取边界、当前上下文限制和命令示例。
- [x] 写入统一消息字段、来源指纹、范围字段和省略原因。
- [x] 写入与 `session-gotcha-extractor`、`memory-put` 的交接规则。

### 任务 2：实现只读读取器

**文件：**

- 创建：`C:\Users\48631\.agents\skills\session-reader\scripts\session-reader.js`
- 镜像创建：`skills/session-reader/scripts/session-reader.js`

**接口：**

```text
node session-reader.js read --file <文件> [--provider <名称>] [--query <词>] [--from <序号>] [--to <序号>] [--format json|markdown]
node session-reader.js read --provider <codex|claude|gemini> --session <会话ID> [同上选项]
```

- [x] 解析用户指定的 JSONL 和 Markdown 文件。
- [x] 识别 Codex rollout、Claude project JSONL 的可见 user/assistant 消息。
- [x] 对 Gemini 或未知厂商只在结构可识别时读取，否则返回明确的不支持原因。
- [x] 只按显式会话 ID 或文件路径定位，不做全盘内容搜索。
- [x] 用 SHA-256 记录来源指纹，不落盘原始内容。
- [x] 查询词只做字面范围筛选，不能伪装成语义专题识别。
- [x] 对系统、开发者、隐藏推理、工具原文和未识别事件标记省略原因。

### 任务 3：接入会话提炼

**文件：**

- 修改：`C:\Users\48631\.agents\skills\session-gotcha-extractor\SKILL.md`
- 镜像修改：`skills/session-gotcha-extractor/SKILL.md`

- [x] 要求涉及指定会话时先调用 `session-reader`。
- [x] 要求先展示来源、范围、消息数和覆盖边界，再开始提炼。
- [x] 将结果写为 `memory-put` 候选临时草稿，不直接修改正式 `MEMORY.md`。
- [x] 当前上下文无法提供完整原文时，必须标记“仅模型可见上下文”。

### 任务 4：更新项目文档与发布镜像

**文件：**

- 修改：`README.md`
- 修改：`MEMORY.md`
- 按需修改：`TODO.md`

- [x] 说明 `session-reader` 与 `session-gotcha-extractor` 的边界。
- [x] 说明 9 个原有 Skill 增加会话读取后变为 10 个 Skill，并补充对应 SVG 图示。
- [x] 记录默认不复制原始会话和真实厂商验收边界。
- [x] 中央源完成后运行备份式共享 Skill 同步脚本，核对 Gemini/Claude 端点哈希。

### 任务 5：隔离验收与交付

- [x] `node --check` 检查读取器和项目已有入口。
- [x] 用脱敏 JSONL/Markdown fixture 人工核对 JSON 与 Markdown 输出、范围筛选和未知格式告警。
- [x] 核对来源指纹、无原始快照写入、无全盘扫描和不暴露隐藏角色。
- [x] 核对 Skill 引用、中央源、仓库副本和共享端点的文件清单与哈希。
- [x] 交付真实 Codex/Claude/Gemini 会话读取仍需用户单独授权的说明。

## 明确不做

- 不把会话文件写入 `.agents/skills/<skill>`。
- 不自动复制厂商已有的原始会话记录。
- 不实现系统提示词或隐藏思维链导出。
- 不将“最近专题”自动识别包装成确定事实。
- 不引入向量库、知识图谱、任务队列、持久状态机或通用测试平台。
