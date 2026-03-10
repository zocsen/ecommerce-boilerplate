"use server";

/* ------------------------------------------------------------------ */
/*  Product server actions                                             */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireAdminOrViewer } from "@/lib/security/roles";
import { logAudit } from "@/lib/security/logger";
import { productCreateSchema, productUpdateSchema } from "@/lib/validators/product";
import { uuidSchema } from "@/lib/validators/uuid";
import type { ProductRow, ProductVariantRow, CategoryRow } from "@/lib/types/database";

// ── Types ──────────────────────────────────────────────────────────

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ListProductsFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
}

interface ListProductsData {
  products: ProductRow[];
  total: number;
  page: number;
  totalPages: number;
}

interface ProductDetail {
  product: ProductRow;
  variants: ProductVariantRow[];
  categories: CategoryRow[];
}

// ── Filter validation ──────────────────────────────────────────────

const listFiltersSchema = z.object({
  category: z.string().optional(),
  minPrice: z.number().int().min(0).optional(),
  maxPrice: z.number().int().min(0).optional(),
  inStock: z.boolean().optional(),
  sort: z.string().optional(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
});

// ── Public actions ─────────────────────────────────────────────────

export async function listProducts(
  filters: ListProductsFilters = {},
): Promise<ActionResult<ListProductsData>> {
  try {
    const parsed = listFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: "Érvénytelen szűrő paraméterek." };
    }

    const {
      category,
      minPrice,
      maxPrice,
      inStock,
      sort,
      page = 1,
      perPage = 12,
    } = parsed.data;

    const supabase = await createClient();

    // Build product IDs filter if category is specified
    let productIdsInCategory: string[] | null = null;

    if (category) {
      const { data: catRow } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", category)
        .eq("is_active", true)
        .single();

      if (!catRow) {
        return {
          success: true,
          data: { products: [], total: 0, page, totalPages: 0 },
        };
      }

      const { data: pcRows } = await supabase
        .from("product_categories")
        .select("product_id")
        .eq("category_id", catRow.id);

      productIdsInCategory = (pcRows ?? []).map((r) => r.product_id);

      if (productIdsInCategory.length === 0) {
        return {
          success: true,
          data: { products: [], total: 0, page, totalPages: 0 },
        };
      }
    }

    // Build query
    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("is_active", true);

    if (productIdsInCategory) {
      query = query.in("id", productIdsInCategory);
    }

    if (minPrice !== undefined) {
      query = query.gte("base_price", minPrice);
    }

    if (maxPrice !== undefined) {
      query = query.lte("base_price", maxPrice);
    }

    // inStock filter: join with variants that have stock > 0
    // We handle this via a post-filter approach since Supabase doesn't
    // support cross-table conditions easily in a single select.
    // For a better approach, a DB function/view would be ideal.

    // Sorting
    switch (sort) {
      case "price_asc":
        query = query.order("base_price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("base_price", { ascending: false });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    // Pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data: products, count, error } = await query;

    if (error) {
      console.error("[listProducts] DB error:", error.message);
      return { success: false, error: "Hiba történt a termékek lekérésekor." };
    }

    let filteredProducts = products ?? [];

    // Post-filter for inStock if needed
    if (inStock) {
      const ids = filteredProducts.map((p) => p.id);
      if (ids.length > 0) {
        const { data: variants } = await supabase
          .from("product_variants")
          .select("product_id")
          .in("product_id", ids)
          .eq("is_active", true)
          .gt("stock_quantity", 0);

        const inStockIds = new Set((variants ?? []).map((v) => v.product_id));
        filteredProducts = filteredProducts.filter((p) => inStockIds.has(p.id));
      }
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / perPage);

    return {
      success: true,
      data: {
        products: filteredProducts,
        total,
        page,
        totalPages,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[listProducts] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function getProductBySlug(
  slug: string,
): Promise<ActionResult<ProductDetail>> {
  try {
    const parsed = z.string().min(1).safeParse(slug);
    if (!parsed.success) {
      return { success: false, error: "Érvénytelen slug." };
    }

    const supabase = await createClient();

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("slug", parsed.data)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      return { success: false, error: "A termék nem található." };
    }

    // Fetch variants and category joins in parallel
    const [variantsResult, categoriesJoinResult] = await Promise.all([
      supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("product_categories")
        .select("category_id")
        .eq("product_id", product.id),
    ]);

    const variants = variantsResult.data ?? [];

    // Fetch actual category rows
    const categoryIds = (categoriesJoinResult.data ?? []).map(
      (pc) => pc.category_id,
    );
    let categories: CategoryRow[] = [];

    if (categoryIds.length > 0) {
      const { data: catRows } = await supabase
        .from("categories")
        .select("*")
        .in("id", categoryIds)
        .eq("is_active", true);

      categories = catRows ?? [];
    }

    return {
      success: true,
      data: { product, variants, categories },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getProductBySlug] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Admin read actions ─────────────────────────────────────────────

interface AdminListProductsFilters {
  search?: string;
  isActive?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
}

interface AdminListProductsData {
  products: (ProductRow & { categoryNames: string[] })[];
  total: number;
  page: number;
  totalPages: number;
}

const adminListFiltersSchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  sort: z.string().optional(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
});

export async function adminListProducts(
  filters: AdminListProductsFilters = {},
): Promise<ActionResult<AdminListProductsData>> {
  try {
    await requireAdminOrViewer();

    const parsed = adminListFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: "Érvénytelen szűrő paraméterek." };
    }

    const {
      search,
      isActive,
      sort,
      page = 1,
      perPage = 20,
    } = parsed.data;

    const admin = createAdminClient();

    let query = admin
      .from("products")
      .select("*", { count: "exact" });

    // Filter by active status (admins can see both active and inactive)
    if (isActive !== undefined) {
      query = query.eq("is_active", isActive);
    }

    // Search by title or slug
    if (search) {
      query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    // Sorting
    switch (sort) {
      case "price_asc":
        query = query.order("base_price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("base_price", { ascending: false });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    // Pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data: products, count, error } = await query;

    if (error) {
      console.error("[adminListProducts] DB error:", error.message);
      return { success: false, error: "Hiba a termékek lekérésekor." };
    }

    const total = count ?? 0;
    const productList = products ?? [];

    // Fetch category names for all products in one query
    let categoryMap: Record<string, string[]> = {};
    if (productList.length > 0) {
      const productIds = productList.map((p) => p.id);
      const { data: pcRows } = await admin
        .from("product_categories")
        .select("product_id, categories(id, name, parent_id)")
        .in("product_id", productIds);

      if (pcRows) {
        for (const row of pcRows) {
          const cat = row.categories as { id: string; name: string; parent_id: string | null } | null;
          if (!cat) continue;
          // Only include top-level (main) categories — parent_id is null
          if (cat.parent_id !== null) continue;
          if (!categoryMap[row.product_id]) categoryMap[row.product_id] = [];
          categoryMap[row.product_id].push(cat.name);
        }
      }
    }

    return {
      success: true,
      data: {
        products: productList.map((p) => ({
          ...p,
          categoryNames: categoryMap[p.id] ?? [],
        })),
        total,
        page,
        totalPages: Math.ceil(total / perPage),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminListProducts] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminGetProduct(
  id: string,
): Promise<ActionResult<ProductDetail>> {
  try {
    await requireAdminOrViewer();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen termék azonosító." };
    }

    const admin = createAdminClient();

    // Fetch product (including inactive — no is_active filter)
    const { data: product, error: productError } = await admin
      .from("products")
      .select("*")
      .eq("id", idParsed.data)
      .single();

    if (productError || !product) {
      return { success: false, error: "A termék nem található." };
    }

    // Fetch variants and category joins in parallel
    const [variantsResult, categoriesJoinResult] = await Promise.all([
      admin
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: true }),
      admin
        .from("product_categories")
        .select("category_id")
        .eq("product_id", product.id),
    ]);

    const variants = variantsResult.data ?? [];

    // Fetch actual category rows (including inactive for admin)
    const categoryIds = (categoriesJoinResult.data ?? []).map(
      (pc) => pc.category_id,
    );
    let categories: CategoryRow[] = [];

    if (categoryIds.length > 0) {
      const { data: catRows } = await admin
        .from("categories")
        .select("*")
        .in("id", categoryIds);

      categories = catRows ?? [];
    }

    return {
      success: true,
      data: { product, variants, categories },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminGetProduct] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Admin write actions ───────────────────────────────────────────

export async function adminCreateProduct(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await requireAdmin();

    // Parse FormData into a plain object
    const raw = {
      title: formData.get("title") as string,
      slug: formData.get("slug") as string,
      description: (formData.get("description") as string) ?? "",
      basePrice: Number(formData.get("basePrice")),
      compareAtPrice: formData.get("compareAtPrice")
        ? Number(formData.get("compareAtPrice"))
        : undefined,
      mainImageUrl: (formData.get("mainImageUrl") as string) || undefined,
      imageUrls: JSON.parse(
        (formData.get("imageUrls") as string) || "[]",
      ) as string[],
      isActive: formData.get("isActive") === "true",
      categoryIds: JSON.parse(
        (formData.get("categoryIds") as string) || "[]",
      ) as string[],
    };

    const parsed = productCreateSchema.safeParse(raw);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen adatok.",
      };
    }

    const input = parsed.data;
    const admin = createAdminClient();

    // Create product
    const { data: product, error: productError } = await admin
      .from("products")
      .insert({
        title: input.title,
        slug: input.slug,
        description: input.description,
        base_price: input.basePrice,
        compare_at_price: input.compareAtPrice ?? null,
        main_image_url: input.mainImageUrl ?? null,
        image_urls: input.imageUrls,
        is_active: input.isActive,
      })
      .select("id")
      .single();

    if (productError || !product) {
      if (productError?.code === "23505") {
        return { success: false, error: "Ez a slug már foglalt." };
      }
      console.error("[adminCreateProduct] Insert error:", productError?.message);
      return { success: false, error: "Hiba a termék létrehozásakor." };
    }

    // Link categories
    if (input.categoryIds.length > 0) {
      const categoryLinks = input.categoryIds.map((categoryId) => ({
        product_id: product.id,
        category_id: categoryId,
      }));

      const { error: linkError } = await admin
        .from("product_categories")
        .insert(categoryLinks);

      if (linkError) {
        console.error(
          "[adminCreateProduct] Category link error:",
          linkError.message,
        );
      }
    }

    // Parse and insert variants if provided
    const variantsRaw = formData.get("variants") as string | null;
    if (variantsRaw) {
      const variantsArr = JSON.parse(variantsRaw) as Array<{
        sku?: string;
        option1Name: string;
        option1Value: string;
        option2Name?: string;
        option2Value?: string;
        priceOverride?: number;
        stockQuantity: number;
        isActive: boolean;
      }>;

      if (variantsArr.length > 0) {
        const variantRows = variantsArr.map((v) => ({
          product_id: product.id,
          sku: v.sku ?? null,
          option1_name: v.option1Name,
          option1_value: v.option1Value,
          option2_name: v.option2Name ?? null,
          option2_value: v.option2Value ?? null,
          price_override: v.priceOverride ?? null,
          stock_quantity: v.stockQuantity,
          is_active: v.isActive,
        }));

        const { error: variantError } = await admin
          .from("product_variants")
          .insert(variantRows);

        if (variantError) {
          console.error(
            "[adminCreateProduct] Variant insert error:",
            variantError.message,
          );
        }
      }
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "product.create",
      entityType: "product",
      entityId: product.id,
      metadata: { title: input.title, slug: input.slug },
    });

    return { success: true, data: { id: product.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminCreateProduct] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminUpdateProduct(
  id: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen termék azonosító." };
    }

    const raw = {
      id: idParsed.data,
      title: (formData.get("title") as string) || undefined,
      slug: (formData.get("slug") as string) || undefined,
      description: formData.has("description")
        ? (formData.get("description") as string)
        : undefined,
      basePrice: formData.has("basePrice")
        ? Number(formData.get("basePrice"))
        : undefined,
      compareAtPrice: formData.has("compareAtPrice")
        ? formData.get("compareAtPrice")
          ? Number(formData.get("compareAtPrice"))
          : null
        : undefined,
      mainImageUrl: formData.has("mainImageUrl")
        ? (formData.get("mainImageUrl") as string) || null
        : undefined,
      imageUrls: formData.has("imageUrls")
        ? (JSON.parse(formData.get("imageUrls") as string) as string[])
        : undefined,
      isActive: formData.has("isActive")
        ? formData.get("isActive") === "true"
        : undefined,
      categoryIds: formData.has("categoryIds")
        ? (JSON.parse(formData.get("categoryIds") as string) as string[])
        : undefined,
    };

    const parsed = productUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen adatok.",
      };
    }

    const input = parsed.data;
    const admin = createAdminClient();

    // Build update payload — only include defined fields
    const updatePayload: Record<string, unknown> = {};
    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.slug !== undefined) updatePayload.slug = input.slug;
    if (input.description !== undefined)
      updatePayload.description = input.description;
    if (input.basePrice !== undefined)
      updatePayload.base_price = input.basePrice;
    if (input.compareAtPrice !== undefined)
      updatePayload.compare_at_price = input.compareAtPrice;
    if (input.mainImageUrl !== undefined)
      updatePayload.main_image_url = input.mainImageUrl;
    if (input.imageUrls !== undefined)
      updatePayload.image_urls = input.imageUrls;
    if (input.isActive !== undefined) updatePayload.is_active = input.isActive;
    updatePayload.updated_at = new Date().toISOString();

    const { error: updateError } = await admin
      .from("products")
      .update(updatePayload)
      .eq("id", idParsed.data);

    if (updateError) {
      if (updateError.code === "23505") {
        return { success: false, error: "Ez a slug már foglalt." };
      }
      console.error("[adminUpdateProduct] Update error:", updateError.message);
      return { success: false, error: "Hiba a termék frissítésekor." };
    }

    // Update category links if provided
    if (input.categoryIds !== undefined) {
      // Remove existing links
      await admin
        .from("product_categories")
        .delete()
        .eq("product_id", idParsed.data);

      // Insert new links
      if (input.categoryIds.length > 0) {
        const categoryLinks = input.categoryIds.map((categoryId) => ({
          product_id: idParsed.data,
          category_id: categoryId,
        }));

        await admin.from("product_categories").insert(categoryLinks);
      }
    }

    // Update variants if provided
    const variantsRaw = formData.get("variants") as string | null;
    if (variantsRaw) {
      const variantsArr = JSON.parse(variantsRaw) as Array<{
        id?: string;
        sku?: string;
        option1Name: string;
        option1Value: string;
        option2Name?: string;
        option2Value?: string;
        priceOverride?: number;
        stockQuantity: number;
        isActive: boolean;
      }>;

      // Delete existing variants and recreate (simple approach)
      await admin
        .from("product_variants")
        .delete()
        .eq("product_id", idParsed.data);

      if (variantsArr.length > 0) {
        const variantRows = variantsArr.map((v) => ({
          product_id: idParsed.data,
          sku: v.sku ?? null,
          option1_name: v.option1Name,
          option1_value: v.option1Value,
          option2_name: v.option2Name ?? null,
          option2_value: v.option2Value ?? null,
          price_override: v.priceOverride ?? null,
          stock_quantity: v.stockQuantity,
          is_active: v.isActive,
        }));

        await admin.from("product_variants").insert(variantRows);
      }
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "product.update",
      entityType: "product",
      entityId: idParsed.data,
      metadata: { updatedFields: Object.keys(updatePayload) },
    });

    return { success: true, data: { id: idParsed.data } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminUpdateProduct] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminDeleteProduct(
  id: string,
): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen termék azonosító." };
    }

    const admin = createAdminClient();

    // Soft-delete: set is_active = false
    const { error } = await admin
      .from("products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", idParsed.data);

    if (error) {
      console.error("[adminDeleteProduct] Update error:", error.message);
      return { success: false, error: "Hiba a termék törlésekor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "product.soft_delete",
      entityType: "product",
      entityId: idParsed.data,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminDeleteProduct] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminToggleProductActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen termék azonosító." };
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("products")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", idParsed.data);

    if (error) {
      console.error("[adminToggleProductActive] Update error:", error.message);
      return { success: false, error: "Hiba a termék státuszának módosításakor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: isActive ? "product.activate" : "product.deactivate",
      entityType: "product",
      entityId: idParsed.data,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminToggleProductActive] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminHardDeleteProduct(
  id: string,
): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen termék azonosító." };
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("products")
      .delete()
      .eq("id", idParsed.data);

    if (error) {
      console.error("[adminHardDeleteProduct] Delete error:", error.message);
      return { success: false, error: "Hiba a termék törlésekor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "product.hard_delete",
      entityType: "product",
      entityId: idParsed.data,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminHardDeleteProduct] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}
