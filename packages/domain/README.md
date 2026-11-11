# @akoso/domain

Pure business logic with no I/O, so it can be tested exhaustively (working rule 6): results computation, fee allocation and payroll.

- Never imports the database, the framework, providers or UI. The import-boundary check fails the build if it does.
- No web-only or Node-only imports, so it also runs in React Native.
- Expected failures return results; only unexpected failures throw.

**Status:** placeholders only.
