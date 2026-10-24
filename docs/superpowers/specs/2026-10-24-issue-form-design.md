# Bug report form

## Intent and scope
Collect enough information in new GitHub bug reports to start diagnosis without first asking for the browser or OS. English wording; no installation-source question because the extension is not available in a store. No extension runtime changes.

## Approaches
- Markdown template: simple, but users can delete required questions.
- GitHub Issue Form: structured fields with required validation. Selected in discussion because basic diagnostic data must be supplied.

## Fields
Required: browser and exact version, OS and version, SimplestPrompt version, problem description, reproduction steps, expected result, actual result, whether it worked before and what changed (allow unknown/not applicable).

Optional: screenshots, extension errors, additional context. Include a warning against sharing tokens, passwords, or private prompts. Do not request the installation source.

## Constraints and remaining choices
Use GitHub's native YAML form under `.github/ISSUE_TEMPLATE/`. Do not change blank-issue policy, add labels, publish, or modify existing issues. The implementer chooses field IDs and concise explanatory text.
