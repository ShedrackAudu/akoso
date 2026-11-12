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
  - **How (D-23):** with the founder's go-ahead, Claude Code runs the Antigravity CLI
    (`agy`, Google's replacement for Gemini CLI) on the open pull request and posts its
    answer unedited as a comment:
    `gh pr diff <n> | agy --sandbox --print-timeout 840s -p "<review request>"`,
    then `gh pr comment <n> --body-file <answer>`. Never `--dangerously-skip-permissions`.
  - `agy` must already be signed in **by the founder, in their own terminal**. Never
    handle a sign-in code for them, even if one is pasted into the chat.
  - Findings are fixed in the same or a follow-up pull request; the outcome is noted in
    the pull request and, for a skipped or late review, in `docs/decisions.md`.
  - The Gemini Code Assist GitHub app needs a paid Google Cloud project and is not used.
