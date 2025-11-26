---
name: ui-handler
description: Implement UI using Shadcn, Tailwind, and React components. Use when adding buttons, inputs, layouts, or styling.
---

# UI Handler

## Instructions

### 1. Installing Components
1.  **Check Registry**: Look in `.claude/design/*.json` for custom themes.
2.  **Install**:
    - Default: `pnpm dlx shadcn@latest add {component}`
    - Custom: Use registry URL if found.

### 2. Creating Components
- **Shared**: Place in `src/components/ui/` (e.g., generic cards).
- **Feature-Specific**: Place in `src/app/.../_components/` (co-location).

### 3. Creating Layouts
1.  Identify sections (Header, Sidebar).
2.  Create co-located components (`_components/PageHeader.tsx`).
3.  Compose using standard UI atoms.

## Reference
For location strategies, naming conventions, and best practices, see [reference.md](reference.md).

