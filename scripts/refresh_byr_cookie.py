#!/usr/bin/env python3
"""Log in to BYR with environment credentials and save a Cookie header."""

from __future__ import annotations

import argparse
import http.cookiejar
import os
from pathlib import Path
import urllib.parse
import urllib.request


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path(".byr-cookie"))
    parser.add_argument("--verify-board", default="Talking")
    args = parser.parse_args()

    username = os.environ.get("BYR_USERNAME", "")
    password = os.environ.get("BYR_PASSWORD", "")
    if not username or not password:
        parser.error("set BYR_USERNAME and BYR_PASSWORD in the environment")

    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    headers = {
        "User-Agent": "Mozilla/5.0",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://bbs.byr.cn/",
    }
    login_data = urllib.parse.urlencode({"id": username, "passwd": password}).encode()
    login_request = urllib.request.Request(
        "https://bbs.byr.cn/user/ajax_login.json",
        data=login_data,
        headers={**headers, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},
    )
    with opener.open(login_request, timeout=20) as response:
        response.read()

    if not list(jar):
        raise SystemExit("login did not return any cookies")

    verify_url = "https://bbs.byr.cn/board/" + urllib.parse.quote(args.verify_board)
    with opener.open(urllib.request.Request(verify_url, headers=headers), timeout=20) as response:
        html = response.read().decode("gb18030", errors="replace")
    if "用户登录" in html or len(html) < 1000:
        raise SystemExit("login returned cookies, but the board verification failed")

    cookie_header = "; ".join(f"{cookie.name}={cookie.value}" for cookie in jar)
    output = args.output.expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(cookie_header + "\n", encoding="utf-8")
    output.chmod(0o600)
    print(f"Cookie saved to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
