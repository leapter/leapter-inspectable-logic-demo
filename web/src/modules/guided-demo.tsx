"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Car,
  Truck,
  Bike,
  ShieldCheck,
  ShieldPlus,
  Shield,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle,
  Workflow,
  Play,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassMode } from "@/components/glass-mode";
import type { TraceData } from "@leapter/client";
import { projectConfig } from "@/lib/project";
import { schema, type FormValues } from "@/modules/insurance-premium-calculation/schema";

const project = projectConfig;

// ─── Preset Scenarios ─────────────────────────────────────────────────────────

const scenarios = [
  {
    id: "young-rider",
    label: "Young Motorcycle Rider",
    description: "Age 21, motorcycle, comprehensive — fires the most rules",
    highlight: "5 adjustment rules fire",
    values: {
      vehicleType: "motorcycle",
      year: 2023,
      mileage: 8000,
      driverAge: 21,
      yearsLicensed: 2,
      cleanRecord: true,
      coverageLevel: "comprehensive",
      deductible: 500,
    } satisfies FormValues,
  },
  {
    id: "experienced-driver",
    label: "Experienced Safe Driver",
    description: "Age 45, car, standard — see how discounts stack",
    highlight: "Multiple discounts stack",
    values: {
      vehicleType: "car",
      year: 2022,
      mileage: 10000,
      driverAge: 45,
      yearsLicensed: 20,
      cleanRecord: true,
      coverageLevel: "standard",
      deductible: 1000,
    } satisfies FormValues,
  },
  {
    id: "high-risk",
    label: "High-Risk Profile",
    description: "Old truck, young driver, no clean record — highest premium",
    highlight: "See surcharges compound",
    values: {
      vehicleType: "truck",
      year: 2010,
      mileage: 30000,
      driverAge: 19,
      yearsLicensed: 1,
      cleanRecord: false,
      coverageLevel: "comprehensive",
      deductible: 250,
    } satisfies FormValues,
  },
] as const;

// ─── Vehicle Type Cards ───────────────────────────────────────────────────────

const vehicleTypes = [
  {
    value: "car",
    label: "Car",
    icon: Car,
    description: "Sedan, hatchback, coupe",
  },
  { value: "suv", label: "SUV", icon: Truck, description: "SUV, crossover" },
  { value: "truck", label: "Truck", icon: Truck, description: "Pickup, cargo" },
  {
    value: "motorcycle",
    label: "Motorcycle",
    icon: Bike,
    description: "Sport, cruiser, touring",
  },
] as const;

function VehicleTypeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {vehicleTypes.map((type) => {
        const Icon = type.icon;
        const selected = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
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
                : { borderColor: undefined }
            }
          >
            <Icon
              className={cn(
                "h-8 w-8 transition-colors",
                !selected && "text-muted-foreground",
              )}
              style={selected ? { color: "var(--app-accent)" } : undefined}
            />
            <span
              className="text-sm font-medium"
              style={selected ? { color: "var(--app-accent)" } : undefined}
            >
              {type.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {type.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Coverage Cards ───────────────────────────────────────────────────────────

const coverageLevels = [
  {
    value: "liability",
    label: "Liability",
    icon: Shield,
    price: "from $72/mo",
    features: ["Third-party damage", "Legal minimum"],
    missing: [
      "Own vehicle damage",
      "Theft & vandalism",
      "Roadside assistance",
    ],
  },
  {
    value: "standard",
    label: "Standard",
    icon: ShieldCheck,
    price: "from $120/mo",
    recommended: true,
    features: [
      "Third-party damage",
      "Collision coverage",
      "Roadside assistance",
    ],
    missing: ["Theft & vandalism", "Weather damage"],
  },
  {
    value: "comprehensive",
    label: "Comprehensive",
    icon: ShieldPlus,
    price: "from $174/mo",
    features: [
      "Third-party damage",
      "Collision coverage",
      "Theft & vandalism",
      "Weather & natural disasters",
      "Roadside assistance",
    ],
    missing: [],
  },
] as const;

function CoverageLevelSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {coverageLevels.map((level) => {
        const Icon = level.icon;
        const selected = value === level.value;
        return (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            className={cn(
              "relative flex flex-col rounded-xl border-2 p-5 text-left transition-all",
              selected
                ? "shadow-sm"
                : "border-border bg-background hover:shadow-sm",
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
            {"recommended" in level && level.recommended && (
              <Badge
                className="absolute -top-2.5 right-3 text-white"
                style={{ backgroundColor: "var(--app-accent)" }}
              >
                Recommended
              </Badge>
            )}
            <div className="flex items-center gap-3 mb-3">
              <Icon
                className={cn("h-6 w-6", !selected && "text-muted-foreground")}
                style={selected ? { color: "var(--app-accent)" } : undefined}
              />
              <div>
                <p className="font-semibold">{level.label}</p>
                <p className="text-xs text-muted-foreground">{level.price}</p>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              {level.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-foreground">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  {f}
                </div>
              ))}
              {level.missing.map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-2 text-muted-foreground/60"
                >
                  <span className="h-3.5 w-3.5 shrink-0 text-center">—</span>
                  {f}
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Deductible Slider ────────────────────────────────────────────────────────

function DeductibleSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <Label>Deductible</Label>
        <span className="text-2xl font-semibold tracking-tight">
          {formatCurrency(value, 0)}
        </span>
      </div>
      <Slider
        min={250}
        max={5000}
        step={250}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>$250</span>
        <span className="text-center">Higher deductible = lower premium</span>
        <span>$5,000</span>
      </div>
    </div>
  );
}

// ─── Result Display ───────────────────────────────────────────────────────────

interface PremiumResult {
  monthlyPremium: number;
  annualPremium: number;
  baseRate: number;
  riskFactor: number;
}

function formatCurrency(
  value: number,
  maximumFractionDigits = 2,
  locale = "en-US",
  currency = "USD",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

function getRiskLabel(factor: number) {
  if (factor <= 0.85) return { text: "Low Risk", variant: "secondary" as const };
  if (factor <= 1.05)
    return { text: "Average Risk", variant: "outline" as const };
  return { text: "High Risk", variant: "destructive" as const };
}

function PremiumHeroCard({ data }: { data: PremiumResult }) {
  return (
    <Card
      className="bg-background"
      style={{
        borderColor:
          "color-mix(in oklch, var(--app-accent) 25%, transparent)",
        backgroundColor:
          "color-mix(in oklch, var(--app-accent) 4%, var(--background))",
      }}
    >
      <CardContent className="pt-6 pb-6">
        <div className="flex flex-col items-center text-center gap-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Your Estimated Monthly Premium
          </p>
          <p
            className="text-5xl font-bold tracking-tight"
            style={{ color: "var(--app-accent)" }}
          >
            {formatCurrency(data.monthlyPremium)}
          </p>
          <p className="text-muted-foreground mt-1">per month</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PremiumStats({ data }: { data: PremiumResult }) {
  const risk = getRiskLabel(data.riskFactor);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Annual Premium
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {formatCurrency(data.annualPremium)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">billed yearly</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Base Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {formatCurrency(data.baseRate)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            before adjustments
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Risk Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold">
              {data.riskFactor.toFixed(2)}
            </p>
            <Badge variant={risk.variant}>{risk.text}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.riskFactor < 1
              ? `${((1 - data.riskFactor) * 100).toFixed(0)}% below average`
              : data.riskFactor > 1
                ? `${((data.riskFactor - 1) * 100).toFixed(0)}% above average`
                : "average profile"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function PremiumExplanation({ data }: { data: PremiumResult }) {
  return (
    <Card className="bg-muted/50 border-dashed">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Your monthly premium of{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(data.monthlyPremium)}
            </span>{" "}
            is based on a{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(data.baseRate)}
            </span>{" "}
            base rate adjusted by a risk factor of{" "}
            <span className="font-medium text-foreground">
              {data.riskFactor.toFixed(2)}
            </span>
            , your chosen coverage level, and deductible.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Demo Banner ──────────────────────────────────────────────────────────────

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
            background:
              "linear-gradient(135deg, #FA4B00 0%, #968DF6 100%)",
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
                This insurance calculator was built by AI. The form below
                collects inputs, and a Leapter blueprint computes the premium.
                Hit{" "}
                <strong className="text-foreground">Calculate Premium</strong>{" "}
                and then click the result to see every rule that fired — step by
                step.
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
                <strong className="text-foreground">Calculate Premium</strong>{" "}
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
                input. Hover over nodes to see variable values at each step. Try
                a different scenario below — the trace changes because the logic
                path changes.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Scenario Switcher ────────────────────────────────────────────────────────

function ScenarioSwitcher({
  activeId,
  onSelect,
  disabled,
}: {
  activeId: string | null;
  onSelect: (scenario: (typeof scenarios)[number]) => void;
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

// ─── Main Demo Page ───────────────────────────────────────────────────────────

export function GuidedDemo() {
  const [result, setResult] = useState<PremiumResult | null>(null);
  const [runId, setRunId] = useState<string | undefined>();
  const [modelId, setModelId] = useState<string | undefined>();
  const [traceData, setTraceData] = useState<TraceData | undefined>();
  const [submittedInput, setSubmittedInput] = useState<
    Record<string, unknown> | undefined
  >();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(
    "young-rider",
  );
  const [glassAutoOpened, setGlassAutoOpened] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const defaultScenario = scenarios[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaultScenario.values,
  });

  const vehicleType = useWatch({ control: form.control, name: "vehicleType" });
  const coverageLevel = useWatch({
    control: form.control,
    name: "coverageLevel",
  });
  const deductible = useWatch({ control: form.control, name: "deductible" });
  const cleanRecord = useWatch({ control: form.control, name: "cleanRecord" });

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
        setResult(response.data as unknown as PremiumResult);
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
    runCalculation(defaultScenario.values);
  }

  function handleScenarioSelect(scenario: (typeof scenarios)[number]) {
    setActiveScenario(scenario.id);
    form.reset(scenario.values);
    setResult(null);
    setGlassAutoOpened(false);
    runCalculation(scenario.values);
  }

  // Track when Glass Mode opens (via context) to update the banner
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
        modelId,
        traceData,
        inputData: submittedInput,
        outputData: result as unknown as Record<string, unknown> | undefined,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Insurance Premium Calculator
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

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Step 1: Vehicle ── */}
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
                <CardTitle>Vehicle Information</CardTitle>
                <CardDescription>
                  Select your vehicle type and provide details.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Vehicle Type</Label>
              <VehicleTypeSelector
                value={vehicleType}
                onChange={(v) =>
                  form.setValue("vehicleType", v, { shouldValidate: true })
                }
              />
              {form.formState.errors.vehicleType && (
                <p className="text-sm text-destructive">
                  Please select a vehicle type
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Model Year</Label>
                <Input
                  id="year"
                  type="number"
                  min={1990}
                  max={2026}
                  {...form.register("year", { valueAsNumber: true })}
                />
                {form.formState.errors.year && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.year.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mileage">Annual Mileage</Label>
                <Input
                  id="mileage"
                  type="number"
                  min={0}
                  placeholder="12,000"
                  {...form.register("mileage", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Estimated miles per year
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Step 2: Driver ── */}
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
                <CardTitle>Driver Profile</CardTitle>
                <CardDescription>
                  Information about the primary driver.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driverAge">Your Age</Label>
                <Input
                  id="driverAge"
                  type="number"
                  min={18}
                  max={100}
                  {...form.register("driverAge", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsLicensed">Years Licensed</Label>
                <Input
                  id="yearsLicensed"
                  type="number"
                  min={0}
                  {...form.register("yearsLicensed", { valueAsNumber: true })}
                />
              </div>
            </div>

            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-xl border-2 p-4 transition-all cursor-pointer text-left",
                cleanRecord
                  ? "border-green-500/30 bg-green-50/50"
                  : "border-border",
              )}
              onClick={() => form.setValue("cleanRecord", !cleanRecord)}
            >
              <div className="space-y-0.5">
                <p className="font-medium">Clean Driving Record</p>
                <p className="text-sm text-muted-foreground">
                  No accidents or violations in the past 3 years
                </p>
              </div>
              <Switch
                checked={cleanRecord}
                tabIndex={-1}
                onCheckedChange={(v) => form.setValue("cleanRecord", v)}
              />
            </button>
            {cleanRecord && (
              <p className="text-sm text-green-700 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                You qualify for a 15% clean record discount
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Step 3: Coverage ── */}
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
                <CardTitle>Coverage Options</CardTitle>
                <CardDescription>
                  Choose your coverage level and deductible amount.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <Label>Coverage Level</Label>
              <CoverageLevelSelector
                value={coverageLevel}
                onChange={(v) =>
                  form.setValue("coverageLevel", v, { shouldValidate: true })
                }
              />
              {form.formState.errors.coverageLevel && (
                <p className="text-sm text-destructive">
                  Please select a coverage level
                </p>
              )}
            </div>

            <Separator />

            <DeductibleSlider
              value={deductible}
              onChange={(v) =>
                form.setValue("deductible", v, { shouldValidate: true })
              }
            />
          </CardContent>
        </Card>

        {/* ── Submit ── */}
        {Object.keys(form.formState.errors).length > 0 &&
        form.formState.isSubmitted ? (
          <Alert variant="destructive">
            <AlertDescription>
              Please fill in all required fields above. Missing selections are
              highlighted in red.
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
                Calculate Premium
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
              <PremiumHeroCard data={result} />
              <div className="mt-6">
                <PremiumStats data={result} />
              </div>
              <div className="mt-6">
                <PremiumExplanation data={result} />
              </div>

              {/* Prominent CTA to open Glass Mode — visible on narrow screens
                  where the "See how this was calculated" hint may not be
                  obvious enough */}
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
                  <strong className="text-foreground">Calculate Premium</strong>{" "}
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
