# BUPT BYR Forum Summary

[中文](SKILL.md) | English

Use only BYR forum boards and pages the user is authorized to access. Collect slowly, preserve source links, and avoid reproducing personal information that is irrelevant to the summary.

## Workflow

1. Confirm the selected boards and a half-open time window: `[start, end)`.
2. Install the Node dependencies, set `BYR_USERNAME` and `BYR_PASSWORD`, and run `python3 scripts/refresh_byr_cookie.py`.
3. Run `node scripts/collect_byr_forum.js --date YYYY-MM-DD --out byr-data.json` and record the collection state.
4. Collect candidate threads with title, author display name when relevant, latest reply time, reply count, excerpt, and canonical URL.
5. Open the strongest candidates and read enough replies to understand the discussion. A list-page title alone is not evidence for a conclusion.
6. Deduplicate pinned, cross-posted, renamed, or redirected threads.
7. Run `python3 scripts/generate_byr_summary.py --data byr-data.json --output byr-summary.md`, then refine it with [the English report template](references/digest-template.en.md).
8. Validate the result with `python3 scripts/validate_summary.py --input byr-summary.md`.
9. State collection failures and inaccessible pages. A zero-result query does not prove that a board had no activity until authentication, pagination, and time filtering are verified.
10. Publish to another service only when authorized, then read it back.

Label claims as `Discussion` when they describe what posters said and `Analysis` when they are your synthesis. Do not present forum claims as verified facts without an independent source.

See [the runnable anonymous example](README.en.md) before using live credentials.
