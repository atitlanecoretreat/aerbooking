# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in the project spec
- Never delete files without clarification

## Workflow

This is the common workflow that we will use for every single feature/fix:

1. **Implement** - Implement the feature/fix that I create in @context/current-feature.md
2. **Test** - Verify it works in the browser. Implement unit testing later. Run `npm run build` and fix any errors
3. **Iterate** - Iterate and change things if needed

## When Stuck

- If something isn't working after 2-3 attempts, stop and explain the issue
- Don't keep trying random fixes
- Ask for clarification if requirements are unclear

## Code Changes

- Make minimal changes to accomplish the task
- Don't refactor unrelated code unless asked
- Don't add "nice to have" features
- Preserve existing patterns in the codebase

## Code Review

Review AI-generated code periodically, especially for:

- Security (auth checks, input validation)
- Performance (unnecessary re-renders, N+1 queries)
- Logic errors (edge cases)
- Patterns (matches existing codebase?)

## Execution Rules

- Take autonomous action on file changes, refactoring, and code generation.
- Do not ask for permission before editing files or running standard terminal checks.
- Only ask a question if there is a blocking ambiguity that cannot be inferred.
