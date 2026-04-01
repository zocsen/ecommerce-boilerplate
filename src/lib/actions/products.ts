"use server";

/* ------------------------------------------------------------------ */
/*  Product server actions                                             */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireAdminOrViewer } from "@/lib/security/roles";
import { logAudit } from "@/lib/security/logger";
import { productCreateSchema, productUpdateSchema } from "@/lib/validators/product";
import { uuidSchema } from "@/lib/validators/uuid";
import type {
  ProductRow,
  ProductVariantRow,
  CategoryRow,
  ProductExtraRow,
  ProductExtraWithProduct,
  Database,
} from "@/lib/types/database";

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
  extras: ProductExtraWithProduct[];
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

    const { category, minPrice, maxPrice, inStock, sort, page = 1, perPage = 12 } = parsed.data;

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

    // Build query — filter active products with valid publish date
    const now = new Date().toISOString();
    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .or(`published_at.is.null,published_at.lte.${now}`);

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

export async function getProductBySlug(slug: string): Promise<ActionResult<ProductDetail>> {
  try {
    const parsed = z.string().min(1).safeParse(slug);
    if (!parsed.success) {
      return { success: false, error: "Érvénytelen slug." };
    }

    const supabase = await createClient();

    // Fetch product — defense-in-depth: also filter by published_at
    const now = new Date().toISOString();
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("slug", parsed.data)
      .eq("is_active", true)
      .or(`published_at.is.null,published_at.lte.${now}`)
      .single();

    if (productError || !product) {
      return { success: false, error: "A termék nem található." };
    }

    // Fetch variants and category joins in parallel
    const [variantsResult, categoriesJoinResult, extrasResult] = await Promise.all([
      supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase.from("product_categories").select("category_id").eq("product_id", product.id),
      supabase
        .from("product_extras")
        .select("*")
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true }),
    ]);

    const variants = variantsResult.data ?? [];
    const extrasRaw: ProductExtraRow[] = extrasResult.data ?? [];

    // Fetch actual category rows
    const categoryIds = (categoriesJoinResult.data ?? []).map((pc) => pc.category_id);
    let categories: CategoryRow[] = [];

    if (categoryIds.length > 0) {
      const { data: catRows } = await supabase
        .from("categories")
        .select("*")
        .in("id", categoryIds)
        .eq("is_active", true);

      categories = catRows ?? [];
    }

    // Enrich extras with extra product details
    const extras = await enrichExtras(supabase, extrasRaw);

    return {
      success: true,
      data: { product, variants, categories, extras },
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

    const { search, isActive, sort, page = 1, perPage = 20 } = parsed.data;

    const admin = createAdminClient();

    let query = admin.from("products").select("*", { count: "exact" });

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
          const cat = row.categories as {
            id: string;
            name: string;
            parent_id: string | null;
          } | null;
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

export async function adminGetProduct(id: string): Promise<ActionResult<ProductDetail>> {
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
    const [variantsResult, categoriesJoinResult, extrasResult] = await Promise.all([
      admin
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: true }),
      admin.from("product_categories").select("category_id").eq("product_id", product.id),
      admin
        .from("product_extras")
        .select("*")
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true }),
    ]);

    const variants = variantsResult.data ?? [];
    const extrasRaw: ProductExtraRow[] = extrasResult.data ?? [];

    // Fetch actual category rows (including inactive for admin)
    const categoryIds = (categoriesJoinResult.data ?? []).map((pc) => pc.category_id);
    let categories: CategoryRow[] = [];

    if (categoryIds.length > 0) {
      const { data: catRows } = await admin.from("categories").select("*").in("id", categoryIds);

      categories = catRows ?? [];
    }

    // Enrich extras with extra product details
    const extras = await enrichExtras(admin, extrasRaw);

    return {
      success: true,
      data: { product, variants, categories, extras },
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
      vatRate: formData.has("vatRate") ? Number(formData.get("vatRate")) : 27,
      mainImageUrl: (formData.get("mainImageUrl") as string) || undefined,
      imageUrls: JSON.parse((formData.get("imageUrls") as string) || "[]") as string[],
      isActive: formData.get("isActive") === "true",
      publishedAt: formData.has("publishedAt")
        ? (formData.get("publishedAt") as string) || null
        : undefined,
      weightGrams:
        formData.has("weightGrams") && formData.get("weightGrams") !== ""
          ? Number(formData.get("weightGrams"))
          : null,
      categoryIds: JSON.parse((formData.get("categoryIds") as string) || "[]") as string[],
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
        vat_rate: input.vatRate,
        main_image_url: input.mainImageUrl ?? null,
        image_urls: input.imageUrls,
        is_active: input.isActive,
        published_at: input.publishedAt ?? null,
        weight_grams: input.weightGrams ?? null,
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

      const { error: linkError } = await admin.from("product_categories").insert(categoryLinks);

      if (linkError) {
        console.error("[adminCreateProduct] Category link error:", linkError.message);
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
        weightGrams?: number | null;
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
          weight_grams: v.weightGrams ?? null,
        }));

        const { error: variantError } = await admin.from("product_variants").insert(variantRows);

        if (variantError) {
          console.error("[adminCreateProduct] Variant insert error:", variantError.message);
        }
      }
    }

    // Parse and insert extras if provided
    const extrasRaw = formData.get("extras") as string | null;
    if (extrasRaw) {
      const extrasArr = JSON.parse(extrasRaw) as Array<{
        extraProductId: string;
        extraVariantId?: string;
        label: string;
        isDefaultChecked: boolean;
        sortOrder: number;
      }>;

      if (extrasArr.length > 0) {
        const extraRows = extrasArr.map((e) => ({
          product_id: product.id,
          extra_product_id: e.extraProductId,
          extra_variant_id: e.extraVariantId ?? null,
          label: e.label,
          is_default_checked: e.isDefaultChecked,
          sort_order: e.sortOrder,
        }));

        const { error: extrasError } = await admin.from("product_extras").insert(extraRows);

        if (extrasError) {
          console.error("[adminCreateProduct] Extras insert error:", extrasError.message);
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
      basePrice: formData.has("basePrice") ? Number(formData.get("basePrice")) : undefined,
      compareAtPrice: formData.has("compareAtPrice")
        ? formData.get("compareAtPrice")
          ? Number(formData.get("compareAtPrice"))
          : null
        : undefined,
      vatRate: formData.has("vatRate") ? Number(formData.get("vatRate")) : undefined,
      mainImageUrl: formData.has("mainImageUrl")
        ? (formData.get("mainImageUrl") as string) || null
        : undefined,
      imageUrls: formData.has("imageUrls")
        ? (JSON.parse(formData.get("imageUrls") as string) as string[])
        : undefined,
      isActive: formData.has("isActive") ? formData.get("isActive") === "true" : undefined,
      publishedAt: formData.has("publishedAt")
        ? (formData.get("publishedAt") as string) || null
        : undefined,
      weightGrams: formData.has("weightGrams")
        ? formData.get("weightGrams") !== ""
          ? Number(formData.get("weightGrams"))
          : null
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
    if (input.description !== undefined) updatePayload.description = input.description;
    if (input.basePrice !== undefined) updatePayload.base_price = input.basePrice;
    if (input.compareAtPrice !== undefined) updatePayload.compare_at_price = input.compareAtPrice;
    if (input.vatRate !== undefined) updatePayload.vat_rate = input.vatRate;
    if (input.mainImageUrl !== undefined) updatePayload.main_image_url = input.mainImageUrl;
    if (input.imageUrls !== undefined) updatePayload.image_urls = input.imageUrls;
    if (input.isActive !== undefined) updatePayload.is_active = input.isActive;
    if (input.publishedAt !== undefined) updatePayload.published_at = input.publishedAt;
    if (input.weightGrams !== undefined) updatePayload.weight_grams = input.weightGrams;
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
      await admin.from("product_categories").delete().eq("product_id", idParsed.data);

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
        weightGrams?: number | null;
      }>;

      // Delete existing variants and recreate (simple approach)
      await admin.from("product_variants").delete().eq("product_id", idParsed.data);

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
          weight_grams: v.weightGrams ?? null,
        }));

        await admin.from("product_variants").insert(variantRows);
      }
    }

    // Update extras if provided (delete-and-recreate)
    const extrasRaw = formData.get("extras") as string | null;
    if (extrasRaw) {
      const extrasArr = JSON.parse(extrasRaw) as Array<{
        extraProductId: string;
        extraVariantId?: string;
        label: string;
        isDefaultChecked: boolean;
        sortOrder: number;
      }>;

      // Delete existing extras
      await admin.from("product_extras").delete().eq("product_id", idParsed.data);

      if (extrasArr.length > 0) {
        const extraRows = extrasArr.map((e) => ({
          product_id: idParsed.data,
          extra_product_id: e.extraProductId,
          extra_variant_id: e.extraVariantId ?? null,
          label: e.label,
          is_default_checked: e.isDefaultChecked,
          sort_order: e.sortOrder,
        }));

        const { error: extrasError } = await admin.from("product_extras").insert(extraRows);

        if (extrasError) {
          console.error("[adminUpdateProduct] Extras insert error:", extrasError.message);
        }
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

export async function adminDeleteProduct(id: string): Promise<ActionResult> {
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

export async function adminHardDeleteProduct(id: string): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen termék azonosító." };
    }

    const admin = createAdminClient();

    const { error } = await admin.from("products").delete().eq("id", idParsed.data);

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

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Enrich raw product_extras rows with the extra product's live details
 * (title, slug, price, image, stock).
 */
async function enrichExtras(
  client: SupabaseClient<Database>,
  extrasRaw: ProductExtraRow[],
): Promise<ProductExtraWithProduct[]> {
  if (extrasRaw.length === 0) return [];

  const extraProductIds = [...new Set(extrasRaw.map((e) => e.extra_product_id))];
  const extraVariantIds = extrasRaw
    .map((e) => e.extra_variant_id)
    .filter((id): id is string => id !== null);

  // Fetch extra products and variants in parallel
  const [productsResult, variantsResult] = await Promise.all([
    client
      .from("products")
      .select("id,title,slug,base_price,main_image_url,is_active")
      .in("id", extraProductIds),
    extraVariantIds.length > 0
      ? client
          .from("product_variants")
          .select("id,price_override,stock_quantity,is_active")
          .in("id", extraVariantIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const productMap = new Map<
    string,
    {
      title: string;
      slug: string;
      base_price: number;
      main_image_url: string | null;
      is_active: boolean;
    }
  >();
  for (const p of (productsResult.data ?? []) as Array<{
    id: string;
    title: string;
    slug: string;
    base_price: number;
    main_image_url: string | null;
    is_active: boolean;
  }>) {
    productMap.set(p.id, p);
  }

  const variantMap = new Map<
    string,
    {
      price_override: number | null;
      stock_quantity: number;
      is_active: boolean;
    }
  >();
  for (const v of (variantsResult.data ?? []) as Array<{
    id: string;
    price_override: number | null;
    stock_quantity: number;
    is_active: boolean;
  }>) {
    variantMap.set(v.id, v);
  }

  return extrasRaw
    .map((extra) => {
      const prod = productMap.get(extra.extra_product_id);
      if (!prod) return null;

      const variant = extra.extra_variant_id ? variantMap.get(extra.extra_variant_id) : null;

      return {
        ...extra,
        extra_product_title: prod.title,
        extra_product_slug: prod.slug,
        extra_product_price: prod.base_price,
        extra_product_image: prod.main_image_url,
        extra_product_is_active: prod.is_active,
        extra_variant_price: variant?.price_override ?? null,
        extra_variant_stock: variant?.stock_quantity ?? null,
        extra_variant_is_active: variant?.is_active ?? null,
      } satisfies ProductExtraWithProduct;
    })
    .filter((e): e is ProductExtraWithProduct => e !== null);
}

// ── Extra product actions ──────────────────────────────────────────

const extrasInputSchema = z.array(
  z.object({
    extraProductId: uuidSchema,
    extraVariantId: uuidSchema.optional(),
    label: z.string().min(1).max(200),
    isDefaultChecked: z.boolean(),
    sortOrder: z.number().int().min(0),
  }),
);

export async function getProductExtras(
  productId: string,
): Promise<ActionResult<ProductExtraWithProduct[]>> {
  try {
    const idParsed = uuidSchema.safeParse(productId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen termék azonosító." };
    }

    const supabase = await createClient();

    const { data: extrasRaw, error } = await supabase
      .from("product_extras")
      .select("*")
      .eq("product_id", idParsed.data)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[getProductExtras] DB error:", error.message);
      return { success: false, error: "Hiba a kiegészítők lekérésekor." };
    }

    const extras = await enrichExtras(supabase, extrasRaw ?? []);

    return { success: true, data: extras };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getProductExtras] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminSetProductExtras(
  productId: string,
  extras: Array<{
    extraProductId: string;
    extraVariantId?: string;
    label: string;
    isDefaultChecked: boolean;
    sortOrder: number;
  }>,
): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(productId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen termék azonosító." };
    }

    const parsed = extrasInputSchema.safeParse(extras);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen kiegészítő adatok.",
      };
    }

    // Validate no self-reference
    for (const extra of parsed.data) {
      if (extra.extraProductId === idParsed.data) {
        return {
          success: false,
          error: "Egy termék nem lehet a saját kiegészítője.",
        };
      }
    }

    const admin = createAdminClient();

    // Delete existing extras
    await admin.from("product_extras").delete().eq("product_id", idParsed.data);

    // Insert new extras
    if (parsed.data.length > 0) {
      const rows = parsed.data.map((e) => ({
        product_id: idParsed.data,
        extra_product_id: e.extraProductId,
        extra_variant_id: e.extraVariantId ?? null,
        label: e.label,
        is_default_checked: e.isDefaultChecked,
        sort_order: e.sortOrder,
      }));

      const { error: insertError } = await admin.from("product_extras").insert(rows);

      if (insertError) {
        console.error("[adminSetProductExtras] Insert error:", insertError.message);
        return { success: false, error: "Hiba a kiegészítők mentésekor." };
      }
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "product.set_extras",
      entityType: "product",
      entityId: idParsed.data,
      metadata: { extrasCount: parsed.data.length },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminSetProductExtras] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Price History (FE-006) ──────────────────────────────────────────

export async function getProductPriceHistory(
  productId: string,
  days: number = 30,
): Promise<
  ActionResult<{
    history: Array<{ price: number; compareAtPrice: number | null; date: string }>;
  }>
> {
  try {
    await requireAdminOrViewer();

    const idParsed = uuidSchema.safeParse(productId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen termék azonosító." };
    }

    const admin = createAdminClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await admin
      .from("price_history")
      .select("price, compare_at_price, recorded_at")
      .eq("product_id", idParsed.data)
      .is("variant_id", null)
      .gte("recorded_at", cutoffDate.toISOString())
      .order("recorded_at", { ascending: true });

    if (error) {
      console.error("[getProductPriceHistory] Error:", error.message);
      return { success: false, error: "Hiba az ártörténet lekérésekor." };
    }

    return {
      success: true,
      data: {
        history: (data ?? []).map((row) => ({
          price: row.price,
          compareAtPrice: row.compare_at_price,
          date: row.recorded_at,
        })),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getProductPriceHistory] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}
