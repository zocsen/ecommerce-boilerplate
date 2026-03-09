---
name: vercel-react-best-practices
description: React and Next.js performance optimization guidelines from Vercel Engineering. Use when writing, reviewing, or refactoring React or Next.js code to keep performance and data-fetching patterns sharp.
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
---

# Vercel React Best Practices

Use this skill when working on React or Next.js code.

## Apply it for

- new React components
- App Router pages and layouts
- data fetching changes
- performance reviews
- bundle and rendering optimizations

## Priority areas

- `async-*` eliminate waterfalls
- `bundle-*` reduce unnecessary client code
- `server-*` improve RSC and Server Action performance
- `client-*` keep client data access efficient
- `rerender-*` avoid unnecessary updates
- `rendering-*` improve paint and hydration behavior
- `js-*` optimize hot-path JavaScript

## Reference files

- `rules/async-parallel.md`
- `rules/bundle-barrel-imports.md`
- `rules/server-auth-actions.md`
- `AGENTS.md`
