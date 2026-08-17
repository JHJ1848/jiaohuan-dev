# 项目记忆与备忘录 (MEMORY.md)

该文档用于记录本项目（叫唤-开发-工作流）在开发过程中的重要业务逻辑、架构决定、问题排查记录及未形成文档的知识点。

## 架构与背景
- **项目定位**：作为 Antigravity 的插件包，集合“叫唤-开发-工作流”的自定义技能(Skill)与规则(Rule)。
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
