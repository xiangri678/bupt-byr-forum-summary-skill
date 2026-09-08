# 北邮人论坛每日总结 Skill

中文 | [English](README.en.md)

面向北邮人论坛用户，从用户有权访问的版面中整理近期讨论，提供主题原文链接、采集范围和简明总结，并明确区分网友观点与分析判断。

## 仓库内容

- `SKILL.md`：中文版采集、证据、隐私和报告流程
- `SKILL.en.md`：English Skill instructions
- `scripts/refresh_byr_cookie.py`：通过环境变量登录并保存权限为 `0600` 的 Cookie 文件
- `scripts/collect_byr_forum.js`：按时间窗口采集版面列表和高互动主题
- `scripts/generate_byr_summary.py`：从采集 JSON 生成带证据的 Markdown 初稿
- `scripts/validate_summary.py`：检查标题、章节和原帖链接
- `examples/`：匿名输入与生成结果示例
- `references/digest-template.md`：中文版报告模板
- `references/digest-template.en.md`：English report template
- `agents/openai.yaml`：界面元数据

## 使用

通过兼容 Agent Skills 的客户端安装本仓库，或将仓库复制到 Agent 的 Skills 目录。只读取用户有权访问的页面，摘要中保留主题链接，并避免公开无关个人信息。

### 查看无需登录的匿名示例

```bash
python3 scripts/generate_byr_summary.py \
  --data examples/byr-data.example.json \
  --output /tmp/byr-summary-example.md
python3 scripts/validate_summary.py \
  --input /tmp/byr-summary-example.md \
  --report /tmp/byr-summary-validation.json
```

### 完整运行

```bash
npm install
export BYR_USERNAME='你的用户名'
export BYR_PASSWORD='你的密码'
python3 scripts/refresh_byr_cookie.py
node scripts/collect_byr_forum.js --date 2026-09-07 --out byr-data.json
python3 scripts/generate_byr_summary.py --data byr-data.json --output byr-summary.md
python3 scripts/validate_summary.py --input byr-summary.md
```

用户名和密码只从当前进程环境读取，不写入仓库。Cookie 文件已加入 `.gitignore`。采集结果属于论坛讨论材料，发布前仍需复核隐私、版权和上下文。

适合以下请求：

- “总结今天北邮人论坛的热门讨论。”
- “看看北邮人论坛二手、求职和校园生活版面有什么值得关注的内容。”
- “生成一份带原帖链接的 BYR 论坛日报。”

## 作者

由 Xiangri 根据自己构建的 Hermes Agent 北邮人论坛整理工作流公开整理。本仓库与北邮人论坛官方无隶属关系。

## 许可证

[MIT](LICENSE)
