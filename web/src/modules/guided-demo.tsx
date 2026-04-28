"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pie, PieChart, Cell, Label as PieLabel } from "recharts";
import { executeBlueprint } from "@/app/actions/blueprint";
import { getClientConfig } from "@/lib/runtime-config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Pizza,
  Layers,
  Sparkles,
  Calendar,
  CalendarDays,
  Check,
  Workflow,
  Play,
  ArrowRight,
  RotateCcw,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassMode } from "@/components/glass-mode";
import type { TraceData } from "@leapter/client";
import { projectConfig } from "@/lib/project";
import {
  schema,
  type FormValues,
  type DayOfWeek,
  type ToppingId,
  DAYS_OF_WEEK,
  TOPPINGS,
  TOPPING_PRICE,
  getTodayDayOfWeek,
} from "@/modules/pizza-pricing/schema";

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

const DAY_INFO: Record<
  DayOfWeek,
  { short: string; long: string; multiplier: number; tag?: string }
> = {
  monday: { short: "Mon", long: "Monday", multiplier: 1.0 },
  tuesday: { short: "Tue", long: "Tuesday", multiplier: 0.8, tag: "−20%" },
  wednesday: { short: "Wed", long: "Wednesday", multiplier: 0.9, tag: "−10%" },
  thursday: { short: "Thu", long: "Thursday", multiplier: 1.0 },
  friday: { short: "Fri", long: "Friday", multiplier: 1.1, tag: "+10%" },
  saturday: { short: "Sat", long: "Saturday", multiplier: 1.15, tag: "+15%" },
  sunday: { short: "Sun", long: "Sunday", multiplier: 1.0 },
};

// ─── Preset Scenarios ──────────────────────────────────────────────────────────

type ScenarioId = "pizza-tuesday" | "weekend-feast" | "plain-margherita";

interface Scenario {
  id: ScenarioId;
  label: string;
  description: string;
  highlight: string;
  values: Omit<FormValues, "dayOfWeek">;
}

// Day is fixed to today across scenarios (the calculator no longer lets the
// user change the day, so the demo also stays anchored to today).
const scenarios: Scenario[] = [
  {
    id: "pizza-tuesday",
    label: "Pizza Tuesday Sweet Spot",
    description:
      "Large + 4 toppings + stuffed crust — both the size base and the day discount fire.",
    highlight: "Day discount + crust upcharge",
    values: {
      pizzaSize: "large",
      toppings: ["tomato", "mushroom", "bacon", "prosciutto"],
      crustType: "stuffed",
    },
  },
  {
    id: "weekend-feast",
    label: "Weekend Family Feast",
    description:
      "Large + 6 toppings + regular crust — see how the toppings stack and the weekend premium applies.",
    highlight: "Toppings stack + premium",
    values: {
      pizzaSize: "large",
      toppings: [
        "tomato",
        "mushroom",
        "olive",
        "bell-pepper",
        "mozzarella",
        "shrimp",
      ],
      crustType: "regular",
    },
  },
  {
    id: "plain-margherita",
    label: "Plain Margherita",
    description:
      "Small + 1 topping + thin crust — the minimal path through the pricing logic.",
    highlight: "Minimum path through rules",
    values: {
      pizzaSize: "small",
      toppings: ["tomato"],
      crustType: "thin",
    },
  },
];

// ─── Pizza Size Selector ───────────────────────────────────────────────────────

const sizes = [
  { value: "small", label: "Small", diameter: '10"', basePrice: 8, ringSize: 56 },
  { value: "medium", label: "Medium", diameter: '12"', basePrice: 12, ringSize: 76 },
  { value: "large", label: "Large", diameter: '16"', basePrice: 16, ringSize: 96 },
] as const;

function PizzaSizeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "small" | "medium" | "large") => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {sizes.map((size) => {
        const selected = value === size.value;
        return (
          <button
            key={size.value}
            type="button"
            onClick={() => onChange(size.value)}
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
              className="rounded-full transition-all flex items-center justify-center"
              style={{
                width: size.ringSize,
                height: size.ringSize,
                background: selected
                  ? "color-mix(in oklch, var(--app-accent) 18%, transparent)"
                  : "color-mix(in oklch, var(--muted-foreground) 12%, transparent)",
              }}
            >
              <Pizza
                className={cn(
                  "transition-colors",
                  !selected && "text-muted-foreground",
                )}
                style={{
                  color: selected ? "var(--app-accent)" : undefined,
                  width: size.ringSize * 0.55,
                  height: size.ringSize * 0.55,
                }}
              />
            </div>
            <div className="flex flex-col items-center">
              <span
                className="text-sm font-semibold"
                style={selected ? { color: "var(--app-accent)" } : undefined}
              >
                {size.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {size.diameter} · {formatCurrency(size.basePrice, 0)}
              </span>
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
  const selectedTotal = value.length * TOPPING_PRICE;

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
        <Label>Toppings</Label>
        <span className="text-sm tabular-nums text-muted-foreground">
          {value.length === 0 ? (
            "None selected"
          ) : (
            <>
              <span className="font-semibold text-foreground">
                {value.length}
              </span>{" "}
              selected ·{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(selectedTotal)}
              </span>
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
      <p className="text-xs text-muted-foreground">
        {formatCurrency(TOPPING_PRICE)} per topping
      </p>
    </div>
  );
}

// ─── Crust Selector ────────────────────────────────────────────────────────────

const crusts = [
  { value: "thin", label: "Thin", description: "Crispy and light", upcharge: 0, icon: Layers },
  { value: "regular", label: "Regular", description: "Classic hand-tossed", upcharge: 0, icon: Pizza },
  { value: "stuffed", label: "Stuffed", description: "Cheese-filled edge", upcharge: 3, icon: Sparkles },
] as const;

function CrustSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "thin" | "regular" | "stuffed") => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {crusts.map((crust) => {
        const Icon = crust.icon;
        const selected = value === crust.value;
        return (
          <button
            key={crust.value}
            type="button"
            onClick={() => onChange(crust.value)}
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
            <div className="flex w-full items-start justify-between gap-2">
              <Icon
                className={cn("h-5 w-5", !selected && "text-muted-foreground")}
                style={selected ? { color: "var(--app-accent)" } : undefined}
              />
              {crust.upcharge > 0 ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    backgroundColor:
                      "color-mix(in oklch, var(--app-accent) 18%, transparent)",
                    color: "var(--app-accent)",
                  }}
                >
                  +{formatCurrency(crust.upcharge, 0)}
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  Included
                </span>
              )}
            </div>
            <div>
              <p
                className="text-sm font-semibold"
                style={selected ? { color: "var(--app-accent)" } : undefined}
              >
                {crust.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {crust.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Today Banner ──────────────────────────────────────────────────────────────

function TodayBanner({ today }: { today: DayOfWeek }) {
  const info = DAY_INFO[today];
  const discount = info.multiplier < 1;
  const premium = info.multiplier > 1;
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
        <p className="text-sm font-semibold">Pricing for {info.long}</p>
        <p className="text-xs text-muted-foreground">
          {discount
            ? `${info.tag} discount applied today`
            : premium
              ? `${info.tag} premium applied today`
              : "Regular rate today"}
          {" — see how other days compare in your result."}
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

const breakdownConfig = {
  base: { label: "Base price", color: "var(--chart-1)" },
  toppings: { label: "Toppings", color: "var(--chart-2)" },
  crust: { label: "Crust upcharge", color: "var(--chart-3)" },
} satisfies ChartConfig;

function TotalHeroCard({
  data,
  pickedDay,
}: {
  data: PizzaResult;
  pickedDay: DayOfWeek;
}) {
  const dayInfo = DAY_INFO[pickedDay];
  const delta = data.totalPrice - data.subtotal;
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
            Your Pizza Total · {dayInfo.long}
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
              vs. regular price{dayInfo.tag && <> ({dayInfo.tag})</>}
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">final price</p>
          )}
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

function BreakdownChart({ data }: { data: PizzaResult }) {
  const chartData = useMemo(() => {
    const entries = [
      { key: "base", label: "Base price", value: data.basePrice, fill: "var(--color-base)" },
      { key: "toppings", label: "Toppings", value: data.toppingsCost, fill: "var(--color-toppings)" },
      { key: "crust", label: "Crust upcharge", value: data.crustUpcharge, fill: "var(--color-crust)" },
    ];
    return entries.filter((entry) => entry.value > 0);
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Breakdown</CardTitle>
        <CardDescription>How your subtotal is composed</CardDescription>
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
              <PieLabel
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
          <div className="flex items-center justify-between font-semibold">
            <span>Subtotal</span>
            <span className="tabular-nums">
              {formatCurrency(data.subtotal)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyComparison({
  data,
  pickedDay,
}: {
  data: PizzaResult;
  pickedDay: DayOfWeek;
}) {
  const maxPrice = Math.max(...data.weeklyPrices);
  const pickedIndex = DAYS_OF_WEEK.indexOf(pickedDay);
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
            {DAY_INFO[pickedDay].long}
          </span>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {DAYS_OF_WEEK.map((day, idx) => {
            const price = data.weeklyPrices[idx];
            const info = DAY_INFO[day];
            const isActive = day === pickedDay;
            const widthPct = maxPrice > 0 ? (price / maxPrice) * 100 : 0;
            const delta = price - pickedPrice;
            const isCheaper = delta < -0.005;
            const isPricier = delta > 0.005;

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
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {info.short}
                  </span>
                  {info.tag && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                      style={{
                        color:
                          info.multiplier < 1
                            ? "var(--chart-2)"
                            : "var(--app-accent)",
                        opacity: 0.9,
                      }}
                    >
                      {info.tag}
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
}: {
  data: PizzaResult;
  pickedDay: DayOfWeek;
}) {
  return (
    <div className="space-y-6">
      <TotalHeroCard data={data} pickedDay={pickedDay} />
      <BreakdownChart data={data} />
      <WeeklyComparison data={data} pickedDay={pickedDay} />
    </div>
  );
}

// ─── Demo Banner ───────────────────────────────────────────────────────────────

function DemoBanner({
  phase,
  onAutoRun,
  loading,
}: {
  phase: "start" | "form-ready" | "result-shown" | "glass-open";
  onAutoRun: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-4 sm:p-5"
      style={{
        borderColor:
          "color-mix(in oklch, #FA4B00 20%, color-mix(in oklch, #968DF6 20%, transparent))",
        background:
          "linear-gradient(135deg, color-mix(in oklch, #FA4B00 4%, var(--background)) 0%, color-mix(in oklch, #968DF6 4%, var(--background)) 100%)",
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(135deg, #FA4B00 0%, #968DF6 100%)",
          }}
        >
          <Workflow className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {phase === "start" && (
            <>
              <p className="font-semibold text-sm">
                What if you could verify AI-generated logic — without reading
                code?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This pizza pricing calculator was built by AI. The form below
                collects inputs, and a Leapter blueprint computes the price.
                Hit{" "}
                <strong className="text-foreground">Calculate Price</strong>{" "}
                and then click the result to see every rule that fired — step
                by step.
              </p>
              <button
                type="button"
                onClick={onAutoRun}
                disabled={loading}
                className={cn(
                  "mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all",
                  "text-white border-transparent",
                  loading && "opacity-60 cursor-not-allowed",
                )}
                style={{
                  background:
                    "linear-gradient(135deg, #FA4B00 0%, #968DF6 100%)",
                }}
              >
                <Play className="h-3.5 w-3.5" />
                {loading ? "Calculating…" : "Run the demo instantly"}
              </button>
            </>
          )}
          {phase === "form-ready" && (
            <>
              <p className="font-semibold text-sm">
                Form is pre-filled — ready to calculate
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Scroll down and click{" "}
                <strong className="text-foreground">Calculate Price</strong>{" "}
                — or tweak the inputs first to see how different values change
                the result.
              </p>
            </>
          )}
          {phase === "result-shown" && (
            <>
              <p className="font-semibold text-sm flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FA4B00] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FA4B00]" />
                </span>
                Now click the result below to see how it was calculated
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                The coral-purple border is the{" "}
                <strong className="text-foreground">Glass Mode</strong> portal.
                Click anywhere inside it to reveal the execution trace — every
                branch, every variable, step by step.
              </p>
            </>
          )}
          {phase === "glass-open" && (
            <>
              <p className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                You&apos;re looking at the execution trace
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                The highlighted path shows exactly which rules fired for this
                input. Hover over nodes to see variable values at each step.
                Try a different scenario below — the trace changes because the
                logic path changes.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Scenario Switcher ─────────────────────────────────────────────────────────

function ScenarioSwitcher({
  activeId,
  onSelect,
  disabled,
}: {
  activeId: ScenarioId | null;
  onSelect: (scenario: Scenario) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <RotateCcw className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Try a different scenario</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {scenarios.map((s) => {
          const active = activeId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(s)}
              className={cn(
                "flex flex-col rounded-xl border-2 p-4 text-left transition-all",
                active
                  ? "shadow-sm"
                  : "border-border bg-background hover:bg-muted/50",
                disabled && "opacity-50 cursor-not-allowed",
              )}
              style={
                active
                  ? {
                      borderColor: "var(--app-accent)",
                      backgroundColor:
                        "color-mix(in oklch, var(--app-accent) 6%, transparent)",
                    }
                  : undefined
              }
            >
              <p
                className="text-sm font-semibold"
                style={active ? { color: "var(--app-accent)" } : undefined}
              >
                {s.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {s.description}
              </p>
              <Badge variant="outline" className="mt-2 w-fit text-[10px]">
                {s.highlight}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Demo Page ────────────────────────────────────────────────────────────

export function GuidedDemo() {
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
  const [activeScenario, setActiveScenario] = useState<ScenarioId | null>(
    "pizza-tuesday",
  );
  const [glassAutoOpened, setGlassAutoOpened] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const defaultScenario = scenarios[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { ...defaultScenario.values, dayOfWeek: today },
  });

  const pizzaSize = useWatch({ control: form.control, name: "pizzaSize" });
  const toppings = useWatch({ control: form.control, name: "toppings" });
  const crustType = useWatch({ control: form.control, name: "crustType" });

  const phase: "start" | "form-ready" | "result-shown" | "glass-open" = result
    ? glassAutoOpened
      ? "glass-open"
      : "result-shown"
    : activeScenario
      ? "start"
      : "form-ready";

  const runCalculation = useCallback(
    async (values: FormValues) => {
      setLoading(true);
      setError(null);
      const override = getClientConfig(project.slug, project.projectId);
      const response = await executeBlueprint(
        project.blueprintSlug,
        values,
        override,
      );
      if (response.success) {
        setRunId(response.runId);
        setModelId(response.modelId);
        setSubmittedInput(values as unknown as Record<string, unknown>);
        setResult(response.data as unknown as PizzaResult);
        setResultDay(values.dayOfWeek);
        setTraceData(response.traceData);
      } else {
        setError(response.error);
        setResult(null);
        setRunId(undefined);
        setTraceData(undefined);
        setSubmittedInput(undefined);
      }
      setLoading(false);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    },
    [],
  );

  function onSubmit(values: FormValues) {
    runCalculation(values);
  }

  function handleAutoRun() {
    runCalculation({ ...defaultScenario.values, dayOfWeek: today });
  }

  function handleScenarioSelect(scenario: Scenario) {
    setActiveScenario(scenario.id);
    form.reset({ ...scenario.values, dayOfWeek: today });
    setResult(null);
    setGlassAutoOpened(false);
    runCalculation({ ...scenario.values, dayOfWeek: today });
  }

  useEffect(() => {
    if (!result) {
      setGlassAutoOpened(false);
    }
  }, [result]);

  const hasResult = Boolean(result);

  return (
    <GlassMode
      projectSlug={project.slug}
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Pizza Pricing Calculator
          </h1>
          <p className="text-muted-foreground mt-1">
            An example app included with the Leapter Starter — business logic
            lives in a blueprint, not in code.
          </p>
        </div>
        <GlassMode.Toggle />
      </div>

      <DemoBanner phase={phase} onAutoRun={handleAutoRun} loading={loading} />

      <ScenarioSwitcher
        activeId={activeScenario}
        onSelect={handleScenarioSelect}
        disabled={loading}
      />

      <TodayBanner today={today} />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              onChange={(v) =>
                form.setValue("pizzaSize", v, { shouldValidate: true })
              }
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
                  Mix and match — every topping is $1.50.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ToppingSelector
              value={toppings}
              onChange={(v) =>
                form.setValue("toppings", v, { shouldValidate: true })
              }
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
                  Stuffed crust adds $3 — the others are included.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CrustSelector
              value={crustType}
              onChange={(v) =>
                form.setValue("crustType", v, { shouldValidate: true })
              }
            />
            {form.formState.errors.crustType && (
              <p className="mt-3 text-sm text-destructive">
                {form.formState.errors.crustType.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        {Object.keys(form.formState.errors).length > 0 &&
        form.formState.isSubmitted ? (
          <Alert variant="destructive">
            <AlertDescription>
              Please fill in the highlighted fields above.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground hidden sm:block">
            The calculation runs on a Leapter blueprint — not hard-coded in the
            app.
          </p>
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="px-8 rounded-full text-white"
            style={{
              backgroundColor: loading ? undefined : "var(--app-accent)",
            }}
          >
            {loading ? (
              "Calculating…"
            ) : (
              <>
                Calculate Price
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>

      <div ref={resultRef} aria-live="polite" className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && hasResult ? (
          <GlassMode.Result>
            <div
              key={runId}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out"
            >
              <PizzaResults data={result} pickedDay={resultDay} />

              <div className="mt-6 flex justify-center sm:hidden">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground animate-bounce">
                  <Workflow className="h-3.5 w-3.5" />
                  Tap above to see the logic trace
                </span>
              </div>
            </div>
          </GlassMode.Result>
        ) : (
          !error && (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">
                  Click{" "}
                  <strong className="text-foreground">
                    &quot;Run the demo instantly&quot;
                  </strong>{" "}
                  above, or fill in the form and click{" "}
                  <strong className="text-foreground">Calculate Price</strong>{" "}
                  to see results here.
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </GlassMode>
  );
}
