# 2026-09-20 session-gotcha-extractor 生产就绪整改：目标工程解耦与 schema_version

## 一、问题/需求

落实生产就绪方案（P0-3, P0-4, P1-7）：
1. 目标工程解耦：原 `gotcha.js` 硬编码自身插件目录为根路径，跨工程调用会将经验误写回插件本身；需支持 `--project-root <path>` 并在未指定时基于 `process.cwd()` 向上自动递归探测工程根目录；
2. 路径安全边界：对自定义 `--target` 增加边界越界校验，禁止通过 `../` 或绝对路径突破目标工程范围；
3. Schema 版本演化：新追加条目统一注入 `"schema_version": 1`，并在校验中向前兼容历史旧条目；
4. 契约同步：更新 `references/gotcha-contract.md`。

---

## 二、原因分析

1. 跨宿主与集成工程复用时，插件代码目录与被集成目标业务工程目录分离，写死插件自身路径破坏了工程隔离；
2. 自定义写入目标若无边界检查，存在目录穿越风险；
3. 数据条目缺乏版本标识，无法支持未来字段模式的平滑演进。

---

## 三、测试结果

1. **工程根路径探测与解耦自测**：
   - 运行未带 `--project-root`，自动从当前目录探测至 `D:\jhj\projects\jiaohuan-develop-workflow`；
   - 显式传入 `--project-root` 准确解析至指定工程目录。
2. **安全边界拦截自测**：
   - 执行带越界路径 `node skills/session-gotcha-extractor/scripts/gotcha.js append --scope project --target ../outside.jsonl ...`
   - 正确抛出 `[gotcha] 安全边界越界拦截: 自定义 target '../outside.jsonl' 超出项目根目录范围`，Exit Code 1 阻断逃逸。
3. **Schema 版本与全量校验**：
   - 执行 `node skills/session-gotcha-extractor/scripts/gotcha.js validate --scope all`
   - 项目级（4条，含新增 v1 条目及历史条目兼容）、全局级（1条）、历史库（3条）全部校验通过，Exit Code 0。

---

## 四、备注

- 当前契约版本号固定为整数 `1`；
- 目标工程根目录探测标识集：`.git`、`AGENTS.md`、`.agents`、`package.json`。
