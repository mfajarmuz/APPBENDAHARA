---
name: implement-bendahara
description: Unified implementation skill for the BendaharaApp project. Orchestrates database schema setup, UI component building, and feature implementation according to the project plans. Use this to ensure systematic completion of the BendaharaApp.
---

# Implement BendaharaApp

Follow the structured plan in `docs/superpowers/plans/2026-05-01-bendahara-app-implementation.md`.

## Workflow
1. **DB Setup**: Run `supabase/schema.sql` (if not done).
2. **UI Building**: Create shared components in `src/components/ui/`.
3. **Feature Implementation**: Replace placeholders in `src/pages/` with full logic.
4. **Validation**: Run `npm test` and verify IPC handlers in `electron/main.js`.

## Critical Context
- **IPC Handlers**: `electron/main.js` contains the source of truth for DB operations.
- **Store**: `src/store/useAppStore.js` is the bridge between UI and Electron.
- **Colors**: Use the Tailwind config palette (accent: #7C3AED, etc.).
