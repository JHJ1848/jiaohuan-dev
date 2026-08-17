# 叫唤-开发-工作流

这是一个版本化的本地技能(Skill)集合，用于沉淀“架构师 + 开发”的工程原则、开发/排障工作流和项目记忆约束。本仓库是未发布开发候选；用户授权发布后，`~/.agents/skills` 是已发布的唯一权威源。未经授权不提交、不同步全局技能(Skill)目录。

## Skill 专题图

以下概念图用黑底白字展示各专题的核心入口、流程和边界：

![workflow 专题图](docs/assets/skill-workflow.svg)

![dev 专题图](docs/assets/skill-dev.svg)

![debug 专题图](docs/assets/skill-debug.svg)

![bugfix 专题图](docs/assets/skill-bugfix.svg)

![project-memory 专题图](docs/assets/skill-project-memory.svg)

![memory-get 专题图](docs/assets/skill-memory-get.svg)

![memory-put 专题图](docs/assets/skill-memory-put.svg)

![session-gotcha-extractor 专题图](docs/assets/skill-session-gotcha-extractor.svg)

## 四层结构

1. **共享工程原则**：证据优先、先理解后修改、历史意图追溯、最小且可逆的改动、控制变量、按影响面验证和风险复核。
2. **工作流**：`workflow` 负责语义路由，`explore`、`debug`、`dev` 分别处理澄清、诊断和开发；`bugfix` 保留为兼容路由。
3. **项目记忆基础设施**：`project-memory`、`memory-get`、`memory-put`，以及其单一 CLI、策略、索引、临时证据与归档实现。
4. **证据提炼与外部引用**：`session-gotcha-extractor` 提炼历史会话；全局方法型技能(Skill)仅按需引用，不属于本插件。

`tools/project-memory-settings/`、`skills/project-memory/scripts/runtime/` 和 JSON 策略是第三层的实现，不是另一类技能(Skill)。

## 主链路

```text
开发：memory-get -> dev -> memory-put
诊断：memory-get -> debug -> memory-put
修复：memory-get -> debug -> dev -> memory-put
探索：memory-get -> explore -> memory-put
```

只有用户明确选择的独立任务或独立子会话拥有完整链路。异步子智能体(Agent)只写本任务的临时证据，主任务唯一负责 `memory-put` 和正式归档。状态机(State Machine)只存在于当前上下文；运行时不拥有智能体任务调度、租约或重试循环。用户手动触发保留轮转时，可在已验证归档后仅重试待完成的源材料清理。

## 项目记忆

`memory-get` 按受控索引读取最小必要规则和记忆，并在标签未命中时只扫描已登记文档的标题、摘要、检索词和路径摘要；`memory-put` 先记录临时证据，只有用户确认归档或明确要求记录时才评估价值并写入 `docs/`。正式归档必须关联主任务和至少一份受管临时证据，且会拒绝疑似凭据。`project-memory` 不保存跨智能体(Agent)的工作流状态。

主任务可维护 `path.json`，记录简短排查节点、父节点、状态、证据引用和结论；异步智能体(Agent)只能写临时草稿。路径摘要复用场景(Scene)既有六段，不建立第二索引。

用户明确查看文档结构时，使用只读标题树命令：

```bash
node skills/project-memory/scripts/project-memory.js outline --file skills/debug/SKILL.md --depth 3
```

它只返回标题、层级和行号；内部按需读取文件但不返回正文，不创建索引、不改变记忆策略。需要完整枝叶时将 `--depth` 调到 `6`。标题树是导航摘要，不是事实验证。

正式文档只能位于目标项目 `docs/`：

- `docs/MEMORY.md` 与根 `AGENTS.md` 以相对路径双向索引。
- `docs/memory/` 保存可复用的专题、功能和场景(Scene)记忆；`docs/change/` 保存一次变更的范围、决策、验证和历史关联。
- 已注册有效索引优先；两个未注册候选同时存在时优先 `docs/MEMORY.md`。索引冲突停止并请求用户决定。
- 既有记忆只能经 `migrate`、`keep` 或双确认 `reset` 处理；不自动物理删除旧记忆。

场景(Scene)是完整正式记录，陷阱(Gotcha)是固定第六段，内容可空。遗留 `gotcha-index` 仅用于迁移，退出正式主链。

策略文件为 `<project>/.agents/project-memory/memory-policy.json`，`memory_get_mode` 可为 `only_once`、`auto`、`manually`、`do_not_get`，默认 `auto`。`only_once` 检索回执(receipt)只是当前上下文的去重提示，不是检索完成或事实正确的证明；`manually` 的普通查询使用 `--manual`，记忆树查询视为用户主动请求。

```bash
node skills/project-memory/scripts/project-memory.js path \
  --task <任务> --node A --summary '简短节点摘要' \
  --status 已证实 --evidence evidence.md --conclusion '结论'
```

## 命令行(CLI)与图形界面(GUI)

统一入口为 `skills/project-memory/scripts/project-memory.js`。本地图形界面(GUI)位于 `tools/project-memory-settings/`，仅绑定 `127.0.0.1`，经统一入口读取策略、轮转和清理；它不直接写正式记忆、不注册计划任务、不修改全局智能体(Agent)设置。

接口证据使用 `skills/debug/scripts/http-check.sh`。请求体放入临时文件，敏感请求头只通过 `--secret-header` 环境变量传入；写请求和读请求分别执行并断言关键字段，失败回到 `debug`。真实请求必须先得到用户对目标环境的明确授权。

```bash
bash skills/debug/scripts/http-check.sh \
  --url "$BASE_URL/<path>" \
  --method POST \
  --header 'Content-Type: application/json' \
  --secret-header 'Authorization=API_TOKEN' \
  --data-file "$REQUEST_FILE" \
  --expect-status 200 \
  --expect-contains '关键字段'
```

## 发布边界

隔离样例已人工验收 CLI 初始化、双向索引、四种读取策略、标题树、主/子任务草稿、确认归档、GUI 回环接口、七日周归档、七周清理和 HTTP 脱敏请求检查。它不是目标项目的真实业务验收。

发布时按单向路径执行：仓库开发候选 -> `~/.agents/skills` 发布源 -> 各 Agent 端点；覆盖前先备份，禁止两处手工漂移。同步逻辑不属于项目记忆运行时。`plugin.json` 只保留已确认字段，宿主规范未核实前不猜测版本或能力字段。Git 首个基线提交另需用户授权。
