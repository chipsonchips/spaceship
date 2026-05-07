---
inclusion: auto
fileMatchPattern: "frontend/**/*.{ts,tsx}"
---

# Frontend Coding Standards

## Naming Conventions

### Components

- **PascalCase** for all React components: `GameBoard.tsx`, `BetControls.tsx`
- One component per file (unless it's a small helper component)
- Component files should match the component name exactly

### Files & Directories

- **PascalCase** for component directories: `/components/GameBoard/`
- **camelCase** for utility/hook files: `useGameState.ts`, `formatCurrency.ts`
- **camelCase** for service files: `gameEngine.service.ts`
- **kebab-case** for page routes: `/app/admin/game/players/[id]/`

### Variables & Functions

- **camelCase** for variables and functions: `playerBalance`, `calculateMultiplier()`
- **UPPER_SNAKE_CASE** for constants: `MAX_BET_AMOUNT`, `DEFAULT_CHAIN_ID`
- **PascalCase** for types and interfaces: `PlayerData`, `GameState`

### React Hooks

- Prefix with `use`: `useGameState`, `usePlayerBalance`, `useChainSwitch`
- Store in `/hooks/` directory

## File Organization

```
frontend/
├── app/                    # Next.js pages and layouts
├── components/             # Reusable React components
│   ├── game/              # Game-related components
│   ├── admin/             # Admin-specific components
│   ├── common/            # Shared/common components
│   └── layout/            # Layout components
├── hooks/                 # Custom React hooks
├── context/               # React Context providers
├── lib/                   # Utility functions and helpers
├── types/                 # TypeScript type definitions
├── public/                # Static assets
└── scripts/               # Build/utility scripts
```

## Code Style

- Use TypeScript strict mode (already enabled)
- Prefer functional components with hooks
- Use `const` by default, `let` only when necessary
- Avoid `any` type - use proper TypeScript types
- Add JSDoc comments for complex functions
- Keep components focused and single-responsibility

## Import Organization

1. External dependencies
2. Internal absolute imports (`@/...`)
3. Relative imports (if necessary)

Example:

```typescript
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GameBoard } from "@/components/game/GameBoard";
import { useGameState } from "@/hooks/useGameState";
```

## Testing

- Test files colocated with source: `Component.tsx` + `Component.spec.tsx`
- Use Vitest for unit tests
- Aim for >80% coverage on critical paths
- Test behavior, not implementation details

## Performance

- Use React.memo for expensive components
- Implement proper dependency arrays in hooks
- Lazy load routes when appropriate
- Avoid inline function definitions in render

## Accessibility

- Use semantic HTML elements
- Include proper ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers
