# 专题受控记忆: debug-http-replay-and-redaction

本文档为 `debug-http-replay-and-redaction` 专题的受控记忆，记录 HTTP 接口排障脱敏规范、写读断言回放循环与敏感请求头隔离治理。

---

## 一、专题架构与职责 (Architecture & Scope)

- **专题标识**: `debug-http-replay-and-redaction`
- **核心职责**: 开发或排障中验证真实 HTTP/API 接口时，规范脱敏路径、隔离认证凭据、执行“写请求 -> 读请求 -> 断言”自闭环循环，防止敏感信息泄漏与盲目猜测。
- **物理白名单范围**: 
  - `docs/memory/debug-http-replay-and-redaction.md`
  - `skills/debug/**`
  - `tools/http-check.sh`

---

## 二、核心规范与脱敏规则 (Core Specifications & Redaction)

1. **最小请求与脱敏规范**:
   - 网页复制的请求通常包含大量浏览器临时无关头（如 User-Agent、Sec-*、Cookie 等）；
   - 提取时仅保留 HTTP 方法、脱敏路径、必要业务请求头和请求体；
   - 严禁在脚本、日志、Git 历史、正式记忆或响应中记录长整数 ID、Token、Cookie、生产账号与密码。
2. **写读回环与确定性断言**:
   - 每轮只验证一个假设，改动后按“写入请求 -> 读取请求 -> 断言核对”执行；
   - 接口验证必须输出 HTTP 状态码与关键字段断言，严禁将“接口已调用”等无断言文字作为通过证据；
   - 响应正文仅在临时文件中核验后清理，失败时回到 `debug`，严禁使用未证实的 fallback 掩盖错误。
3. **接口契约分离**:
   - 真实接口定义与字段说明归入 `docs/api/`；
   - 本专题仅维护脱敏排障方法论与排障断言逻辑。

---

## 三、专题变更明细索引 (Changes Index)

<!-- project-memory:changes:start -->
- [调试证据与Markdown标题树](../change/bugfix/2026-08-17_调试证据与Markdown标题树.md) - 规范 HTTP 证据提取脱敏流程，引入 outline 标题树解析设计。
<!-- project-memory:changes:end -->
