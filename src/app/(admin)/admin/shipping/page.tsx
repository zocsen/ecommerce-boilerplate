import { siteConfig } from "@/lib/config/site.config";
import { formatHUF } from "@/lib/utils/format";
import { getAvailableCarriers } from "@/lib/utils/shipping";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Truck, Package, MapPin } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Admin Shipping Configuration (read-only display)                   */
/* ------------------------------------------------------------------ */

export default function AdminShippingPage() {
  const { shipping } = siteConfig;
  const homeCarriers = getAvailableCarriers("home");
  const pickupCarriers = getAvailableCarriers("pickup");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Szállítás</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Szállítási módok és díjszabás konfigurációja. A beállítások a{" "}
          <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">site.config.ts</code>{" "}
          fájlban módosíthatók.
        </p>
      </div>

      {/* Fee rules */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-sm">Alap szállítási díj</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {formatHUF(shipping.rules.baseFee)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-sm">Ingyenes szállítás felett</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {shipping.rules.freeOver > 0 ? formatHUF(shipping.rules.freeOver) : "Nincs"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-sm">Súlysáv díjak</div>
            <div className="mt-1 text-2xl font-semibold">
              {shipping.rules.weightTiers.length > 0
                ? `${shipping.rules.weightTiers.length} sáv`
                : "Nincs beállítva"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Methods enabled */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Home Delivery */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                <Truck className="size-5" />
              </div>
              <div>
                <CardTitle>Házhozszállítás</CardTitle>
                <CardDescription>
                  {shipping.methods.homeDelivery ? (
                    <Badge variant="default" className="mt-1 text-xs">
                      Engedélyezve
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Letiltva
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {homeCarriers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Futár</TableHead>
                    <TableHead>Azonosító</TableHead>
                    <TableHead className="text-right">Díj</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {homeCarriers.map((carrier) => (
                    <TableRow key={carrier.id}>
                      <TableCell className="font-medium">{carrier.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {carrier.id}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatHUF(carrier.fee)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">Nincs konfigurált futárszolgálat.</p>
            )}
          </CardContent>
        </Card>

        {/* Pickup Points */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                <MapPin className="size-5" />
              </div>
              <div>
                <CardTitle>Csomagautomata / Átvételi pont</CardTitle>
                <CardDescription>
                  {shipping.methods.pickupPoint ? (
                    <Badge variant="default" className="mt-1 text-xs">
                      Engedélyezve
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Letiltva
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pickupCarriers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Szolgáltató</TableHead>
                    <TableHead>Azonosító</TableHead>
                    <TableHead className="text-right">Díj</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pickupCarriers.map((carrier) => (
                    <TableRow key={carrier.id}>
                      <TableCell className="font-medium">{carrier.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {carrier.id}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatHUF(carrier.fee)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nincs konfigurált átvételi pont szolgáltató.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weight tiers */}
      {shipping.rules.weightTiers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                <Package className="size-5" />
              </div>
              <div>
                <CardTitle>Súlysáv díjak</CardTitle>
                <CardDescription>A szállítási díj a csomag súlya alapján változik.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Max. súly (kg)</TableHead>
                  <TableHead className="text-right">Díj</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipping.rules.weightTiers.map((tier, i) => (
                  <TableRow key={i}>
                    <TableCell className="tabular-nums">{tier.maxWeightKg} kg</TableCell>
                    <TableCell className="text-right tabular-nums">{formatHUF(tier.fee)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
