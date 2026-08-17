---
name: explore
description: 在任务目标、业务含义、范围、调用链、历史意图或未知项不明确，且尚不应修改代码时使用。
---

# 探索(Explore)

遵从 `rules/engineering-principles.md`，全程只读。

- 经 `memory-get` 先梳理现状、入口、调用链、Git/change 历史和未知项；只取得足以决定下一步的最小事实。
- 主任务可把已证实事实和已排除路径写入临时证据与 `path.json`；不写代码、不改配置、不做正式归档。
- 输出：路由、依据、已知事实、未知项、边界、下一关。后续明确后转入 `debug`、`dev` 或停止；不静默升级为修改。
