# CLAUDE.md

**Read [`AGENTS.md`](AGENTS.md) first.** It is the single source of truth for how to
work on Akoso. This file holds only notes specific to Claude Code.

## Claude Code notes

- **shadcn MCP server:** configured in `.mcp.json`. Use it to search, view and install
  registry components instead of pasting code.
- **shadcn skill:** installed in `.claude/skills/shadcn` (source in `.agents/skills/`,
  pinned in `skills-lock.json`). It knows the project's shadcn configuration and
  composition rules. Where it and `AGENTS.md` differ (for example on icon libraries),
  `AGENTS.md` wins.
- **Preview:** `.claude/launch.json` starts the web app on port 3000.
- **Cross-model review** (working rule 11): for security-, RLS-, money- and
  results-related changes, the diff is reviewed by Gemini (or written by Gemini and
  reviewed here) before the founder approves. Record the review in the pull request.
