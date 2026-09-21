# Project Memory CLI 接口契约规范

## 1. 概述
- **模块职责**: Project Memory 底层 Node.js 运行时统一命令行调用接口，负责记忆检索、临时草稿、正式归档、轮转归档与完整性检查。
- **调用方式**: `node skills/project-memory/scripts/project-memory.js <command> [options]`
- **返回格式**: JSON 结构体，标准退出码（成功 0，失败非 0）

---

## 2. 命令清单与参数契约

### 2.1 inspect (检查框架与策略)
- **命令**: `inspect [--project-root <路径>]`
- **输出关键字段**:
  - `status`: 检查状态（`inspected`）
  - `framework`: 框架双向绑定与就绪状态（`ready` | `requires_memory_mode` | `incomplete_links`）
  - `policy`: 当前记忆获取策略（`only_once` | `auto` | `manually` | `do_not_get`）

### 2.2 init (初始化或修复双向绑定)
- **命令**: `init [--mode migrate|keep|reset] [--confirm-reset] [--project-root <路径>]`
- **说明**: 自动完成 `docs/MEMORY.md` 与 `AGENTS.md` 的双向注册并初始化必要目录。

### 2.3 get (分层检索记忆)
- **命令**: `get [--query <关键词>] [--target <文档路径>] [--tree] [--manual] [--force] [--receipt <回执>] [--task <任务ID>]`
- **输出**: 匹配的主记忆、专题文档、变更明细或树状结构。

### 2.4 put (正式归档)
- **命令**: `put --task <主任务ID> --title <标题> --summary <摘要> --value <high|medium> [--target <路径>] [--explicit|--confirmed] [--replace --change-record <记录>]`
- **约束**: 强校验临时证据存在，必须进入 `docs/change/<专题>/` 并要求专题文档存在，默认生成四段式结构。

### 2.5 temp / draft / path (临时材料与路径追踪)
- **temp**: `temp --task <主任务ID> --file <相对文件名> --content <文本> --title <标题>`
- **draft**: `draft --task <主任务ID> --agent <代理名称> --file <相对文件名> --content <文本>`
- **path**: `path --task <主任务ID> --node <节点ID> [--parent <父节点ID>] --summary <描述> --status <已证实|已排除|待确认|已实施> [--conclusion <结论>]`

### 2.6 rotate / cleanup (轮转与历史清理)
- **rotate**: 执行受管临时材料自然周归档。
- **cleanup**: 清理超过 7 周的过期归档桶。
