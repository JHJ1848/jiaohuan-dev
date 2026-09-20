---
name: session-gotcha-extractor
plugin: jiaohuan-dev
description: "[jiaohuan-dev] 从开发和排查记录中提炼可复用的场景与避坑信息，按全局或项目范围保存。"
---

# 场景与陷阱提炼 (Gotcha Extractor)

遵循 `../../rules/engineering-principles.md` 与 `references/gotcha-contract.md`。本技能从会话记录中提取已确认的避坑信息，并按范围保存。

## 触发机制

1. **被动自感应触发**：在 `dev`（开发）或 `bugfix`（排障）过程中，AI 识别出具有高复用价值、严重易错痛点或架构反思意义的场景与坑点时自感应触发提炼。
2. **主动指令唤起**：用户明确指示“提取此场景经验”、“沉淀踩坑点”、“记录 gotcha”时触发。

## 双层存储路由策略 (Dual-tier Storage Routing)

提炼结果统一以标准 JSONL 追加存储，依据**通用性评估 (Generality Assessment)** 执行双层路由：

| 存储层级 | 物理存储路径 | 路由判定标准 | 核心价值 |
|---|---|---|---|
| **全局存储 (Global)** | `~/.agents/gotchas.jsonl` | 具备**跨工程、跨语言、跨技术栈的高度通用性**（如并发零负数原子守卫、不可变快照、环境编码防劫持、排查 3 次停手红线等设计模型） | 跨工程全局复用，驱动 Plugin 自身能力全局进化 |
| **项目存储 (Project)** | `<项目根目录>/.agents/gotchas.jsonl` | 与**当前项目强绑定**的特定业务逻辑、特定环境配置、私有 SDK/工具链依赖或该业务领域独有陷阱 | 服务当前工程上下文，防范全局知识库污染 |

## 核心执行链路

`场景识别 -> 通用性评估 (Global vs Project) -> 结构化提炼 -> gotcha.js 路由追加`

1. **场景识别 (Recognition)**：捕获上下文中的具体场景、异常表象、初始误判假设与真实根因；
2. **通用性评估 (Generality Assessment)**：对照决策树，判断归属于全局库 (`scope: "global"`) 还是项目库 (`scope: "project"`)；
3. **结构化提炼 (Extraction)**：按分类（`bugfix` / `dev` / `explore`）记录已确认事实、原因和约束。文字只保留能帮助后续排查的内容，不写套话和重复背景。
4. **路由追加 (Route & Append)**：调用 CLI 自动路由追加单行 JSONL 至对应存储库：
   ```bash
   # 项目级追加
   node skills/session-gotcha-extractor/scripts/gotcha.js append --scope project --category <bugfix|dev|explore> --title <标题> ...
   # 全局级追加
   node skills/session-gotcha-extractor/scripts/gotcha.js append --scope global --category <bugfix|dev|explore> --title <标题> ...
   ```
5. **规则更新**：确有长期复用价值时，才将条目补充到对应 Skill 或系统规则。

## 分类契约与边界红线

- **三大分类**：
  - `bugfix`：排障排错类（诊断顺序、误导表象、脱敏断言等）；
  - `dev`：功能实现类（平台/环境兼容、语言特性、架构规范等）；
  - `explore`：探索分析类（调用链梳理、只读边界、假设验证等）。
- **边界红线**：
  - 严禁记录 Token、密码、密钥等敏感凭据；
  - 严禁直接修改正式受控记忆 `docs/memory/` 或主记忆，正式架构变更必须通过 `memory-put` 审核归档；
  - 严禁注入未经本地验证的伪经验或推测结论；
  - 避免套话、空话和重复背景，条目只写事实、原因、处理和约束。
