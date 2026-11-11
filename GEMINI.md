# GEMINI.md

**Read [`AGENTS.md`](AGENTS.md) first.** It is the single source of truth for how to
work on Akoso. This file holds only notes specific to Gemini CLI.

## Gemini CLI notes

- **shadcn MCP server:** configured in `.gemini/settings.json`. Use it to search, view
  and install registry components instead of pasting code.
- **shadcn skill:** installed in `.agents/skills/shadcn` (pinned in `skills-lock.json`).
  Where it and `AGENTS.md` differ (for example on icon libraries), `AGENTS.md` wins.
- **Cross-model review** (working rule 11): for security-, RLS-, money- and
  results-related changes, the diff is reviewed by Claude (or written by Claude and
  reviewed here) before the founder approves. Record the review in the pull request.
