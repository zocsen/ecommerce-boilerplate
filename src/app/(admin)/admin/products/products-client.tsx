"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Plus, Eye, EyeOff, Clock } from "lucide-react"
import { AdminPagination } from "@/components/admin/pagination"
import { adminListProducts } from "@/lib/actions/products"
import { formatHUF, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ProductRow } from "@/lib/types/database"

type ProductWithCategories = ProductRow & { categoryNames: string[] }

/* ------------------------------------------------------------------ */
/*  Admin Products List (client component)                              */
/* ------------------------------------------------------------------ */

export function AdminProductsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [products, setProducts] = useState<ProductWithCategories[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  const page = Number(searchParams.get("page") ?? "1")
  const sort = searchParams.get("sort") ?? "newest"

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const result = await adminListProducts({
      page,
      perPage: 20,
      sort,
    })
    if (result.success && result.data) {
      setProducts(result.data.products)
      setTotal(result.data.total)
      setTotalPages(result.data.totalPages)
    }
    setLoading(false)
  }, [page, sort])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    if (key !== "page") params.delete("page")
    router.push(`/admin/products?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Termékek</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} termék összesen</p>
        </div>
        <Button size="sm" render={<Link href="/admin/products/new" />}>
          <Plus className="mr-2 size-4" />
          Új termék
        </Button>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        {[
          { value: "newest", label: "Legújabb" },
          { value: "price_asc", label: "Ár ↑" },
          { value: "price_desc", label: "Ár ↓" },
        ].map((opt) => (
          <Button
            key={opt.value}
            variant={sort === opt.value ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => updateParam("sort", opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Betöltés...
        </div>
      ) : products.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <p>Nincs termék.</p>
          <Button size="sm" render={<Link href="/admin/products/new" />}>
            <Plus className="mr-2 size-4" />
            Első termék létrehozása
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Termék</TableHead>
              <TableHead>Kategóriák</TableHead>
              <TableHead className="text-right">Ár</TableHead>
              <TableHead>Státusz</TableHead>
              <TableHead className="text-right">Létrehozva</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow
                key={product.id}
                className="cursor-pointer"
                onClick={() => router.push(`/admin/products/${product.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    {product.main_image_url ? (
                      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        <img
                          src={product.main_image_url}
                          alt=""
                          className="size-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                        —
                      </div>
                    )}
                    <span className="font-medium">{product.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {product.categoryNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {product.categoryNames.map((name) => (
                        <Badge
                          key={name}
                          variant="secondary"
                          className="text-[11px] px-1.5 py-0 font-normal"
                        >
                          {name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <div>
                    <span className="font-medium">{formatHUF(product.base_price)}</span>
                    {product.compare_at_price && (
                      <span className="ml-2 text-xs text-muted-foreground line-through">
                        {formatHUF(product.compare_at_price)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {product.is_active &&
                  product.published_at &&
                  new Date(product.published_at) > new Date() ? (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="size-3" />
                      <span>
                        Ütemezett{" "}
                        <span className="font-normal text-muted-foreground">
                          {formatDate(product.published_at)}
                        </span>
                      </span>
                    </Badge>
                  ) : product.is_active ? (
                    <Badge variant="default" className="gap-1">
                      <Eye className="size-3" />
                      Aktív
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <EyeOff className="size-3" />
                      Inaktív
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatDate(product.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      <AdminPagination
        page={page}
        totalPages={totalPages}
        onPageChange={(n) => updateParam("page", String(n))}
      />
    </div>
  )
}
