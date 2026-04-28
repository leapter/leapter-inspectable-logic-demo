"use client";

import { useRef, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BlueprintStatus } from "@/components/blueprint-status";
import { GlassMode } from "@/components/glass-mode";
import type { TraceData } from "@leapter/client";
import { projectConfig } from "@/lib/project";
import { schema, type FormValues } from "./schema";

const project = projectConfig;

// ─── Vehicle Type Selection Cards ──────────────────────────────────────────────

const vehicleTypes = [
  { value: "car", label: "Car", icon: Car, description: "Sedan, hatchback, coupe" },
  { value: "suv", label: "SUV", icon: Truck, description: "SUV, crossover" },
  { value: "truck", label: "Truck", icon: Truck, description: "Pickup, cargo" },
  { value: "motorcycle", label: "Motorcycle", icon: Bike, description: "Sport, cruiser, touring" },
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
                : "border-border bg-background hover:bg-muted/50"
            )}
            style={selected ? {
              borderColor: "var(--app-accent)",
              backgroundColor: "color-mix(in oklch, var(--app-accent) 8%, transparent)",
            } : {
              borderColor: undefined,
            }}
          >
            <Icon
              className={cn("h-8 w-8 transition-colors", !selected && "text-muted-foreground")}
              style={selected ? { color: "var(--app-accent)" } : undefined}
            />
            <span
              className="text-sm font-medium"
              style={selected ? { color: "var(--app-accent)" } : undefined}
            >
              {type.label}
            </span>
            <span className="text-xs text-muted-foreground">{type.description}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Coverage Level Comparison Cards ───────────────────────────────────────────

const coverageLevels = [
  {
    value: "liability",
    label: "Liability",
    icon: Shield,
    price: "from $72/mo",
    features: ["Third-party damage", "Legal minimum"],
    missing: ["Own vehicle damage", "Theft & vandalism", "Roadside assistance"],
  },
  {
    value: "standard",
    label: "Standard",
    icon: ShieldCheck,
    price: "from $120/mo",
    recommended: true,
    features: ["Third-party damage", "Collision coverage", "Roadside assistance"],
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
                : "border-border bg-background hover:shadow-sm"
            )}
            style={selected ? {
              borderColor: "var(--app-accent)",
              backgroundColor: "color-mix(in oklch, var(--app-accent) 8%, transparent)",
            } : undefined}
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
                <div key={f} className="flex items-center gap-2 text-muted-foreground/60">
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

// ─── Deductible Slider ─────────────────────────────────────────────────────────

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

// ─── Result Display ────────────────────────────────────────────────────────────

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
  if (factor <= 1.05) return { text: "Average Risk", variant: "outline" as const };
  return { text: "High Risk", variant: "destructive" as const };
}

function PremiumHeroCard({ data }: { data: PremiumResult }) {
  return (
    <Card
      className="bg-background"
      style={{
        borderColor: "color-mix(in oklch, var(--app-accent) 25%, transparent)",
        backgroundColor: "color-mix(in oklch, var(--app-accent) 4%, var(--background))",
      }}
    >
      <CardContent className="pt-6 pb-6">
        <div className="flex flex-col items-center text-center gap-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Your Estimated Monthly Premium
          </p>
          <p className="text-5xl font-bold tracking-tight" style={{ color: "var(--app-accent)" }}>
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
          <p className="text-2xl font-semibold">{formatCurrency(data.annualPremium)}</p>
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
          <p className="text-2xl font-semibold">{formatCurrency(data.baseRate)}</p>
          <p className="text-xs text-muted-foreground mt-1">before adjustments</p>
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
            <p className="text-2xl font-semibold">{data.riskFactor.toFixed(2)}</p>
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

function PremiumResults({ data }: { data: PremiumResult }) {
  return (
    <div className="space-y-6">
      <PremiumHeroCard data={data} />
      <PremiumStats data={data} />
      <PremiumExplanation data={data} />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function InsurancePremiumCalculationPage() {
  const [result, setResult] = useState<PremiumResult | null>(null);
  const [runId, setRunId] = useState<string | undefined>();
  const [modelId, setModelId] = useState<string | undefined>();
  const [traceData, setTraceData] = useState<TraceData | undefined>();
  const [submittedInput, setSubmittedInput] = useState<Record<string, unknown> | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      vehicleType: "",
      year: 2024,
      mileage: 12000,
      driverAge: 35,
      yearsLicensed: 10,
      cleanRecord: true,
      coverageLevel: "",
      deductible: 1000,
    },
  });

  const vehicleType = useWatch({ control: form.control, name: "vehicleType" });
  const coverageLevel = useWatch({ control: form.control, name: "coverageLevel" });
  const deductible = useWatch({ control: form.control, name: "deductible" });
  const cleanRecord = useWatch({ control: form.control, name: "cleanRecord" });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError(null);
    const override = getClientConfig(project.slug, project.projectId);
    const response = await executeBlueprint(project.blueprintSlug, values, override);
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
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  // Glass Mode's trace/replay machinery has its own guards around runId,
  // modelId, and traceData — the result card only needs the output data.
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
            Enter vehicle and driver details to get an instant premium estimate.
          </p>
        </div>
        <GlassMode.Toggle />
      </div>

      <BlueprintStatus
        projectSlug={project.slug}
        blueprintSlug={project.blueprintSlug}
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Step 1: Vehicle ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-semibold" style={{ backgroundColor: "var(--app-accent)" }}>
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
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-semibold" style={{ backgroundColor: "var(--app-accent)" }}>
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
                  : "border-border"
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
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-semibold" style={{ backgroundColor: "var(--app-accent)" }}>
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
        {Object.keys(form.formState.errors).length > 0 && form.formState.isSubmitted ? (
          <Alert variant="destructive">
            <AlertDescription>
              Please fill in all required fields above. Missing selections are highlighted in red.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="px-8 rounded-full text-white"
            style={{ backgroundColor: loading ? undefined : "var(--app-accent)" }}
          >
            {loading ? "Calculating..." : "Calculate Premium"}
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
              <PremiumResults data={result} />
            </div>
          </GlassMode.Result>
        ) : !error && (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">
                Fill in the form above and click <span className="font-medium text-foreground">Calculate Premium</span> to see your estimate here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </GlassMode>
  );
}
