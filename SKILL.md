---
name: bupt-byr-forum-summary
description: 整理用户有权访问的北邮人论坛版面，生成带原帖链接、覆盖范围和证据说明的每日或定期总结，并区分网友讨论与分析判断。BUPT BYR forum summary with source links.
license: MIT
metadata:
  author: Xiangri
  version: "1.0.0"
  compatibility: Requires authorized access to the selected forum pages and a browser or HTTP client.
  tags: [byr, forum, digest, research]
---

# 北邮人论坛每日总结

中文 | [English](SKILL.en.md)

只读取用户有权访问的北邮人论坛版面和页面。控制采集速度，保留原帖链接，不在总结中复制无关个人信息。

## 工作流程

1. 确认需要查看的版面和左闭右开时间范围 `[开始时间, 结束时间)`。
2. 首次运行时安装 Node 依赖，通过环境变量提供账号密码，并执行 `python3 scripts/refresh_byr_cookie.py`。
3. 使用 `node scripts/collect_byr_forum.js --date YYYY-MM-DD --out byr-data.json` 采集数据并记录版面 URL、采集时间、可见分页和登录状态。
4. 收集候选主题的标题、必要时的作者显示名、发帖时间、最后回复时间、回复数、摘要和规范链接。
5. 打开高价值候选主题并阅读足够多的回复，理解真实讨论；列表页标题不能单独支撑结论。
6. 去除置顶重复、跨版重复、改名或重定向主题。
7. 运行 `python3 scripts/generate_byr_summary.py --data byr-data.json --output byr-summary.md` 生成证据优先的初稿，再结合[中文版报告模板](references/digest-template.md)整理。
8. 运行 `python3 scripts/validate_summary.py --input byr-summary.md`，验证标题、章节和原帖链接。
9. 明确说明采集失败和无法访问的页面。在登录状态、分页和时间过滤都未验证前，零条结果不能证明版面没有新内容。
10. 只有用户授权后才能发布到其他服务，发布后必须回读确认。

描述网友原话和主要观点时标为“讨论”；加入自己的归纳与影响判断时标为“分析”。没有独立来源时，不得将论坛说法写成已经证实的事实。

匿名输入、生成结果和无需登录的运行命令见[使用示例](README.md#查看无需登录的匿名示例)。
