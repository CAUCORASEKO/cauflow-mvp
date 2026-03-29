import {
  ArrowRight,
  Box,
  Building2,
  CheckCircle2,
  FileImage,
  Shield,
  Sparkles,
  Wallet
} from "lucide-react";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/layout/site-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  {
    title: "Rights clarity by default",
    copy: "Each asset is paired with structured licensing so teams know exactly what can be used, sold, and redistributed."
  },
  {
    title: "Fast creator onboarding",
    copy: "Upload assets, attach premium licensing packages, and move from raw IP to monetizable inventory in minutes."
  },
  {
    title: "Trust signal for enterprise buyers",
    copy: "A clean audit trail helps companies purchase AI assets with more confidence and less legal friction."
  }
];

const orbitSteps = [
  { label: "Upload asset", icon: FileImage },
  { label: "Define license", icon: Shield },
  { label: "Purchase legally", icon: Wallet }
];

const valueProps = [
  {
    icon: Sparkles,
    title: "Built for premium AI outputs",
    copy: "Images, prompts, datasets, and branded generative assets deserve clearer packaging than a shared folder and a PDF."
  },
  {
    icon: Box,
    title: "Operational for creators",
    copy: "CauFlow gives independent creators a serious licensing surface with startup-grade product polish."
  },
  {
    icon: Building2,
    title: "Credible for companies",
    copy: "Buyers see inventory, licensing intent, and transaction history in one premium environment."
  }
];

export function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-mesh opacity-90" />
      <SiteHeader />

      <main>
        <section className="shell relative py-20 md:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-8">
              <Badge>Premium AI licensing infrastructure</Badge>
              <div className="space-y-6">
                <h1 className="font-display text-5xl font-semibold tracking-tight text-white md:text-7xl">
                  Where premium AI assets become licensable products.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
                  CauFlow helps creators package AI-native IP into structured
                  licenses and gives companies a cleaner way to purchase usage rights
                  with confidence.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/app">
                  <Button className="w-full gap-2 sm:w-auto">
                    Launch dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    Explore product flow
                  </Button>
                </a>
              </div>

              <div className="grid gap-4 pt-6 sm:grid-cols-3">
                {[
                  ["Creator-first", "Package your outputs like software-grade inventory"],
                  ["Legal signal", "Structured licenses clarify downstream usage"],
                  ["Investor-demo ready", "A polished product surface for real conversations"]
                ].map(([title, copy]) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <Card className="relative overflow-hidden p-8 shadow-float">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-400/10 via-transparent to-white/5" />
              <div className="relative space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-sky-200">
                      Licensing command center
                    </p>
                    <p className="mt-2 font-display text-3xl text-white">
                      Operate creative rights with startup precision
                    </p>
                  </div>
                  <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />
                </div>

                <div className="grid gap-4">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">Asset catalog</p>
                        <p className="font-display text-2xl text-white">Visual IP inventory</p>
                      </div>
                      <div className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-200">
                        Live previews
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {[1, 2].map((item) => (
                        <div
                          key={item}
                          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                        >
                          <div className="h-32 bg-gradient-to-br from-slate-700 via-slate-900 to-slate-950" />
                          <div className="p-4">
                            <p className="font-semibold text-white">Generative Campaign Set {item}</p>
                            <p className="mt-2 text-sm text-slate-400">
                              High-trust packaging for premium creative outputs.
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-sm text-slate-400">Licenses deployed</p>
                      <p className="mt-2 font-display text-4xl text-white">24</p>
                      <p className="mt-4 text-sm leading-6 text-slate-400">
                        Standardized packages ready for digital, campaign, and
                        enterprise use.
                      </p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-sm text-slate-400">Checkout confidence</p>
                      <p className="mt-2 font-display text-4xl text-white">96%</p>
                      <p className="mt-4 text-sm leading-6 text-slate-400">
                        Clear purchase flow designed for legal, procurement, and brand teams.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section id="how-it-works" className="shell py-20">
          <SectionHeading
            eyebrow="How it works"
            title="Three steps from creative output to legal purchase"
            copy="CauFlow keeps the product model intentionally simple for the MVP while presenting the workflow in a way that feels enterprise-ready."
          />

          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr,1.1fr]">
            <Card className="relative flex min-h-[420px] items-center justify-center overflow-hidden p-8">
              <div className="absolute h-80 w-80 rounded-full border border-sky-300/15" />
              <div className="absolute h-56 w-56 rounded-full border border-white/10" />
              <div className="absolute h-28 w-28 rounded-full border border-white/10" />
              <div className="absolute h-5 w-5 rounded-full bg-white" />
              {orbitSteps.map(({ label, icon: Icon }, index) => {
                const positions = [
                  "left-[14%] top-[18%]",
                  "right-[12%] top-[46%]",
                  "left-[22%] bottom-[14%]"
                ];

                return (
                  <div
                    key={label}
                    className={`absolute ${positions[index]} animate-float rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-3 shadow-glow`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-300/10 text-sky-200">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                          Step {index + 1}
                        </p>
                        <p className="font-semibold text-white">{label}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Card>

            <div className="grid gap-4">
              {orbitSteps.map(({ label }, index) => (
                <Card key={label} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold text-slate-950">
                      0{index + 1}
                    </div>
                    <div>
                      <h3 className="font-display text-2xl text-white">{label}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-400">
                        {index === 0
                          ? "Upload a premium creative asset and attach a visual preview that makes the IP feel tangible."
                          : index === 1
                            ? "Define pricing, usage, and packaging so the asset becomes a structured commercial offer."
                            : "Record a purchase against a live license and maintain a clean history of who bought what."}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="shell py-20">
          <SectionHeading
            eyebrow="Positioning"
            title="Designed for creators selling upmarket and companies buying responsibly"
            copy="The UI language leans premium because the category needs more trust, not more noise. CauFlow is for serious AI asset commerce."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {valueProps.map(({ icon: Icon, title, copy }) => (
              <Card key={title} className="p-8">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-3xl bg-white/5 text-sky-200">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-3xl text-white">{title}</h3>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-400">{copy}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="trust" className="shell py-20">
          <SectionHeading
            eyebrow="Why CauFlow"
            title="A premium surface for a category that usually looks unfinished"
            copy="Most AI licensing flows feel improvised. CauFlow reframes the experience as a product, not a spreadsheet."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="p-7">
                <CheckCircle2 className="h-6 w-6 text-sky-200" />
                <h3 className="mt-6 font-display text-2xl text-white">
                  {feature.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-400">{feature.copy}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="shell pb-20 pt-8">
          <Card className="overflow-hidden p-10">
            <div className="grid gap-10 lg:grid-cols-[1fr,0.9fr] lg:items-center">
              <div>
                <Badge>Ready for the first real demo</Badge>
                <h2 className="mt-6 font-display text-4xl font-semibold text-white md:text-5xl">
                  Move from concept to a serious licensing product surface.
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                  The dashboard is connected to your live API, supports asset uploads,
                  license creation, purchase recording, and presents the whole workflow
                  in a way that feels fundable.
                </p>
                <div className="mt-8">
                  <Link to="/app">
                    <Button className="gap-2">
                      Enter the workspace
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid gap-4">
                {[
                  "Real API integration for assets, licenses, and purchases",
                  "Dark premium layout tuned for investor and customer demos",
                  "Reusable React + TypeScript + Tailwind structure for iteration"
                ].map((line) => (
                  <div
                    key={line}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300"
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>
      </main>

      <footer className="border-t border-white/5 py-10">
        <div className="shell flex flex-col gap-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>CauFlow. Premium infrastructure for AI asset licensing.</p>
          <div className="flex gap-6">
            <a href="#how-it-works">How it works</a>
            <Link to="/app">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
