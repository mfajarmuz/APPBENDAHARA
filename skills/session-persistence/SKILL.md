---
name: session-persistence
description: Automates session persistence and progress tracking. Use at the start of a session to recover context and at the end of a session to save progress, decisions, and pending tasks.
---

# Session Persistence

This skill ensures that project context, progress, and critical decisions are preserved across Gemini CLI sessions. It bridges the gap between disconnected interactions by maintaining a centralized "Source of Truth" for the project state.

## Core Mandate

**You MUST check for a state file (e.g., `STATE.md`, `PROGRESS.md`, or `TODO.md`) at the beginning of every session to recover context.**

## Workflow

### 1. Session Start (Recovery)
1. **Locate**: Search for `STATE.md` or `PROGRESS.md` in the project root.
2. **Read**: Load the file to understand:
   - What was done in the previous session.
   - Any blockers or bugs currently being investigated.
   - The immediate next steps.
3. **Synchronize**: Use this information to inform your initial `update_topic` and strategy.

### 2. During Session (Maintenance)
1. **Update**: After completing a major task or identifying a significant bug, update the state file immediately.
2. **Document Decisions**: Record any architectural choices or trade-offs made during the session.

### 3. Session End (Finalization)
1. **Summarize**: Create a final summary of the session's work.
2. **Update Checkboxes**: Ensure all completed tasks are marked `[x]`.
3. **List Pending Tasks**: Clearly state what should be done next to help the "next you."

## Guidelines for the State File

- **Keep it Clean**: Use the template in `references/state-template.md`.
- **Be Specific**: Don't just say "Fixed bugs." Say "Fixed volume field persistence in update-pengeluaran handler."
- **Focus on Continuity**: Write notes as if you are leaving instructions for a colleague who will take over the task in 5 minutes.

## Initial Setup

If no state file exists, create one using `references/state-template.md` as a guide. Point to it in your private project `MEMORY.md`.
