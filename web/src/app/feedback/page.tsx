import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { readProjectSnapshot, readSessionLog } from "./actions";
import { FeedbackForm } from "./feedback-form";

const devMode = process.env.NEXT_PUBLIC_LEAPTER_DEV_MODE !== "false";

export const metadata = {
  title: "Share feedback | Leapter Starter",
};

export default async function FeedbackPage() {
  if (!devMode) notFound();

  const [log, project] = await Promise.all([
    readSessionLog(),
    readProjectSnapshot(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-14 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/leapter-logo-full.svg"
              alt="Leapter"
              width={902}
              height={259}
              className="h-auto w-[100px]"
              priority
            />
            <span className="border-l border-border/60 pl-3 text-xs font-medium text-muted-foreground">
              Starter
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to the demo
          </Link>
        </div>
      </header>

      <main className="container mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">
          Thanks for taking the time.
        </h1>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>We&rsquo;d love to hear how it went.</p>
          <p>
            We&rsquo;re interested in everything: what you&rsquo;re building,
            what worked, what tripped you up, what&rsquo;s missing, even just
            a vibe-check on the idea.
          </p>
          <p>
            Nothing leaves your machine unless you opt in below. The previews
            show exactly, and only, what would be sent.
          </p>
        </div>

        <div className="mt-8">
          <FeedbackForm log={log} project={project} />
        </div>
      </main>
    </div>
  );
}
