"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pie, PieChart, Cell, Label } from "recharts";
import { executeBlueprint } from "@/app/actions/blueprint";
import { getClientConfig } from "@/lib/runtime-config";
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
  DAYS_OF_WEEK,
  TOPPINGS,
  TOPPING_PRICE,
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

// Day metadata kept in one place so the selector and comparison stay in sync.
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
              className="rounded-full transition-all"
              style={{
                width: size.ringSize,
                height: size.ringSize,
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
        <FieldLabel>Toppings</FieldLabel>
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
  {
    value: "thin",
    label: "Thin",
    description: "Crispy and light",
    upcharge: 0,
    icon: Layers,
  },
  {
    value: "regular",
    label: "Regular",
    description: "Classic hand-tossed",
    upcharge: 0,
    icon: Pizza,
  },
  {
    value: "stuffed",
    label: "Stuffed",
    description: "Cheese-filled edge",
    upcharge: 3,
    icon: Sparkles,
  },
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
                className={cn(
                  "h-5 w-5",
                  !selected && "text-muted-foreground",
                )}
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
              vs. regular price
              {dayInfo.tag && (
                <>
                  {" "}
                  ({dayInfo.tag})
                </>
              )}
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">final price</p>
          )}
        </div>
      </CardContent>
    </Card>
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
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {info.short}
                  </span>
                  {info.tag && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                      style={{
                        color: info.multiplier < 1
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
  // Compute today once on mount so the form default is stable across renders.
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

  // Auto-recalculate whenever any input changes. Debounced so a flurry of
  // clicks (e.g. picking several toppings) coalesces into a single request,
  // and guarded with a sequence counter so a stale response can't overwrite
  // a newer one.
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
      const override = getClientConfig(project.slug, project.projectId);
      const response = await executeBlueprint(
        project.blueprintSlug,
        values,
        override,
      );
      if (seq !== requestSeq.current) return;
      if (response.success) {
        setError(null);
        setRunId(response.runId);
        setModelId(response.modelId);
        setSubmittedInput(values as unknown as Record<string, unknown>);
        setResult(response.data as unknown as PizzaResult);
        setResultDay(values.dayOfWeek);
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
                  Mix and match — every topping is $1.50.
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
                  Stuffed crust adds $3 — the others are included.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CrustSelector
              value={crustType}
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
              <PizzaResults data={result} pickedDay={resultDay} />
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
    </GlassMode>
  );
}
