#!/usr/bin/env python3
"""Create an evidence-first Markdown summary from BYR collector JSON."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re


def clean(value: object, limit: int = 280) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text[:limit] + ("…" if len(text) > limit else "")


def make_summary(data: dict, report_date: str, top_per_board: int) -> str:
    boards = [(name, items) for name, items in data.items() if name != "_meta" and isinstance(items, list)]
    total = sum(len(items) for _, items in boards)
    lines = [
        f"# {report_date} 北邮人论坛每日总结",
        "",
        f"> 共采集 {total} 个主题；以下内容基于原帖与采集到的回复片段，请通过链接复核上下文。",
        "",
        "## 今日值得关注",
        "",
    ]

    for board, items in boards:
        ranked = sorted(items, key=lambda item: int(item.get("replyCount", 0) or 0), reverse=True)
        if not ranked:
            continue
        lines.extend([f"### {board}", ""])
        for item in ranked[:top_per_board]:
            title = clean(item.get("title"), 120) or "无标题"
            link = item.get("link") or ""
            replies = int(item.get("replyCount", 0) or 0)
            updated = clean(item.get("lastUpdateRaw") or item.get("lastUpdateIso"), 80) or "时间未知"
            linked_title = f"[{title}]({link})" if link else title
            lines.extend([f"#### {linked_title}", "", f"- 活跃度：{replies} 条回复；最后更新 {updated}"])
            op_text = clean(item.get("opText"))
            if op_text:
                lines.append(f"- 主楼摘要：{op_text}")
            highlights = item.get("highlightedReplies") or []
            for reply in highlights[:2]:
                text = clean(reply.get("text"), 220)
                if text:
                    lines.append(
                        f"- 高互动回复：{text}（赞 {int(reply.get('likes', 0) or 0)}，踩 {int(reply.get('dislikes', 0) or 0)}）"
                    )
            lines.extend(["- 分析：需要结合完整原帖和更多回复判断，不根据标题或单条回复下结论。", ""])

    lines.extend(["## 分版面主题索引", ""])
    for board, items in boards:
        lines.extend([f"### {board}（{len(items)}）", ""])
        for item in items:
            title = clean(item.get("title"), 120) or "无标题"
            link = item.get("link") or ""
            replies = int(item.get("replyCount", 0) or 0)
            lines.append(f"- [{title}]({link})（回复 {replies}）" if link else f"- {title}（回复 {replies}）")
        lines.append("")

    meta = data.get("_meta", {})
    lines.extend(
        [
            "## 采集范围与限制",
            "",
            f"- 时间范围：{clean(meta.get('windowLabel'), 160) or '未记录'}",
            f"- 生成时间：{clean(meta.get('generatedAt'), 80) or '未记录'}",
            "- 论坛内容是用户讨论，不代表已经独立核实的事实。",
            "- 未登录、分页失败或网络错误可能导致数据不完整。",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("byr-data.json"))
    parser.add_argument("--output", type=Path, default=Path("byr-summary.md"))
    parser.add_argument("--date", help="summary date; defaults to _meta.reportDate")
    parser.add_argument("--top-per-board", type=int, default=3)
    args = parser.parse_args()
    if args.top_per_board < 1:
        parser.error("--top-per-board must be at least 1")

    data = json.loads(args.data.read_text(encoding="utf-8"))
    report_date = args.date or data.get("_meta", {}).get("reportDate")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(report_date or "")):
        parser.error("provide --date YYYY-MM-DD or _meta.reportDate in the input")
    output = args.output.expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(make_summary(data, report_date, args.top_per_board), encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
