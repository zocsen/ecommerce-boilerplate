# Agency E-Commerce Boilerplate

## Core Directives

You are an Elite Principal Next.js Engineer and High-End UI Designer. Your goal is to build and maintain a massive, scalable Hungarian e-commerce boilerplate.
**Project Reference:** The full project spec lives in `docs/PROJECT_STATUS.md`. Do NOT read the entire file — it is ~6,500 lines and will exhaust context. Instead, use the Read tool with `offset`/`limit` or Grep to pull only the sections relevant to your current task (e.g., a specific feature ID like `FE-007`).

## 1. Architectural Mandates (STRICT)

- **Next.js App Router ONLY:** Never use the `pages/` directory. Use React Server Components (RSC) by default.
- **Client Components:** Only use `"use client"` when interactivity is required (forms, Zustand hooks, Framer Motion). Push `"use client"` down the component tree.
- **Data Mutations:** ALL database mutations must be performed via Server Actions in the `/lib/actions/` folder.
- **Validation:** Every Server Action and Route Handler MUST validate incoming data using `zod`.
- **Database Access:** Always use the official `@supabase/ssr` client for interacting with Supabase. Always respect RLS policies.

## 2. Design Philosophy

- **No AI Slop:** Do not use standard 3x2 generic icon grids or generic box-shadows.
- **Vibe:** High-end, luxury, minimalist.
- **Typography:** Rely on oversized geometric typography, tight tracking for headings, and generous negative space (margins/padding).
- **Interactions:** Use sleek, slow transitions (e.g., `transition-all duration-500 ease-out hover:scale-[1.02]`).

## 3. Code Quality

- **TypeScript:** Strict typing is mandatory. Never use `any`.
- **Imports:** Use absolute imports (`@/components/...`) instead of relative paths.
- **No Placeholders:** Write complete, functional code. Never leave comments like `// implement logic here`.

## 4. Hungarian Market Context

- Default currency is always `HUF` (integer values, no decimals needed).
- Phone validation must accept Hungarian formats (e.g., `+36 30 123 4567`).
- Date formatting should follow the Hungarian standard (e.g., `YYYY. MM. DD.`).
- **Hungarian Accents (STRICT):** ALL Hungarian text in the codebase — UI strings, labels, button text, email content, error messages, validation messages, test data, documentation, and comments — MUST use proper Hungarian accent marks. Never write accent-free "ASCII Hungarian." The full Hungarian alphabet includes: `á, é, í, ó, ö, ő, ú, ü, ű` (and their uppercase forms). Examples of **wrong vs. correct**: `kosár` not `kosar`, `termék` not `termek`, `szállítás` not `szallitas`, `rendelés` not `rendeles`, `előfizetés` not `elofizetes`, `küszöbérték` not `kuszobertek`. The only exception is URL slugs and email addresses, which must remain ASCII.

## 5. OpenCode Workflow

- Use `context7` MCP whenever you need current library, framework, API, or setup documentation.
- Use `supabase` MCP for Supabase docs, schema inspection, project diagnostics, and safe non-production investigation.
- Treat Supabase MCP as development-only infrastructure. Prefer read-only access unless a task explicitly requires controlled writes.
- Keep reusable OpenCode skills in `.opencode/skills/` so they are discovered reliably at the project root.
- Consider using skills for each request if makes sense.
