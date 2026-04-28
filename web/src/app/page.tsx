import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/leapter-logo-full.svg"
              alt="Leapter"
              width={902}
              height={259}
              className="h-auto w-[110px]"
              priority
            />
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/calculator"
              className={buttonVariants({
                variant: "default",
                size: "lg",
              })}
            >
              Open App
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container mx-auto px-6 pt-24 pb-16 text-center">
          <p className="text-sm font-medium tracking-wider uppercase text-[oklch(0.62_0.21_30)] mb-6">
            Leapter Starter
          </p>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-foreground mb-8 max-w-4xl mx-auto leading-[1.1]">
            Your business logic, transparent and auditable
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-12 leading-relaxed">
            Calculations, rules, and validations live in Leapter blueprints —
            not buried in code. Every decision is traceable, every result
            explainable.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/calculator"
              className={buttonVariants({
                size: "lg",
                className: "px-8 h-12 text-base rounded-full",
              })}
            >
              Try the Demo
            </Link>
            <Link
              href="#how-it-works"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "px-8 h-12 text-base rounded-full",
              })}
            >
              How It Works
            </Link>
          </div>
        </section>

        {/* Gradient divider */}
        <div className="mx-auto max-w-3xl h-px bg-gradient-to-r from-transparent via-[oklch(0.62_0.21_30)/30] to-transparent" />

        {/* How it works */}
        <section id="how-it-works" className="container mx-auto px-6 py-24">
          <p className="text-sm font-medium tracking-wider uppercase text-[oklch(0.62_0.21_30)] text-center mb-4">
            How It Works
          </p>
          <h2 className="text-3xl font-bold text-center mb-16 tracking-tight">
            Logic you can read, results you can trust
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-0 shadow-none bg-muted/50">
              <CardHeader className="p-8">
                <div className="w-10 h-10 rounded-full bg-[oklch(0.62_0.21_30)] text-white flex items-center justify-center text-sm font-semibold mb-4">
                  1
                </div>
                <CardTitle className="text-xl mb-2">
                  Define the Rules
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Business logic is authored as Leapter blueprints — structured,
                  versioned, and readable by both engineers and domain experts.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-0 shadow-none bg-muted/50">
              <CardHeader className="p-8">
                <div className="w-10 h-10 rounded-full bg-[oklch(0.65_0.17_290)] text-white flex items-center justify-center text-sm font-semibold mb-4">
                  2
                </div>
                <CardTitle className="text-xl mb-2">
                  Run Transparently
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  When a user submits data, the blueprint executes — no hidden
                  formulas, no black-box models. Every step is traceable.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-0 shadow-none bg-muted/50">
              <CardHeader className="p-8">
                <div className="w-10 h-10 rounded-full bg-[oklch(0.65_0.17_155)] text-white flex items-center justify-center text-sm font-semibold mb-4">
                  3
                </div>
                <CardTitle className="text-xl mb-2">
                  Explain the Result
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Results come with full breakdowns — see exactly which rules
                  fired, which inputs mattered, and why the output is what it
                  is.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Image
            src="/leapter-logo-icon.svg"
            alt="Leapter"
            width={28}
            height={28}
            className="opacity-50"
          />
          <p className="text-sm text-muted-foreground">
            Powered by{" "}
            <a
              href="https://leapter.com"
              className="font-medium text-foreground hover:text-[oklch(0.62_0.21_30)] transition-colors"
            >
              Leapter
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
