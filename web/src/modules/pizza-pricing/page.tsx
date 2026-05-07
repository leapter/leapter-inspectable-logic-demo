"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pie, PieChart, Cell, Label } from "recharts";
import {
  describeBlueprintInputs,
  runBlueprint,
} from "@/lib/runtime";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label as FieldLabel } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import Image from "next/image";
import {
  Pizza,
  Layers,
  Sparkles,
  Calendar,
  CalendarDays,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BlueprintStatus } from "@/components/blueprint-status";
import { GlassMode } from "@/components/glass-mode";
import { useGlassContext } from "@/components/glass-mode/context";
import type { TraceData } from "@leapter/client";
import { projectConfig } from "@/lib/project";
import {
  schema,
  type FormValues,
  type DayOfWeek,
  type ToppingId,
  DEFAULT_SIZES,
  DEFAULT_CRUSTS,
  DEFAULT_DAYS,
  SIZE_META,
  CRUST_META,
  DAY_META,
  TOPPINGS,
  getTodayDayOfWeek,
} from "./schema";

const project = projectConfig;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number, fractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function formatSignedCurrency(value: number) {
  if (Math.abs(value) < 0.005) return formatCurrency(0);
  const sign = value > 0 ? "+" : "−";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CRUST_ICONS: Record<string, typeof Pizza> = {
  thin: Layers,
  regular: Pizza,
  stuffed: Sparkles,
};

// ─── Pizza Size Selector ───────────────────────────────────────────────────────

function PizzaSizeSelector({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {options.map((size) => {
        const selected = value === size;
        const meta = SIZE_META[size];
        const ringSize = meta?.ringSize ?? 76;
        return (
          <button
            key={size}
            type="button"
            onClick={() => onChange(size)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all",
              selected
                ? "shadow-sm"
                : "border-border bg-background hover:bg-muted/50",
            )}
            style={
              selected
                ? {
                    borderColor: "var(--app-accent)",
                    backgroundColor:
                      "color-mix(in oklch, var(--app-accent) 8%, transparent)",
                  }
                : undefined
            }
          >
            <div
              className="rounded-full transition-all"
              style={{
                width: ringSize,
                height: ringSize,
                background: selected
                  ? "color-mix(in oklch, var(--app-accent) 18%, transparent)"
                  : "color-mix(in oklch, var(--muted-foreground) 12%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Pizza
                className={cn(
                  "transition-colors",
                  !selected && "text-muted-foreground",
                )}
                style={{
                  color: selected ? "var(--app-accent)" : undefined,
                  width: ringSize * 0.55,
                  height: ringSize * 0.55,
                }}
              />
            </div>
            <div className="flex flex-col items-center">
              <span
                className="text-sm font-semibold"
                style={selected ? { color: "var(--app-accent)" } : undefined}
              >
                {meta?.label ?? capitalize(size)}
              </span>
              {meta?.diameter && (
                <span className="text-xs text-muted-foreground">
                  {meta.diameter}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Topping Selector ──────────────────────────────────────────────────────────

function ToppingSelector({
  value,
  onChange,
}: {
  value: ToppingId[];
  onChange: (v: ToppingId[]) => void;
}) {
  function toggle(id: ToppingId) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <FieldLabel>Toppings</FieldLabel>
        <span className="text-sm tabular-nums text-muted-foreground">
          {value.length === 0 ? (
            "None selected"
          ) : (
            <>
              <span className="font-semibold text-foreground">
                {value.length}
              </span>{" "}
              selected
            </>
          )}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {TOPPINGS.map((topping) => {
          const selected = value.includes(topping.id);
          return (
            <button
              key={topping.id}
              type="button"
              onClick={() => toggle(topping.id)}
              aria-pressed={selected}
              className={cn(
                "group relative flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all",
                selected
                  ? "shadow-sm"
                  : "border-border bg-background hover:bg-muted/50",
              )}
              style={
                selected
                  ? {
                      borderColor: "var(--app-accent)",
                      backgroundColor:
                        "color-mix(in oklch, var(--app-accent) 8%, transparent)",
                    }
                  : undefined
              }
            >
              <span className="text-2xl leading-none">{topping.emoji}</span>
              <p
                className="flex-1 min-w-0 text-sm font-medium truncate"
                style={selected ? { color: "var(--app-accent)" } : undefined}
              >
                {topping.name}
              </p>
              {selected && (
                <Check
                  className="h-4 w-4 shrink-0"
                  style={{ color: "var(--app-accent)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Crust Selector ────────────────────────────────────────────────────────────

function CrustSelector({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {options.map((crust) => {
        const Icon = CRUST_ICONS[crust] ?? Pizza;
        const selected = value === crust;
        const meta = CRUST_META[crust];
        return (
          <button
            key={crust}
            type="button"
            onClick={() => onChange(crust)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
              selected
                ? "shadow-sm"
                : "border-border bg-background hover:bg-muted/50",
            )}
            style={
              selected
                ? {
                    borderColor: "var(--app-accent)",
                    backgroundColor:
                      "color-mix(in oklch, var(--app-accent) 8%, transparent)",
                  }
                : undefined
            }
          >
            <Icon
              className={cn(
                "h-5 w-5",
                !selected && "text-muted-foreground",
              )}
              style={selected ? { color: "var(--app-accent)" } : undefined}
            />
            <div>
              <p
                className="text-sm font-semibold"
                style={selected ? { color: "var(--app-accent)" } : undefined}
              >
                {meta?.label ?? capitalize(crust)}
              </p>
              {meta?.description && (
                <p className="text-xs text-muted-foreground">
                  {meta.description}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Today Banner ──────────────────────────────────────────────────────────────

function TodayBanner({ today }: { today: DayOfWeek }) {
  const meta = DAY_META[today];
  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{
        borderColor: "color-mix(in oklch, var(--app-accent) 25%, transparent)",
        backgroundColor:
          "color-mix(in oklch, var(--app-accent) 4%, var(--background))",
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor:
            "color-mix(in oklch, var(--app-accent) 14%, transparent)",
        }}
      >
        <CalendarDays
          className="h-5 w-5"
          style={{ color: "var(--app-accent)" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">
          Pricing for {meta?.long ?? capitalize(today)}
        </p>
        <p className="text-xs text-muted-foreground">
          See how other days compare in your result.
        </p>
      </div>
    </div>
  );
}

// ─── Result Display ────────────────────────────────────────────────────────────

interface PizzaResult {
  totalPrice: number;
  basePrice: number;
  toppingsCost: number;
  crustUpcharge: number;
  subtotal: number;
  dayMultiplier: number;
  weeklyPrices: number[];
}

function TotalHeroCard({
  data,
  pickedDay,
  days,
}: {
  data: PizzaResult;
  pickedDay: DayOfWeek;
  days: string[];
}) {
  const dayMeta = DAY_META[pickedDay];
  const delta = data.totalPrice - data.subtotal;
  const pct = Math.round(Math.abs(1 - data.dayMultiplier) * 100);
  const tag =
    data.dayMultiplier < 0.995
      ? `−${pct}%`
      : data.dayMultiplier > 1.005
        ? `+${pct}%`
        : null;

  return (
    <Card
      className="bg-background"
      style={{
        borderColor: "color-mix(in oklch, var(--app-accent) 25%, transparent)",
        backgroundColor:
          "color-mix(in oklch, var(--app-accent) 4%, var(--background))",
      }}
    >
      <CardContent className="py-6">
        <div className="flex flex-col items-center text-center gap-1">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Your Pizza Total · {dayMeta?.long ?? capitalize(pickedDay)}
          </p>
          <p
            className="text-5xl font-bold tracking-tight tabular-nums"
            style={{ color: "var(--app-accent)" }}
          >
            {formatCurrency(data.totalPrice)}
          </p>
          {Math.abs(delta) > 0.005 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {delta < 0 ? "saves " : "adds "}
              <span className="font-semibold text-foreground">
                {formatCurrency(Math.abs(delta))}
              </span>{" "}
              vs. regular price
              {tag && <> ({tag})</>}
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">final price</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const breakdownConfig = {
  base: { label: "Base price", color: "var(--chart-1)" },
  toppings: { label: "Toppings", color: "var(--chart-2)" },
  crust: { label: "Crust upcharge", color: "var(--chart-3)" },
} satisfies ChartConfig;

function BreakdownChart({
  data,
  pickedDay,
}: {
  data: PizzaResult;
  pickedDay: DayOfWeek;
}) {
  const chartData = useMemo(() => {
    const entries = [
      { key: "base", label: "Base price", value: data.basePrice, fill: "var(--color-base)" },
      { key: "toppings", label: "Toppings", value: data.toppingsCost, fill: "var(--color-toppings)" },
      { key: "crust", label: "Crust upcharge", value: data.crustUpcharge, fill: "var(--color-crust)" },
    ];
    return entries.filter((entry) => entry.value > 0);
  }, [data]);

  const dayAdjustment = data.totalPrice - data.subtotal;
  const hasDayAdjustment = Math.abs(dayAdjustment) > 0.005;
  const dayMeta = DAY_META[pickedDay];
  const pct = Math.round(Math.abs(1 - data.dayMultiplier) * 100);
  const dayLabel = dayAdjustment < 0
    ? `${dayMeta?.long ?? capitalize(pickedDay)} discount (−${pct}%)`
    : `${dayMeta?.long ?? capitalize(pickedDay)} premium (+${pct}%)`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Breakdown</CardTitle>
        <CardDescription>How your total is composed</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-[200px_1fr] items-center gap-6">
        <ChartContainer
          config={breakdownConfig}
          className="mx-auto aspect-square w-full max-w-[200px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _name, item) => (
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: item.payload.fill }}
                      />
                      <span className="text-muted-foreground">
                        {item.payload.label}
                      </span>
                      <span className="ml-auto font-mono font-medium tabular-nums">
                        {formatCurrency(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              innerRadius={55}
              outerRadius={85}
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (
                    !viewBox ||
                    !("cx" in viewBox) ||
                    !("cy" in viewBox)
                  ) {
                    return null;
                  }
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) - 6}
                        className="fill-foreground text-xl font-bold tabular-nums"
                      >
                        {formatCurrency(data.subtotal, 0)}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 12}
                        className="fill-muted-foreground text-xs"
                      >
                        Subtotal
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="space-y-3 text-sm">
          <BreakdownRow
            color="var(--color-base)"
            label="Base price"
            value={data.basePrice}
            total={data.subtotal}
          />
          <BreakdownRow
            color="var(--color-toppings)"
            label="Toppings"
            value={data.toppingsCost}
            total={data.subtotal}
          />
          <BreakdownRow
            color="var(--color-crust)"
            label="Crust upcharge"
            value={data.crustUpcharge}
            total={data.subtotal}
            mutedWhenZero
          />
          <Separator />
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums font-medium">
              {formatCurrency(data.subtotal)}
            </span>
          </div>
          {hasDayAdjustment && (
            <div
              className={cn(
                "flex items-center justify-between",
                dayAdjustment < 0 ? "text-emerald-600" : "text-orange-600",
              )}
            >
              <span>{dayLabel}</span>
              <span className="tabular-nums font-medium">
                {formatSignedCurrency(dayAdjustment)}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span className="tabular-nums">
              {formatCurrency(data.totalPrice)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownRow({
  color,
  label,
  value,
  total,
  mutedWhenZero,
}: {
  color: string;
  label: string;
  value: number;
  total: number;
  mutedWhenZero?: boolean;
}) {
  const muted = mutedWhenZero && value === 0;
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        muted && "text-muted-foreground",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="h-2.5 w-2.5 rounded-sm shrink-0"
          style={{ backgroundColor: color, opacity: muted ? 0.4 : 1 }}
        />
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-2 tabular-nums">
        <span className="text-xs text-muted-foreground">
          {pct.toFixed(0)}%
        </span>
        <span className="font-medium">{formatCurrency(value)}</span>
      </div>
    </div>
  );
}

function WeeklyComparison({
  data,
  pickedDay,
  days,
}: {
  data: PizzaResult;
  pickedDay: DayOfWeek;
  days: string[];
}) {
  const maxPrice = Math.max(...data.weeklyPrices);
  const pickedIndex = days.indexOf(pickedDay);
  const pickedPrice = data.weeklyPrices[pickedIndex];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Compare with other days
        </CardTitle>
        <CardDescription>
          Same pizza, different day. Bars show the price; deltas are vs.{" "}
          <span className="font-medium text-foreground">
            {DAY_META[pickedDay]?.long ?? capitalize(pickedDay)}
          </span>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {days.map((day, idx) => {
            const price = data.weeklyPrices[idx];
            if (price == null) return null;
            const meta = DAY_META[day];
            const isActive = day === pickedDay;
            const widthPct = maxPrice > 0 ? (price / maxPrice) * 100 : 0;
            const delta = price - pickedPrice;
            const isCheaper = delta < -0.005;
            const isPricier = delta > 0.005;

            const multiplier = data.subtotal > 0 ? price / data.subtotal : 1;
            const pct = Math.round(Math.abs(1 - multiplier) * 100);
            const tag =
              multiplier < 0.995
                ? `−${pct}%`
                : multiplier > 1.005
                  ? `+${pct}%`
                  : null;

            const barColor = isActive
              ? "var(--app-accent)"
              : isCheaper
                ? "color-mix(in oklch, var(--chart-2) 70%, transparent)"
                : isPricier
                  ? "color-mix(in oklch, var(--app-accent) 35%, transparent)"
                  : "color-mix(in oklch, var(--muted-foreground) 25%, transparent)";

            return (
              <div
                key={day}
                className={cn(
                  "grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5",
                  isActive && "bg-muted/40",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {meta?.short ?? day.slice(0, 3)}
                  </span>
                  {tag && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                      style={{
                        color: multiplier < 1
                          ? "var(--chart-2)"
                          : "var(--app-accent)",
                        opacity: 0.9,
                      }}
                    >
                      {tag}
                    </span>
                  )}
                </div>

                <div className="relative h-7 rounded-md bg-muted/40 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md transition-all"
                    style={{
                      width: `${Math.max(widthPct, 6)}%`,
                      backgroundColor: barColor,
                    }}
                  />
                  <div className="absolute inset-y-0 left-2 flex items-center">
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        isActive ? "text-white" : "text-foreground/80",
                      )}
                    >
                      {formatCurrency(price)}
                    </span>
                  </div>
                </div>

                <div className="w-[88px] text-right">
                  {isActive ? (
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--app-accent)" }}
                    >
                      Picked
                    </span>
                  ) : Math.abs(delta) < 0.005 ? (
                    <span className="text-xs text-muted-foreground">
                      same price
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        isCheaper ? "text-emerald-600" : "text-foreground",
                      )}
                    >
                      {isCheaper ? "save " : ""}
                      {formatSignedCurrency(delta)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PizzaResults({
  data,
  pickedDay,
  days,
}: {
  data: PizzaResult;
  pickedDay: DayOfWeek;
  days: string[];
}) {
  return (
    <div className="space-y-6">
      <TotalHeroCard data={data} pickedDay={pickedDay} days={days} />
      <BreakdownChart data={data} pickedDay={pickedDay} />
      <WeeklyComparison data={data} pickedDay={pickedDay} days={days} />
    </div>
  );
}

// ─── Intro Banner ─────────────────────────────────────────────────────────────

function IntroBanner({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-500 ease-out",
        visible
          ? "max-h-40 opacity-100"
          : "max-h-0 opacity-0 pointer-events-none",
      )}
    >
      <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-4">
        <Image
          src="/leapter-logo-icon.svg"
          alt=""
          width={18}
          height={18}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            This app&apos;s pricing logic lives in a visual Leapter blueprint
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Change any input to see the price update. The logic panel will
            open automatically to turn the calculation logic into a glass box.
          </p>
        </div>
      </div>
    </div>
  );
}

function StickyPriceBar({
  data,
  loading,
  pickedDay,
}: {
  data: PizzaResult | null;
  loading: boolean;
  pickedDay: DayOfWeek;
}) {
  const [bounce, setBounce] = useState(false);
  const prevPrice = useRef(data?.totalPrice);

  useEffect(() => {
    if (data && prevPrice.current !== undefined && data.totalPrice !== prevPrice.current) {
      setBounce(true);
      const t = setTimeout(() => setBounce(false), 400);
      return () => clearTimeout(t);
    }
  }, [data?.totalPrice]);

  useEffect(() => {
    if (data) prevPrice.current = data.totalPrice;
  }, [data?.totalPrice]);

  if (!data) return null;

  const dayMeta = DAY_META[pickedDay];
  const pct = Math.round(Math.abs(1 - data.dayMultiplier) * 100);
  const tag =
    data.dayMultiplier < 0.995
      ? `−${pct}%`
      : data.dayMultiplier > 1.005
        ? `+${pct}%`
        : null;

  const isDiscount = data.dayMultiplier < 0.995;
  const isPremium = data.dayMultiplier > 1.005;
  const dayAdjustment = data.totalPrice - data.subtotal;

  return (
    <div className="sticky bottom-0 -mx-6 -mb-10 z-10">
      <div className="border-t border-border/60 bg-background/90 backdrop-blur-xl px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 min-w-0">
            <p
              className={cn(
                "text-3xl font-bold tabular-nums tracking-tight origin-left",
                loading && "opacity-50",
                bounce && "animate-price-bounce",
              )}
              style={{ color: "var(--app-accent)" }}
            >
              {formatCurrency(data.totalPrice)}
            </p>
            <Separator orientation="vertical" className="h-8" />
            <div className="hidden sm:flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {dayMeta?.long ?? capitalize(pickedDay)}
                {tag && (
                  <span
                    className={cn(
                      "ml-2 text-xs font-semibold",
                      isDiscount && "text-emerald-600",
                      isPremium && "text-orange-600",
                    )}
                  >
                    {tag}
                    {isDiscount && ` · save ${formatCurrency(Math.abs(dayAdjustment))}`}
                    {isPremium && ` · ${formatCurrency(Math.abs(dayAdjustment))} extra`}
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatCurrency(data.basePrice)} base
                {data.toppingsCost > 0 &&
                  ` · ${formatCurrency(data.toppingsCost)} toppings`}
                {data.crustUpcharge > 0 &&
                  ` · ${formatCurrency(data.crustUpcharge)} crust`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AutoRevealLogic({ trigger }: { trigger: boolean }) {
  const ctx = useGlassContext();
  const fired = useRef(false);
  useEffect(() => {
    if (trigger && !fired.current && ctx) {
      fired.current = true;
      ctx.openLogic();
    }
  }, [trigger, ctx]);
  return null;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PizzaPricingPage() {
  const [today] = useState<DayOfWeek>(() => getTodayDayOfWeek());
  const [result, setResult] = useState<PizzaResult | null>(null);
  const [resultDay, setResultDay] = useState<DayOfWeek>(today);
  const [runId, setRunId] = useState<string | undefined>();
  const [modelId, setModelId] = useState<string | undefined>();
  const [traceData, setTraceData] = useState<TraceData | undefined>();
  const [submittedInput, setSubmittedInput] = useState<
    Record<string, unknown> | undefined
  >();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const requestSeq = useRef(0);

  // Schema-driven options (fetched from blueprint's OpenAPI spec)
  const [sizeOptions, setSizeOptions] = useState<string[]>([...DEFAULT_SIZES]);
  const [crustOptions, setCrustOptions] = useState<string[]>([...DEFAULT_CRUSTS]);
  const [dayOptions, setDayOptions] = useState<string[]>([...DEFAULT_DAYS]);

  useEffect(() => {
    async function loadSchema() {
      const res = await describeBlueprintInputs(
        { projectSlug: project.slug, projectId: project.projectId },
        project.blueprintSlug,
      );
      if (res.success) {
        const props = res.inputProperties as Record<string, any>;
        if (props.pizzaSize?.enum) setSizeOptions(props.pizzaSize.enum);
        if (props.crustType?.enum) setCrustOptions(props.crustType.enum);
        if (props.dayOfWeek?.enum) setDayOptions(props.dayOfWeek.enum);
      }
    }
    loadSchema();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      pizzaSize: "medium",
      toppings: ["tomato", "mushroom"],
      crustType: "regular",
      dayOfWeek: today,
    },
  });

  const pizzaSize = useWatch({ control: form.control, name: "pizzaSize" });
  const toppings = useWatch({ control: form.control, name: "toppings" });
  const crustType = useWatch({ control: form.control, name: "crustType" });

  useEffect(() => {
    if (!pizzaSize || !crustType || !toppings) return;

    const values: FormValues = {
      pizzaSize,
      toppings,
      crustType,
      dayOfWeek: today,
    };

    const timer = setTimeout(async () => {
      const seq = ++requestSeq.current;
      setLoading(true);
      const response = await runBlueprint(
        { projectSlug: project.slug, projectId: project.projectId },
        project.blueprintSlug,
        values,
      );
      if (seq !== requestSeq.current) return;
      if (response.success) {
        setError(null);
        setRunId(response.runId);
        setModelId(response.modelId);
        setSubmittedInput(values as unknown as Record<string, unknown>);
        setResult(response.data as unknown as PizzaResult);
        setResultDay(values.dayOfWeek as DayOfWeek);
        setTraceData(response.traceData);
      } else {
        setError(response.error);
      }
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [pizzaSize, crustType, toppings, today]);

  const hasResult = Boolean(result);

  return (
    <GlassMode
      projectSlug={project.slug}
      blueprintSlug={project.blueprintSlug}
      localProjectId={project.projectId}
      accentColor={project.accentColor}
      run={{
        runId,
        modelId: modelId ?? project.modelId,
        traceData,
        inputData: submittedInput,
        outputData: result as unknown as Record<string, unknown> | undefined,
      }}
    >
      <AutoRevealLogic trigger={userInteracted} />
      <IntroBanner visible={!userInteracted} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Pizza Pricing Calculator
            </h1>
            {loading && (
              <span
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                aria-live="polite"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Pick a size, add toppings, choose a crust — the price updates
            automatically with today&apos;s day-of-week pricing applied.
          </p>
        </div>
        <GlassMode.Toggle />
      </div>

      <BlueprintStatus
        projectSlug={project.slug}
        blueprintSlug={project.blueprintSlug}
      />

      <TodayBanner today={today} />

      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-6"
      >
        {/* Step 1 — Size */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-semibold"
                style={{ backgroundColor: "var(--app-accent)" }}
              >
                1
              </div>
              <div>
                <CardTitle>Choose a size</CardTitle>
                <CardDescription>
                  Bigger pizza, bigger base price.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <PizzaSizeSelector
              value={pizzaSize}
              options={sizeOptions}
              onChange={(v) => {
                setUserInteracted(true);
                form.setValue("pizzaSize", v, { shouldValidate: true });
              }}
            />
            {form.formState.errors.pizzaSize && (
              <p className="mt-3 text-sm text-destructive">
                {form.formState.errors.pizzaSize.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Step 2 — Toppings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-semibold"
                style={{ backgroundColor: "var(--app-accent)" }}
              >
                2
              </div>
              <div>
                <CardTitle>Pick toppings</CardTitle>
                <CardDescription>
                  Mix and match your favorites.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ToppingSelector
              value={toppings}
              onChange={(v) => {
                setUserInteracted(true);
                form.setValue("toppings", v, { shouldValidate: true });
              }}
            />
          </CardContent>
        </Card>

        {/* Step 3 — Crust */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-semibold"
                style={{ backgroundColor: "var(--app-accent)" }}
              >
                3
              </div>
              <div>
                <CardTitle>Pick a crust</CardTitle>
                <CardDescription>
                  Choose your preferred crust style.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CrustSelector
              value={crustType}
              options={crustOptions}
              onChange={(v) => {
                setUserInteracted(true);
                form.setValue("crustType", v, { shouldValidate: true });
              }}
            />
            {form.formState.errors.crustType && (
              <p className="mt-3 text-sm text-destructive">
                {form.formState.errors.crustType.message}
              </p>
            )}
          </CardContent>
        </Card>

      </form>

      <div aria-live="polite" className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && hasResult ? (
          <GlassMode.Result>
            <div
              className={cn(
                "transition-opacity duration-200",
                loading && "opacity-70",
              )}
            >
              <PizzaResults data={result} pickedDay={resultDay} days={dayOptions} />
            </div>
          </GlassMode.Result>
        ) : (
          !error && (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <Loader2
                  className="h-5 w-5 animate-spin"
                  style={{ color: "var(--app-accent)" }}
                />
                <p className="text-muted-foreground">
                  Calculating your pizza…
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      <StickyPriceBar data={result} loading={loading} pickedDay={resultDay} />
    </GlassMode>
  );
}
