---
name: byr-daily-digest
description: Collect and summarize recent discussions from user-authorized BYR forum boards with direct thread links, coverage notes, and a clear separation between observed discussion and analysis. Use for daily or periodic forum digests.
license: MIT
metadata:
  author: Xiangri
  version: "1.0.0"
  compatibility: Requires authorized access to the selected forum pages and a browser or HTTP client.
  tags: [byr, forum, digest, research]
---

# BYR Daily Digest

Use only boards and pages the user is authorized to access. Collect slowly, preserve source links, and avoid reproducing personal information that is irrelevant to the digest.

## Workflow

1. Confirm the selected boards and a half-open time window: `[start, end)`.
2. Record the board URL, collection time, visible pagination, and authentication state.
3. Collect candidate threads with title, author display name when relevant, creation time, latest reply time, reply count, excerpt, and canonical URL.
4. Open the strongest candidates and read enough replies to understand the discussion. A list-page title alone is not evidence for a conclusion.
5. Deduplicate pinned, cross-posted, renamed, or redirected threads.
6. Rank threads by recency, activity, practical value, and novelty within the requested period.
7. Write the report with [references/digest-template.md](references/digest-template.md).
8. State collection failures and inaccessible pages. A zero-result query does not prove that a board had no activity until authentication, pagination, and time filtering are verified.
9. Publish to another service only when authorized, then read it back.

Label claims as `Discussion` when they describe what posters said and `Analysis` when they are your synthesis. Do not present forum claims as verified facts without an independent source.
