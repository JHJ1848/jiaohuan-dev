# 项目记忆与备忘录 (MEMORY.md)

该文档用于记录本项目（叫唤-开发-工作流）在开发过程中的重要业务逻辑、架构决定、问题排查记录及未形成文档的知识点。

## 架构与背景
- **项目定位**：跨宿主插件包，集合“叫唤-开发-工作流”的自定义技能(Skill)与规则(Rule)。`main` 分支服务 Claude Code 与 Codex（并保留 Antigravity 根清单）；`ZCode` 分支专精 ZCode 宿主，已移除 Antigravity 清单，插件源经 `tools/export-zcode.js` 导出到 `~/.zcode/plugin-workspace/jiaohuan-develop-workflow`。
- **使用方式**：可以被其他项目通过 `plugins.json` 引用或者放置在全局配置中。

## 变更记录

### 2026-08-10
- 初始化项目结构，建立 `plugin.json`、`README.md`，并创建了 `skills/` 目录。
- 创建了基础示例技能 `example-skill`；该非生产示例已于 2026-08-17 移出发布包。
- 集成了远程技能 `project-memory` (项目记忆维护规范)。
- 集成了远程技能 `bugfix` (故障排查与修复流程)。
- 提取并集成了 `session-gotcha-extractor` 技能，并对其进行了初版优化调整。
- **构建防坑网络**：在 `session-gotcha-extractor`、`bugfix` 和 `project-memory` 之间建立起了互相调用的闭环网络。排障时可先查陷阱，提炼日志时强制过滤陷阱，提炼后联动记忆落盘。

### 2026-08-13
- **项目记忆(Project Memory)拆分**：将单体 `project-memory` 收敛为轻量语义路由，新增 `memory-get` 与 `memory-put`；每个独立任务遵循 `memory-get -> dev/debug -> memory-put`，主技能(Skill)不持久化跨智能体(Agent)状态机。
- **运行时与索引**：新增统一 Node.js 路由器 `skills/project-memory/scripts/project-memory.js`，在目标项目 `.agents/project-memory/` 管理策略和临时材料；支持 `AGENTS.md` / `MEMORY.md` 双向相对索引、既有记忆的 `migrate|keep|reset` 选择、受控 `docs/` 正式落点和专题/功能索引注册。
- **归档边界**：工作中只写任务临时草稿；任务结束后需用户确认或明确要求记录，再执行“价值评估”。场景(Scene)是完整记录，陷阱(Gotcha)是固定第六段，内容可空，暂不维护平行索引。临时材料保留 7 天，随后按 ISO 自然周 ZIP 归档，最多保留 7 个受管周桶；未知文件、链接和不完整归档保留并报告。
- **本地图形界面(GUI)**：新增 `tools/project-memory-settings/`，仅绑定回环地址，通过统一脚本读取/修改 JSON 策略及手动轮转/清理；未注册或同步至全局智能体(Agent)目录，未提交或推送 Git。
- **当时验证边界**：初次实现时未运行 Node.js 脚本、图形界面(GUI)或自动测试；后续隔离验收已记录于 `docs/change/2026-08-17-runtime-acceptance-routing-and-path.md`。

### 2026-08-14
- **运行时模块化**：保留 `skills/project-memory/scripts/project-memory.js` 作为唯一稳定命令行(CLI)与图形界面(GUI)调用入口；将内部职责分为 `runtime/` 下的安全文件操作、框架、检索、任务草稿、正式记录、归档保留、检查、常量和命令分发模块，便于独立复用且不引入第二个外部写入入口。
- **归档完整性加固**：周归档清单记录 ZIP 与任务文件的 SHA-256/大小；源文件在复制和删除前都会复核。替换失败后的 `.replace-*` 恢复备份保留，清理会报告并跳过含此类备份的桶；已发布但未能清源的任务会在后续轮转中重试。
- **证据路径修正**：正式场景(Scene)的证据草稿统一以项目根为相对路径根，记录 `.agents/project-memory/temp/<task-id>/<file>`，避免只保留无法定位的裸文件名。
- **显式记忆树**：`memory-get` 新增简化命令 `get --tree --query <关键词>`，仅供用户明确要求查看相关记忆时使用；从受控索引提取主记忆、匹配专题及其直接子功能的树状分支和正文，不改变默认最小检索。
- **当时验证边界**：本次初始实现仅完成模块依赖、导入导出、归档调用链和文本编码的静态审阅；后续隔离验收已记录于 `docs/change/2026-08-17-runtime-acceptance-routing-and-path.md`。

- **工作流实现**：集合明确为四层：共享工程原则、`workflow`/`dev`/`debug` 工作流、项目记忆基础设施、证据提炼/外部引用。`bugfix` 降为兼容路由；主链路为开发 `get -> dev -> put`、诊断 `get -> debug -> put`、修复 `get -> debug -> dev -> put`。异步子智能体(Agent)只交临时证据，主任务唯一归档；状态机(State Machine)仅在上下文中存在，运行时只保留被动证据清单，不接管智能体任务重试。
- **场景(Scene)与文档边界**：场景固定为“场景与目标、已证实事实与证据、处理与决策、结果与验证、边界与未知、陷阱(Gotcha)”六段；第六段内容可空。遗留 `gotcha-index` 仅作迁移输入。正式记录只进 `docs/`，`docs/memory/` 保存长期知识，`docs/change/` 保存变更轨迹；旧记忆不自动物理删除。初次实现仅有静态审阅，后续隔离验收已完成。
- **链路约束收紧**：手动模式通过 `get --manual` 明确查询，`get --tree` 视为用户主动查看记忆；普通读取返回选中文档正文，显式目标只允许主记忆或受控索引已登记文档。正式归档必须关联主任务与至少一份受管临时证据。索引冲突和旧记忆待选择时不创建运行时策略文件。
- **中文交付**：主链运行时与本地图形界面(GUI)的用户可读提示统一为中文；状态码、字段名、策略值、命令和路径保持机器兼容。

### 2026-08-17
- **脱敏接口证据**：从历史接口排障对话提炼最小请求卡、写请求 -> 读请求 -> 断言循环和失败回交规则；真实地址、令牌、账号、密码、Cookie、长 ID 与完整响应不进入 Skill 或记忆。详见 `docs/memory/debug-http-replay-and-redaction.md`。
- **按需标题树**：新增 `project-memory.js outline --file <项目内 Markdown> --depth <1-6>`，只读解析 ATX H1-H6，跳过 YAML 头和符合 Markdown 闭合规则的代码围栏，返回标题、层级和行号；内部按需读取文件但不返回正文，不创建全仓缓存，不替代 `get --tree` 的受控记忆索引。详见 `docs/decisions/2026-08-17-debug-evidence-and-markdown-outline-design.md`。
- **当时验证边界**：新增 `skills/debug/scripts/http-check.sh` 使用环境变量秘密请求头、状态码和文本断言；初次实现未运行 Node、Bash、真实登录或接口请求，后续隔离验收已记录于 `docs/change/2026-08-17-runtime-acceptance-routing-and-path.md`。

### 2026-08-17（运行时验收与路由收敛）
- **隔离验收**：已手工运行 CLI、GUI、轮转和 HTTP 工具。初始化、双向索引、四种读取策略、标题树、子智能体(Agent)草稿、确认归档、周 ZIP 和七周清理均有夹具输出；真实业务项目仍需单独授权验收。
- **检索与路径**：普通 `get --query` 与 `get --tree` 都会在受控索引文档的标题、摘要、检索词和路径摘要中选候选。主任务新增 `path.json`，只记录节点、父节点、状态、证据引用和结论；正式场景(Scene)把终点和排除结论折叠进现有事实、路径摘要和检索词。
- **归档保护**：正式 `put` 在创建目标前扫描字段和受管草稿；命中授权头、Cookie、JWT、密码或常见密钥特征时拒绝归档并要求人工脱敏，不回显值。
- **兼容性与宿主核验**：带 UTF-8 BOM 的 `task.json` 可继续读取；`plugin.json` 可解析且目前只含已确认的 `name`。本机 Antigravity 样例存在版本、描述、作者、许可证和关键词字段，未发现统一能力字段，故未猜测扩展。
- **复审修正**：标题树只接受符合闭合规则的同字符围栏；HTTP 工具拒绝在普通 `--header` 中传递常见凭据头，避免调用方把令牌直接写入脚本参数。
- **工作流**：新增只读 `explore`，统一链路增加探索；`workflow` 每次交付路由、依据、边界和下一关。`bugfix` 保留兼容入口，移除重复 Gotcha 导出脚本和派生索引；`project-memory` 保留唯一迁移工具。
- **发布边界**：已建立 Git 基线并推送 `origin/main`；未同步至 `~/.agents/skills`、未改写 `plugin.json` 的发布动作仍需单独确认。

### 2026-08-17（Codex 插件命名空间）
- **合集发布**：新增 `.codex-plugin/plugin.json`，Codex 插件入口使用 `jiaohuan-develop-workflow:<skill>`；`.agents/skills` 保留同源裸名称副本供其他 Agent 使用。插件副本携带 `skills/`、`rules/` 和 `tools/`，避免发布时丢失依赖。

### 2026-08-17（完整工作流规则回填）
- **短入口、完整合同**：原版 `bugfix` 和 `project-memory` 的细节不再堆入入口文件；`rules/engineering-principles.md` 成为宏观工程原则唯一权威，`debug`、`dev`、`memory-get`、`memory-put` 的 `references/` 承担按需执行合同。各 Skill 到规则的相对路径统一为 `../../rules/engineering-principles.md`，兼容仓库、`.agents` 与 Codex 插件三种布局。
- **诊断与开发**：补回场景-目标卡、L1-L4 影响分流、事件止损、单假设证据循环、三次独立排除后的停手求助、Git/change 历史取证、最小可逆修改、日志、最小 HTTP 请求对和按影响面复核；不恢复持久状态机、未经证实的兜底或平行 Gotcha 索引。
- **记忆与协作**：明确多任务先由用户选择串行、异步取证或独立子会话；完整 `get -> 工作流 -> put` 仅属于独立任务。补全初始化选择、双向索引、四种读取策略、用户可见标题树、价值评估四项标准、六段场景合同、输出记忆引用和七日/七周保留规则。
- **过期记录**：同标题但摘要变化的归档默认拒绝覆盖，返回替代确认；只有先建立 `docs/change/` 记录并提供 `put --replace --change-record <记录>` 后才替换场景正文。物理删除仍需用户单独确认和备份。
- **验证边界**：上述规则回填和替代流程已通过 Node 语法、相对引用、插件清单和多端点哈希核对；`--replace --change-record` 尚待用户授权的隔离样例人工验收，未执行真实项目或 HTTP 请求。
- **自动化边界**：HTTP 循环复用最小 Bash 请求；令牌默认走环境变量。仅在用户授权时以任务级临时命令完成登录换令牌，不沉淀凭据，也不扩展为通用登录平台；重要变更记录可按需保存少量脱敏源码快照或精确路径。

### 2026-08-17（需求收敛与发布去重）
- **任务边界**：明确主智能体(Agent)串行的每个独立任务也必须执行完整 `memory-get -> 工作流 -> memory-put`；`path.json` 是可落盘的任务级临时跨智能体(Agent)子上下文，不是流程状态机(State Machine)。
- **约束优先级**：`AGENTS.md` 约束与 `MEMORY.md` 事实、目标或范围冲突时一律停止并请求用户裁决，不允许记忆覆盖项目约束。
- **Codex 去重**：为保留插件命名空间，已将九个同名裸 Skill 从 `~/.codex/skills/` 备份并移入 `skills-disabled/`；Codex 仅由插件提供本合集，跨 Agent 共享继续以 `~/.agents/skills/` 为唯一源。
- **文档术语**：主分支 Skill 与参考文档固定使用简洁中文，通用术语首次写作“中文(English)”，英文版本留给独立分支；新增名词不得制造无边界的同义词。
- **发布版本**：规则、Skill、插件源与各共享端点经备份式同步；Codex 插件以 `0.2.1+codex.20260817110159` 安装，插件缓存携带 `skills/`、`rules/` 与 `tools/`。

### 2026-08-18（Skill 专题图核对）
- **资产清单**：当前 `docs/assets/` 中 10 张 Skill SVG 与 10 个 Skill 一一对应；结构核对未发现缺失或多余文件。
- **文档入口**：README 列出 10 张图的文件链接、对应 Skill 和职责说明；图示仅作导航，执行规则仍以各 `SKILL.md` 与 `rules/engineering-principles.md` 为准。

### 2026-08-18（新会话 Skill 合集必读规则注入）
- **跨平台规则同步**：在 AGY (`GEMINI.md`)、Codex (`AGENTS.md`)、Claude (`AGENTS.md`) 以及全局中央配置 (`~\.agents\AGENTS.md`) 中明确追加“jiaohuan-develop 合集感知”硬性规则。
- **规则要求**：开启新会话或接收任务时，必须主动阅读一次当前项目（叫唤-开发-工作流 / jiaohuan-develop）的所有 Skill 集合（即 `./skills/` 目录下的所有 `SKILL.md`），明确技能清单与协作网络，禁止跳过已有工作流进行盲目推测。

### 2026-08-18（会话读取与提炼分层）
- **新增 `session-reader`**：只读用户指定的 Codex、Claude、Gemini 或导出文件，输出带来源指纹、范围和省略边界的 `session-packet`；默认不复制厂商原始会话，不写 `.agents/skills/` 或正式 `docs/`。
- **提炼交接**：`session-gotcha-extractor` 在提炼历史会话前先读取 `session-reader`，区分用户原文、AI 可见回复、工具证据、用户推测和未闭环问题，结果仍交由 `memory-put`。
- **读取器边界修正**：`session-reader` 的 Markdown 适配器兼容 `用户(user)`、`助手(assistant)` 双语标题，并会显式丢弃系统(system)、开发者(developer)和工具(tool)段落，避免隐藏内容混入可见消息。
- **专题图同步**：新增 `skill-explore.svg`、`skill-session-reader.svg`，并更新工作流(Workflow)、会话提炼与项目记忆(Project Memory)图，反映 Explore 路由、会话包交接和主任务唯一归档边界；10 个 Skill 均有导航图。
- **发布边界**：当前实现包含通用 JSONL/Markdown 读取和 Codex/Claude 可见消息识别；Gemini 和真实宿主会话仍需用户授权的隔离样例人工验收。厂商路径变化只修改读取适配器，不重复保存原始记录。

### 2026-08-18（归档前代码审查节点）
- **工作流收尾**：有可审查实施变更的开发与缺陷修复链路在 `dev` 后、`memory-put` 前新增 `code-review`；仅文档整理、仅诊断和探索保持原链路。实施变更未完成独立审查时不得静默归档。
- **审查适配**：已提交且基点明确的变更可复用全局 `code-review` 的规格(Spec)/规范(Standards)双轴；未提交变更按 `requesting-code-review` 传递 `git diff HEAD`（含 staged/unstaged）、`git status --short`、未跟踪文件内容、需求/计划和工作区状态请求独立审查。无统一 issue tracker 时以用户确认需求和实施计划作为 Spec；审查按 `memory-get` 策略复用历史场景(Scene)、陷阱(Gotcha)、`docs/change/` 与 Git 约束，并把报告写入临时证据和 `path.json`。
- **风险回流**：阻断、重要或未证实发现分别回到 `dev` 或 `debug`，修复后重新审查；`project-memory` 仅提供记忆检索与归档契约，不维护审查状态。

### 2026-08-21（跨宿主插件与开发规范）
- **插件化发布**：项目发布单位明确为跨宿主插件(Plugin)，内部保留独立可触发的 Skill；新增 `.claude-plugin/plugin.json`，与 `.codex-plugin/plugin.json` 共同声明宿主元数据。Claude 使用 `jiaohuanworkflow:<skill>`，Codex 保留 `jiaohuan-develop-workflow:<skill>` 兼容命名空间，`~/.agents/skills` 仍是共享 Skill 源。
- **开发约束补全**：`dev` 及其实施参考补充新增功能审视卡、魔法值(Magic Value)治理、方法规模与最小封装边界、关键节点日志链，以及“基线复现 -> 单因修改 -> 精确验证 -> diff/日志核对”的修改-验证循环。未获用户授权不发送真实请求；秘密只经环境变量传递。
- **视觉导航**：`README.md` 已登记 `workflow`、`explore`、`dev`、`debug`、`bugfix`、`project-memory`、`memory-get`、`memory-put`、`session-reader`、`session-gotcha-extractor` 共 10 张 SVG 专题图。图示只负责导航，规则以 `rules/engineering-principles.md` 和各 Skill 参考文档为准。
- **交付材料**：已生成桌面技术博客 `jiaohuanworkflow-plugin-architecture.md`，用于说明 Plugin/Skill 分层、记忆闭环、并行边界、证据归档和跨宿主命名空间；博客链接至 `https://github.com/JHJ1848/jiaohuan-dev`，不包含本机绝对路径、凭据或业务私密信息。

### 2026-08-27（ZCode 宿主分支）
- **ZCode 分支差异化**：从 `main` 拉出 `ZCode` 分支，新增 `.zcode-plugin/plugin.json`（插件名 `jiaohuan-develop-workflow`，版本 `0.3.0+zcode.20260827094452`，声明 `skills` 与 `hooks` 组件）；ZCode 原生识别 `.zcode-plugin/` 清单并兼容 `.claude-plugin/`、`.codex-plugin/`。
- **合集感知 Hook**：新增 `hooks/hooks.json` + `hooks/session-start.js`，在 SessionStart（startup/resume/clear/compact）经 `hookSpecificOutput.additionalContext` 注入只读提醒：动态枚举 `skills/` 下 SKILL.md 清单与主链路，落实“新会话必读合集”规则。Hook 采用 `process` 类型避免 shell/exec-bit 跨平台问题；不写文件、不维护状态、失败静默退出。
- **session-reader 增加 `zcode` 来源**：真实 ZCode rollout 位于 `~/.zcode/cli/rollout/model-io-sess_<id>.jsonl`，每行是一条 `model_io` 记录（`request.messages` 为完整历史快照，`response.text` 为该次可见助手输出）。适配器按“首次出现”重建可见对话并全局去重，system 角色、工具块、思考块只计入省略；同会话字面完全相同的重复消息只保留第一次，需保留刻意重复时改用 `--file` 导出副本。
- **验证边界**：`node --check`、清单 JSON/name 正则、hook 手工运行（严格 schema 输出 + 退出码 0）、`inspect/read --provider zcode` 对本机真实 rollout 只读冒烟验收均通过；跨机器、历史 ZCode 版本格式未验收，用于正式提炼前仍需人工确认。README 已补充 ZCode 命名空间、ZCode Hook 安装与差异化边界章节。
- **稳定导出副本**：为避免 Git 工作区分支切换影响宿主引用，ZCode 插件源固定使用仓库外导出副本 `~/.zcode/plugin-workspace/jiaohuan-develop-workflow`（含 `.zcode-plugin/`、`hooks/`、`skills/`、`rules/`、`tools/`、`README.md`、来源指纹 `EXPORT-INFO.md`），导出后已验证 hook 与 project-memory CLI 可独立运行且 CLI 正确按目标项目作用域拒绝插件目录内路径；禁止把 Git 工作区直接注册为插件源，更新时重新导出覆盖。
- **市场清单修正**：ZCode 客户端 “+” 入口添加的是插件市场，要求目录根部存在 `marketplace.json`（`{ name, plugins[], pluginRoot? }`），单插件目录会报 “Marketplace manifest not found”。已在仓库根新增 `marketplace.json`（市场 `jiaohuan-local`，插件 `jiaohuan-develop-workflow`，`source: "./"`）并重新导出；不在 `.zcode-plugin/` 内放第二份清单，避免相对路径基准歧义。插件安装后身份为 `jiaohuan-develop-workflow@jiaohuan-local`。
- **内外副本统一与 AGY 清理**：新增 `tools/export-zcode.sh` 作为仓库 -> 导出副本的唯一同步路径（仅允许在 ZCode 分支执行，自动写入来源分支/提交/时间），导出内容与工作区已 diff 校验一致。ZCode 分支移除根 `plugin.json`（Antigravity 清单，`main` 分支仍保留）；`MEMORY.md` 架构定位与 `TODO.md` 验收清单同步改为 ZCode 口径。全仓审计后，历史变更记录（2026-08-17/2026-08-18）中的 Antigravity 字样属当时事实，保留不改写；`.agents/` 下 AGY 会话记录是本机 gitignore 材料，不入库也不属于插件发布内容。
- **Node 一键导出与客户端验收**：以跨平台 `tools/export-zcode.js` 取代 `export-zcode.sh`（无 Git Bash 依赖，支持 `--dest`/`--force`，导出后打印 ZCode 客户端市场安装指引）；提交推送后经 `jiaohuan-local` 市场安装成功，客户端会话中确认 SessionStart 合集感知注入与 10 个技能可见，TODO 对应验收项已勾选。
- **README 安装指南**：原 `ZCode Hook` 章节扩写为完整 `ZCode 安装指南`：前置条件（ZCode 客户端、Node >= 16.7、Git 可选）、四步安装（检出 ZCode 分支 -> `node tools/export-zcode.js` 导出 -> 客户端 “+” 添加 `jiaohuan-local` 市场并安装 -> 三项验证）、更新与卸载、常见问题表（含 “Marketplace manifest not found” 的成因与处理）、Hook 设计边界；导出副本已同步。
