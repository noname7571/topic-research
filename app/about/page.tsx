import Link from "next/link";

const operatingLayers = [
  {
    title: "Narrative detection",
    description:
      "Cluster live discourse into clear narratives, then label each one by crowd psychology: hype, fear, opportunity, or confusion.",
  },
  {
    title: "Contrarian signal radar",
    description:
      "Surface where crowd sentiment is lagging behind velocity and expert participation, so you can act before consensus catches up.",
  },
  {
    title: "Source credibility layer",
    description:
      "Weight evidence by trust, not volume. Each source is scored for credibility, conflict risk, bot-likelihood, and citation depth.",
  },
  {
    title: "Action simulator",
    description:
      "Test a publish angle before launch and forecast likely reactions across key audience segments with upside and backlash scoring.",
  },
  {
    title: "Evidence-first cards",
    description:
      "Every major claim includes confidence, uncertainty, and direct citations so decisions can be traced back to concrete signals.",
  },
  {
    title: "Content angle engine",
    description:
      "Generate channel-specific content angles with target audience and predicted resonance, not generic one-size-fits-all ideas.",
  },
];

const processSteps = [
  "Collect high-signal discussions across Reddit, YouTube, news, and web sources.",
  "Filter noise and low-relevance content before thematic synthesis.",
  "Score trend movement, source trust, and contrarian opportunity asymmetry.",
  "Return structured strategic outputs you can execute immediately.",
];

export default function AboutPage() {
  return (
    <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute left-[-90px] top-[140px] h-64 w-64 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="pointer-events-none absolute right-[-70px] top-[70px] h-56 w-56 rounded-full bg-sky-200/45 blur-3xl" />

      <section className="glass-panel relative rounded-3xl p-7 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">About</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          A decision system, not a generic AI wrapper
        </h1>
        <p className="mt-5 max-w-4xl text-base leading-8 text-slate-700">
          Discourse Intelligence Engine is built for operators, founders, creators, investors, and
          strategy teams who need signal they can execute on. It converts noisy conversation streams
          into structured intelligence: what is accelerating, what is overhyped, where trust breaks,
          and which actions are worth shipping now.
        </p>
        <p className="mt-4 max-w-4xl text-base leading-8 text-slate-700">
          The goal is simple: shorten the gap between internet discourse and confident decisions.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open dashboard
          </Link>
          <Link
            href="/pricing"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Compare plans
          </Link>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">What You Get</h2>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Intelligence layers
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {operatingLayers.map((layer) => (
            <article key={layer.title} className="glass-panel rounded-2xl p-5">
              <h3 className="text-base font-semibold text-slate-900">{layer.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{layer.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-panel mt-8 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">How It Works</h2>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Signal pipeline
          </p>
        </div>
        <ol className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
          {processSteps.map((step, index) => (
            <li key={step} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-900 px-6 py-10 text-white sm:px-10">
        <h2 className="text-2xl font-semibold">Who This Is For</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          Teams making strategic bets under uncertainty: deciding what to build, what to publish,
          how to position, and where to spend attention before competitors catch up.
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          If your workflow depends on interpreting market narratives quickly and correctly, this
          product exists for you.
        </p>
      </section>
    </div>
  );
}
