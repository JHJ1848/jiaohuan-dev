# 叫唤-开发-工作流

这是一个跨宿主插件(Plugin)，内部包含多个可独立触发的技能(Skill)，用于沉淀“架构师 + 开发”的工程原则、开发/排障工作流和项目记忆约束。`~/.agents/skills` 是共享 Skill 源；`.codex-plugin/` 与 `.claude-plugin/` 是宿主插件清单，插件只负责合集身份、版本和自动发现，不把多个 Skill 合并成一个文件。

## Skill 专题图

`docs/assets/` 当前包含以下 9 张 SVG。文件名与 Skill 名称一一对应，表中说明用于快速定位；具体执行规则以对应 `SKILL.md` 和工程原则为准。

| 图示文件 | 对应 Skill | 作用说明 |
| --- | --- | --- |
| [`skill-workflow.svg`](docs/assets/skill-workflow.svg) | `workflow` | 按任务语义选择最小闭环；有实施变更时在归档前增加 `code-review` 收尾节点，不维护持久状态机(State Machine)或调度器。 |
| [`skill-explore.svg`](docs/assets/skill-explore.svg) | `explore` | 目标、范围或历史意图不清时只读梳理现状和未知项，决定转入 `bugfix`、`dev` 或停止。 |
| [`skill-dev.svg`](docs/assets/skill-dev.svg) | `dev` | 计划确认后实施最小、可逆改动，保持时序、数据和影响面不变量；出现计划外疑点时回交 `bugfix`。 |
| [`skill-bugfix.svg`](docs/assets/skill-bugfix.svg) | `bugfix` | 负责缺陷取证、根因确认和修复前分析，再连接用户确认、`dev`、`code-review` 和 `memory-put`。 |
| [`skill-project-memory.svg`](docs/assets/skill-project-memory.svg) | `project-memory` | 约束项目记忆的读取、任务交接和确认后归档边界，不接管任务调度，也不建立平行索引。 |
| [`skill-memory-get.svg`](docs/assets/skill-memory-get.svg) | `memory-get` | 开发或诊断前读取规则、主记忆和已登记匹配文档的最小相关上下文；用户明确请求时可查看记忆树。 |
| [`skill-memory-put.svg`](docs/assets/skill-memory-put.svg) | `memory-put` | 汇总任务临时证据，经价值评估和用户确认后写入 `docs/` 正式记忆；未确认时只保留临时材料。 |
| [`skill-session-gotcha-extractor.svg`](docs/assets/skill-session-gotcha-extractor.svg) | `session-gotcha-extractor` | 在工程开发与排查过程中自感应提炼高价值场景与避坑经验，或在用户明确指令下沉淀 Gotcha 记录并反向赋能工作流。 |

以下概念图用黑底白字展示各专题的核心入口、流程和边界：

![workflow 专题图](docs/assets/skill-workflow.svg)

![explore 专题图](docs/assets/skill-explore.svg)

![dev 专题图](docs/assets/skill-dev.svg)

![bugfix 专题图](docs/assets/skill-bugfix.svg)

![project-memory 专题图](docs/assets/skill-project-memory.svg)

![memory-get 专题图](docs/assets/skill-memory-get.svg)

![memory-put 专题图](docs/assets/skill-memory-put.svg)

![session-gotcha-extractor 专题图](docs/assets/skill-session-gotcha-extractor.svg)

## 四层结构

1. **共享工程原则**：证据优先、先理解后修改、历史意图追溯、最小且可逆的改动、控制变量、按影响面验证和风险复核。
2. **工作流**：`workflow` 负责语义路由，`explore`、`bugfix`、`dev` 分别处理澄清、缺陷分析和开发。
3. **项目记忆与轻量存储**：`project-memory`、`memory-get`、`memory-put`，以及其单一 CLI、策略、索引、任务临时证据、路径摘要与归档实现。
4. **经验提炼与外部引用扩展**：`session-gotcha-extractor` 提炼场景(Scene)和陷阱(Gotcha)；`code-review` 与 `requesting-code-review` 提供独立收尾审查；全局方法型技能(Skill)仅按需引用，不属于本插件。

`tools/project-memory-settings/`、`skills/project-memory/scripts/runtime/` 和 JSON 策略是第三层的实现，不是另一类技能(Skill)。入口 `SKILL.md` 只保留触发、边界和交接；不可省略的执行规则位于 `rules/engineering-principles.md` 及各 Skill 的 `references/`，随插件一起发布。

## 插件命名空间

本项目的发布单位是插件，Skill 仍按目录独立维护：

- Claude Code：插件名为 `jiaohuanworkflow`，使用 `jiaohuanworkflow:<skill>`，例如 `jiaohuanworkflow:bugfix`。
- Codex：使用 `jiaohuan-develop-workflow:<skill>`，例如 `jiaohuan-develop-workflow:bugfix`。
- Gemini、Claude、Codex 的裸目录副本仅用于共享发布和兼容发现，唯一 Skill 源仍是 `~/.agents/skills`，不得在端点手工修改。

Claude 插件根目录包含 `.claude-plugin/plugin.json` 和 `skills/`；Codex 插件根目录包含 `.codex-plugin/plugin.json` 和同一份 `skills/`。同一套能力可被不同宿主按各自命名空间发现。

## 主链路

```text
开发：memory-get -> dev -> code-review -> memory-put
诊断：memory-get -> bugfix -> memory-put
修复：memory-get -> bugfix -> dev -> code-review -> memory-put
探索：memory-get -> explore -> memory-put
```

多个独立目标或并行请求，先由用户选择主智能体(Agent)串行、异步子智能体(Agent)取证或独立子会话/任务，三种模式不得混用。主智能体(Agent)串行的每个独立任务和独立子会话都拥有完整链路；异步子智能体(Agent)只写本任务的临时证据，主任务唯一负责 `memory-put` 和正式归档。运行时不维护持久流程状态机(State Machine)、任务调度、租约或重试；主任务的 `temp/<task>/path.json` 是可落盘的临时跨智能体(Agent)子上下文，按保留策略处理。用户手动触发保留轮转时，可在已验证归档后仅重试待完成的源材料清理。

## 项目记忆

`memory-get` 按受控索引读取最小必要规则和记忆，并在标签未命中时只扫描已登记文档的标题、摘要、检索词和路径摘要；`memory-put` 先记录临时证据，只有用户确认归档或明确要求记录时才评估价值并写入 `docs/`。正式归档必须关联主任务和至少一份受管临时证据，且会拒绝疑似凭据。`project-memory` 不保存跨智能体(Agent)的工作流状态。

主任务可维护 `path.json`，记录简短排查节点、父节点、状态、证据引用和结论；异步智能体(Agent)只能写临时草稿。路径摘要复用场景(Scene)既有六段，不建立第二索引。

用户明确查看文档结构时，使用只读标题树命令：

```bash
node skills/project-memory/scripts/project-memory.js outline --file skills/bugfix/SKILL.md --depth 3
```

它只返回标题、层级和行号；内部按需读取文件但不返回正文，不创建索引、不改变记忆策略。需要完整枝叶时将 `--depth` 调到 `6`。标题树是导航摘要，不是事实验证。

正式文档只能位于目标项目 `docs/`：

- `docs/MEMORY.md` 与根 `AGENTS.md` 以相对路径双向索引。
- `docs/memory/` 保存可复用的专题、功能和场景(Scene)记忆；`docs/change/` 保存一次变更的范围、决策、验证和历史关联。
- 已注册有效索引优先；两个未注册候选同时存在时优先 `docs/MEMORY.md`。索引冲突停止并请求用户决定。
- 既有记忆只能经 `migrate`、`keep` 或双确认 `reset` 处理；不自动物理删除旧记忆。

场景(Scene)是完整正式记录，陷阱(Gotcha)是固定第六段，内容可空。遗留 `gotcha-index` 仅用于迁移，退出正式主链。

同标题场景摘要变化时，`put` 默认返回替代确认，不会静默追加或覆盖；核对历史并先建立 `docs/change/` 记录后，用 `--replace --change-record docs/change/<记录>.md` 明确覆盖，或以新标题写入并关联 `superseded`。物理删除只在用户单独确认且已有备份时进行。

策略文件为 `<project>/.agents/project-memory/memory-policy.json`，`memory_get_mode` 可为 `only_once`、`auto`、`manually`、`do_not_get`，默认 `auto`。`only_once` 检索回执(receipt)只是当前上下文的去重提示，不是检索完成或事实正确的证明；`manually` 的普通查询使用 `--manual`，记忆树查询视为用户主动请求。

```bash
node skills/project-memory/scripts/project-memory.js path \
  --task <任务> --node A --summary '简短节点摘要' \
  --status 已证实 --evidence evidence.md --conclusion '结论'
```

## 命令行(CLI)与图形界面(GUI)

统一入口为 `skills/project-memory/scripts/project-memory.js`。本地图形界面(GUI)位于 `tools/project-memory-settings/`，仅绑定 `127.0.0.1`，经统一入口读取策略、轮转和清理；它不直接写正式记忆、不注册计划任务、不修改全局智能体(Agent)设置。

接口证据使用外部命令或项目现有工具。请求体放入临时文件，敏感请求头只通过环境变量传入；写请求和读请求分别执行并断言关键字段，失败回到 `bugfix`。真实请求必须先得到用户对目标环境的明确授权。

```bash
```

## 发布边界

隔离样例已人工验收 CLI 初始化、双向索引、四种读取策略、标题树、主/子任务草稿、确认归档、GUI 回环接口、七日周归档、七周清理和 HTTP 脱敏请求检查。新增的 `--replace --change-record` 仅完成静态核查，待用户授权的隔离样例人工验收。以上均不是目标项目的真实业务验收。

发布时按单向路径执行：`~/.agents/skills` 共享发布源 -> Git 仓库及宿主插件副本 -> Gemini、Claude 等 Agent 端点；覆盖前先备份，禁止两处手工漂移。同步逻辑不属于项目记忆运行时。Codex 与 Claude 的 `plugin.json` 均只声明宿主认可的插件元数据，不把运行时规则重复写入清单。当前 Claude 本地插件已安装为 `jiaohuanworkflow@jiaohuanworkflow`；后续版本仍需从中央源重新同步并重新安装。
