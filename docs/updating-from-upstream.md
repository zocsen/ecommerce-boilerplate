# Updating from Upstream Boilerplate

How to pull improvements and bug fixes from the upstream Agency boilerplate into your client project.

## Prerequisites

Your project must have been forked or cloned from the boilerplate with the upstream remote configured. If you started with a clean copy (no git history), see [Option B](#option-b--manual-diff-and-apply) instead.

## Option A: Git Merge from Upstream

This is the recommended approach if you forked the boilerplate and kept the upstream remote.

### Initial Setup (one-time)

```bash
# Add the upstream remote if not already set
git remote add upstream <boilerplate-repo-url>

# Verify it was added
git remote -v
```

### Pulling Updates

```bash
# Fetch the latest from upstream
git fetch upstream

# Make sure you're on your main branch
git checkout main

# Merge upstream changes into your branch
git merge upstream/main
```

### Resolving Conflicts

Conflicts are expected in files you have customized. Common conflict locations:

| File | Likely Conflict Reason |
|---|---|
| `src/lib/config/site.config.ts` | You changed store info, features, branding |
| `src/app/globals.css` | Custom theme/color changes |
| `package.json` | Dependency version bumps on both sides |
| `pnpm-lock.yaml` | Auto-generated, resolve by running `pnpm install` after fixing `package.json` |
| Legal pages (`terms/`, `privacy/`, etc.) | Client-specific legal text |

**Resolution strategy:**

1. For config files (`site.config.ts`, `globals.css`): keep your version and manually check if the upstream version added new fields or changed the structure. Add any new fields to your config.
2. For `package.json`: accept upstream dependency updates, but keep any client-specific packages you added. Then run `pnpm install` to regenerate the lock file.
3. For legal pages: keep your version entirely.
4. For everything else (components, actions, types): prefer upstream unless you intentionally modified the file.

```bash
# After resolving all conflicts
git add .
git commit -m "Merge upstream boilerplate updates"

# Reinstall dependencies if package.json changed
pnpm install

# Run the build to verify nothing broke
pnpm build
```

### Handling Migration Conflicts

If the upstream added new database migrations (e.g. `002_add_feature.sql`):

1. Check `supabase/migrations/` for any new files
2. Review the SQL to understand what changed
3. Apply the new migration to your Supabase project:

```bash
# Via Supabase CLI
supabase db push

# Or manually via Supabase Dashboard SQL Editor
```

If you have made your own database changes, ensure there are no conflicts (e.g. both sides adding a column with the same name). Number your custom migrations with a prefix that won't clash (e.g. `100_client_custom.sql`).

## Option B: Manual Diff and Apply

If you started from a clean copy without git history, or if the merge produces too many conflicts:

### 1. Clone the Latest Boilerplate Separately

```bash
git clone <boilerplate-repo-url> boilerplate-latest
```

### 2. Compare the Two Directories

Use a diff tool to compare your project against the latest boilerplate:

```bash
# Using diff (basic)
diff -rq boilerplate-latest/src your-project/src

# Using VS Code (recommended)
# Open both folders and use the built-in diff viewer
```

Or use a dedicated tool like [Meld](https://meldmerge.org/), [Beyond Compare](https://www.scootersoftware.com/), or the GitHub compare view if both repos are on GitHub.

### 3. Apply Changes Selectively

For each changed file:

- **Core logic files** (actions, integrations, security, types, validators, middleware): Apply the upstream version unless you intentionally modified the file
- **Components** (ui, shared, product, cart): Apply upstream; reconcile if you customized component APIs
- **Config files**: Manually merge new fields into your existing config
- **Migrations**: Copy new migration files and apply them to your database
- **Dependencies**: Update `package.json` with new versions, then run `pnpm install`

### 4. Verify

```bash
pnpm install
pnpm build
pnpm test
```

## What to Watch For

### New Configuration Fields

The upstream may add new fields to `SiteConfig` in `site.config.ts`. TypeScript will flag these as errors after merging. Check the type definition and add any missing fields to your config with appropriate values.

### New Environment Variables

Check `.env.example` for new variables after updating. Add any new ones to your `.env.local` and to your deployment environment (Vercel, etc.).

### Database Schema Changes

New migrations may add tables, columns, enums, or RLS policies. Always review new SQL files before applying them. If a migration adds a column with `NOT NULL` and no default, you may need to handle existing data.

### Component API Changes

If the upstream changes a component's props interface, any custom pages or components that use it may break. The TypeScript compiler will catch these after merging.

### Breaking Dependency Updates

Major version bumps in dependencies (Next.js, Supabase, Zod, etc.) may introduce breaking changes. Check the upstream's commit messages or changelog for migration notes.

## Best Practices

### Keep Customizations in the Right Places

To minimize merge conflicts and make updates easier:

| Type of Change | Where to Put It |
|---|---|
| Store info, features, carriers | `src/lib/config/site.config.ts` |
| Custom business logic (pricing, checkout, post-payment) | `src/lib/config/hooks.ts` via `overrideHooks()` |
| Theme colors, fonts | `src/app/globals.css` + `branding` section in config |
| Legal text | Legal page files (`terms/`, `privacy/`, etc.) |
| Client-specific pages | New route files in `src/app/` |
| Client-specific components | New files in `src/components/` (don't modify existing boilerplate components) |
| Custom database tables | Separate migration files (numbered to avoid conflicts) |

### Avoid Modifying Core Files Directly

The following directories contain core boilerplate logic. Avoid direct edits whenever possible:

- `src/lib/actions/` — Server actions
- `src/lib/integrations/` — Payment, email, invoicing adapters
- `src/lib/security/` — Auth and rate-limiting helpers
- `src/lib/validators/` — Zod schemas
- `src/components/ui/` — shadcn/ui primitives

If you need different behavior, use the hooks system (`src/lib/config/hooks.ts`) or create wrapper components instead of editing the originals.

### Track Upstream Versions

Keep a note of which upstream commit or tag you last merged from. This makes future updates easier:

```bash
# After merging, tag your merge point
git tag upstream-sync-2025-01-15
```

### Test After Every Update

Always run the full test suite after pulling upstream changes:

```bash
pnpm build        # Catch TypeScript and build errors
pnpm test         # Run unit tests
pnpm test:e2e     # Run end-to-end tests
```

Verify the checkout flow manually at least once, as payment integration changes are the highest-risk area.
