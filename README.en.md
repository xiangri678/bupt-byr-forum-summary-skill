# BUPT BYR Forum Summary Skill

[中文](README.md) | English

An Agent Skill for summarizing recent discussions from user-authorized BUPT BYR forum boards with direct thread links, coverage notes, and separate discussion and analysis sections.

## Contents

- `SKILL.md`: Chinese-first collection, evidence, privacy, and reporting workflow
- `SKILL.en.md`: English Skill instructions
- `scripts/refresh_byr_cookie.py`: log in with environment credentials and save a mode-`0600` cookie file
- `scripts/collect_byr_forum.js`: collect board listings and high-activity thread evidence
- `scripts/generate_byr_summary.py`: build an evidence-first Markdown draft
- `scripts/validate_summary.py`: validate headings and source links
- `examples/`: anonymized runnable input and output examples
- `references/digest-template.md`: Chinese report template
- `references/digest-template.en.md`: English report template
- `agents/openai.yaml`: UI metadata

## Use

Install this repository with an Agent Skills-compatible client, or copy the repository into your agent's skills directory. Use only pages the user is authorized to access.

Run the anonymous example without logging in:

```bash
python3 scripts/generate_byr_summary.py \
  --data examples/byr-data.example.json \
  --output /tmp/byr-summary-example.md
python3 scripts/validate_summary.py --input /tmp/byr-summary-example.md
```

For a live authorized run, install Node dependencies, set `BYR_USERNAME` and `BYR_PASSWORD`, refresh `.byr-cookie`, run the collector, generate the summary, and validate it. See the Chinese README for the complete command sequence.

## Authorship

Created by Xiangri from a self-built Hermes Agent workflow. This repository is not affiliated with the BYR forum.

## License

[MIT](LICENSE)
