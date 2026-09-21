# 2026-09-20 bugfix与dev技能通用化架构升维

- 摘要: 将 bugfix 与 dev 技能及其实施手册中的特定技术栈名词全面抽象升维为上层指导思想与架构设计模型，覆盖 Web、移动端 App、Windows 桌面客户端、游戏运行时及后台服务等多种开发场景，确立排查递进铁律、核心数值资源零负数原子守卫、快照不可变性及端协同通信等通用范式。
- 价值评估: high - 确立跨端多场景通用的工业级软件排查与受控开发实施架构标准
- 有效性: active
- 关联API: [project-memory-cli](../../api/project-memory-cli.md)
- 关联专题: [dev](../../memory/dev.md), [bugfix](../../memory/bugfix.md)

---

#### 一、问题/需求

落实治理中枢派发的架构升维指示，解决原有技能文档技术栈局限问题：
1. 原手册中存在较多具体技术栈实现细节（如特定 SQL 扣减语法、MyBatis XML、特定 Java 鉴权注解等），不符合本项目作为面向 Web、移动端 App、Windows 桌面客户端以及游戏等多种开发场景的通用 Plugin 定位；
2. 需将具体技术栈名词与操作细节升维为上层通用的策略指导、架构设计模型与标准化工作流节点。

---

#### 二、原因分析

1. **抽象层级不够**：此前编写侧重于典型后端工程范例，未将“库存扣减”抽象为“有界核心数值资源（库存/资产/生命值/体力/货币）的零负数原子守卫”；
2. **场景覆盖局限**：未将“快照防覆盖”抽象为“审计事实与关键结算流水的快照不可变性（Write-Once Invariant）”，未将“MyBatis 软删除”抽象为“原生/非托管数据查询中的显式防御策略”；
3. **端协同模型缺失**：未将“前后端交互”统一抽象为“客户端/表现层 (UI) 与 服务端/运行时 (Runtime)”的弱类型 falsy 与命名风格转换失配防御模型；
4. **环境边界未提炼**：未将终端编码问题抽象为“宿主环境/操作系统编码与命令行 I/O 劫持防护”。

---

#### 三、测试结果

1. **通用化重构与架构升维**：
   - 升级 `skills/bugfix/references/troubleshooting-playbook.md`，确立排查递进铁律（`<外部环境/宿主运行时 -> 真实数据流/Payload/状态流 -> 代码逻辑/执行链>`）、空数据三维穿透、Git 意图推测三大演进断层、端协同通信、底层去污优于代码过滤、连续 3 次排除停手红线；
   - 升级 `skills/bugfix/references/root-cause-analysis-card.md`，输出跨端通用的标准 RCA 根因分析卡模板；
   - 升级 `skills/bugfix/SKILL.md`，强化通用六要素执行链与手册索引；
   - 升级 `skills/dev/references/implementation-and-verification.md`，全面建立前置五维审视、外科手术式修改、结构与契约注释、数值资源零负数原子守卫、快照不可变性 (Write-Once Invariant)、非托管查询显式软删除补齐、结构化日志链与用户测试要点指引卡；
   - 升级 `skills/dev/SKILL.md`，对齐通用化开发实施规范与收尾审查门禁；
   - 升级 `docs/memory/bugfix.md` 与 `docs/memory/dev.md` 架构事实与变更索引；
2. **完整性校验**：
   - 执行 `node skills/project-memory/scripts/project-memory.js inspect --project-root .` 验证，Exit Code 0，全链路引用无断链。

---

#### 四、备注

1. **白名单合规**：严格遵守 Allowlist（`skills/bugfix/**`, `skills/dev/**`, `docs/memory/bugfix.md`, `docs/memory/dev.md`, `docs/change/dev/**`），统一使用 UTF-8 编码；
2. **执行准则**：在后续面向任何具体宿主与语言工程的缺陷排查与开发中，均以升维后的通用架构指导思想为行动基线。
