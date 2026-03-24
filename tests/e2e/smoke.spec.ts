import { test, expect } from '@playwright/test'

/* ------------------------------------------------------------------ */
/*  Smoke tests                                                        */
/*                                                                     */
/*  Verify that all key pages render without crashing and that basic   */
/*  navigation works. These do NOT require a running Supabase instance */
/*  or seeded data — empty states and error boundaries are acceptable. */
/* ------------------------------------------------------------------ */

// ── 1. Home page loads ─────────────────────────────────────────────

test.describe('Home page', () => {
  test('loads and displays store branding + hero section', async ({ page }) => {
    await page.goto('/')

    // Title should contain the store name ("Agency Store")
    await expect(page).toHaveTitle(/Agency/)

    // Hero section heading should be visible
    await expect(page.locator('h1', { hasText: 'Prémium minőség' })).toBeVisible()

    // Hero CTA link to products should exist
    const heroLink = page.locator('a[href="/products"]').first()
    await expect(heroLink).toBeVisible()

    // Header should be present
    await expect(page.locator('header')).toBeVisible()
  })
})

// ── 2. Products page loads ─────────────────────────────────────────

test.describe('Products page', () => {
  test('renders with heading and no crash', async ({ page }) => {
    await page.goto('/products')

    // The page heading should say "Termékek"
    await expect(page.locator('h1', { hasText: 'Termékek' })).toBeVisible()

    // Page should not be an error page
    await expect(page.locator('body')).not.toContainText('Application error')
  })
})

// ── 3. Cart page loads ─────────────────────────────────────────────

test.describe('Cart page', () => {
  test('shows empty cart message when no items', async ({ page }) => {
    await page.goto('/cart')

    // Should display the empty cart message (case-insensitive match)
    // The actual text in the codebase is "A kosarad üres" (with accents)
    await expect(page.getByText(/kosarad\s+üres/i)).toBeVisible()
  })
})

// ── 4. Login page loads ────────────────────────────────────────────

test.describe('Login page', () => {
  test('displays login form with email, password, and submit', async ({ page }) => {
    await page.goto('/login')

    // Should have a heading indicating login
    await expect(page.locator('h1', { hasText: 'Bejelentkezés' })).toBeVisible()

    // Email input should exist
    await expect(page.locator('input[type="email"]')).toBeVisible()

    // Password input should exist
    await expect(page.locator('input[type="password"]')).toBeVisible()

    // Submit button should exist
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })
})

// ── 5. Register page loads ─────────────────────────────────────────

test.describe('Register page', () => {
  test('displays registration form with required fields', async ({ page }) => {
    await page.goto('/register')

    // Should have a heading indicating registration
    await expect(page.locator('h1', { hasText: 'Regisztráció' })).toBeVisible()

    // Email input
    await expect(page.locator('input[type="email"]')).toBeVisible()

    // Password inputs (password + confirm = at least 2)
    const passwordInputs = page.locator('input[type="password"]')
    await expect(passwordInputs).toHaveCount(2)

    // Name input
    await expect(page.locator('input[type="text"]').first()).toBeVisible()

    // Submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })
})

// ── 6. Legal pages load ────────────────────────────────────────────

test.describe('Legal pages', () => {
  test('terms page has content', async ({ page }) => {
    await page.goto('/terms')

    await expect(
      page.locator('h1', {
        hasText: 'Általános Szerződési Feltételek',
      }),
    ).toBeVisible()

    // Should have multiple sections of content
    const sections = page.locator('article section')
    const count = await sections.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('privacy page has content', async ({ page }) => {
    await page.goto('/privacy')

    await expect(page.locator('h1', { hasText: 'Adatvédelmi Tájékoztató' })).toBeVisible()

    const sections = page.locator('article section')
    const count = await sections.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('shipping and returns page has content', async ({ page }) => {
    await page.goto('/shipping-and-returns')

    await expect(page.locator('h1', { hasText: 'Szállítás és Visszaküldés' })).toBeVisible()

    const sections = page.locator('article section')
    const count = await sections.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })
})

// ── 7. Admin redirects to login ────────────────────────────────────

test.describe('Admin access control', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/admin')

    // Should redirect to /login (possibly with a redirectTo query param)
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })
})

// ── 8. Navigation works ───────────────────────────────────────────

test.describe('Navigation', () => {
  test('clicking "Termékek" nav link navigates to /products', async ({ page }) => {
    await page.goto('/')

    // The desktop nav has a link with text "Termékek" pointing to /products
    const navLink = page.locator('header nav').getByRole('link', { name: 'Termékek' })
    await expect(navLink).toBeVisible()

    await navLink.click()

    await expect(page).toHaveURL(/\/products/)

    // Verify we're actually on the products page
    await expect(page.locator('h1', { hasText: 'Termékek' })).toBeVisible()
  })
})
