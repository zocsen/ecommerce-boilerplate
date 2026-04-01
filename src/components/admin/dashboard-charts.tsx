"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface DailyDataPoint {
  date: string; // "03. 01." format
  revenue: number;
  orders: number;
}

/* ------------------------------------------------------------------ */
/*  Chart configs                                                       */
/* ------------------------------------------------------------------ */

const revenueConfig: ChartConfig = {
  revenue: {
    label: "Bevétel (Ft)",
    color: "hsl(var(--chart-1))",
  },
};

const ordersConfig: ChartConfig = {
  orders: {
    label: "Rendelések",
    color: "hsl(var(--chart-2))",
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface DashboardChartsProps {
  data: DailyDataPoint[];
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Napi bevétel</CardTitle>
          <CardDescription>Elmúlt 30 nap (Ft)</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueConfig} className="aspect-[2/1] w-full">
            <BarChart data={data} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}e` : String(v))}
                fontSize={11}
                width={48}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => {
                      const num = typeof value === "number" ? value : Number(value);
                      return `${num.toLocaleString("hu-HU")} Ft`;
                    }}
                  />
                }
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Orders chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Napi rendelések</CardTitle>
          <CardDescription>Elmúlt 30 nap</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={ordersConfig} className="aspect-[2/1] w-full">
            <BarChart data={data} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                fontSize={11}
                width={32}
                allowDecimals={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => {
                      const num = typeof value === "number" ? value : Number(value);
                      return `${num} db`;
                    }}
                  />
                }
              />
              <Bar dataKey="orders" fill="var(--color-orders)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
