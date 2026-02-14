<objective>
Execute plan 01 of phase 11-project-list-dropdown.

Commit each task atomically. Create SUMMARY.md. Update STATE.md.

**Checkpoint handling:** If you hit a checkpoint task or auth gate, STOP and return a structured checkpoint message. The orchestrator will spawn a fresh agent to continue after the user responds.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
@~/.config/opencode/get-shit-done/references/checkpoints.md
@~/.config/opencode/get-shit-done/references/tdd.md
</execution_context>

<context>
Plan: @/Users/home/Projects/dreamflowCommandForFlutterFlow/.planning/phases/11-project-list-dropdown/11-01-PLAN.md
Project state: @.planning/STATE.md
Config: @.planning/config.json (if exists)
</context>

<checkpoint_behavior>
When you encounter a checkpoint task (type="checkpoint:*") or auth gate, STOP execution and return using the structured format in:

@~/.config/opencode/get-shit-done/templates/checkpoint-return.md

**Required in your return:**
1. Completed Tasks table with commit hashes and files
2. Current task name and what's blocking it
3. Checkpoint details for the user
4. What you're awaiting from the user

The orchestrator will present this to the user. After they respond, a FRESH agent will continue from your checkpoint using the continuation-prompt template. You will NOT be resumed.
</checkpoint_behavior>

<completion_format>
When plan completes successfully, return:

## PLAN COMPLETE

**Plan:** 11-01
**Tasks:** {completed}/{total}
**SUMMARY:** {path to SUMMARY.md}

**Commits:**
- {hash}: {message}
...
</completion_format>

<success_criteria>
- [ ] All tasks executed (or paused at checkpoint with full state returned)
- [ ] Each task committed individually
- [ ] SUMMARY.md created in plan directory
- [ ] STATE.md updated with position and decisions
</success_criteria>