# UI Architecture Reference

## 1. Component Installation
- **Command**: `pnpm dlx shadcn@latest add {component}`.
- **Theme Awareness**: Check `.claude/design/*.json` first.

## 2. Location Strategy
- **`src/components/ui/`**: Generic, reusable atoms (Buttons, Inputs).
- **`src/app/.../_components/`**: Page-specific components. **Co-location Rule**: If used only in one page, keep it close.

## Best Practices
1. **Installation First**: Check if a Shadcn component exists before building from scratch.
2. **Tailwind First**: Use utility classes over CSS modules.
3. **Naming**: PascalCase for co-located components (`UserCard.tsx`). Kebab-case for `ui` folder (`button.tsx`).

