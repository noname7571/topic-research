import Link from "next/link";

const valueProps = [
  {
    title: "See what people really think",
    description:
      "Aggregate high-signal conversations from Reddit, YouTube, and news into one structured view.",
  },
  {
    title: "Discover trends early",
    description:
      "Spot rising and falling narratives before they become obvious in your market.",
  },
  {
    title: "Find ideas instantly",
    description:
      "Get opportunities and contrarian angles for products, content, and positioning in seconds.",
  },
];

export default function Home() {
  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-16 pt-8 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute left-[-90px] top-[120px] h-64 w-64 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="pointer-events-none absolute right-[-60px] top-[40px] h-52 w-52 rounded-full bg-sky-200/50 blur-3xl" />

      <main className="relative z-10">
        <section className="mx-auto max-w-4xl text-center">
          <p className="mb-4 inline-flex rounded-full border border-amber-300 bg-amber-100 px-4 py-1 text-xs font-semibold tracking-wide text-amber-900">
            Signal-first market intelligence
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Understand what the internet actually thinks
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Discourse Intelligence Engine transforms noisy conversations into trends, opportunities,
            and strategic actions. This is not a chatbot and not a generic summary tool.
          </p>

          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open dashboard
            </Link>
            <Link
              href="/pricing"
              className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View plans
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {valueProps.map((item) => (
            <article key={item.title} className="glass-panel rounded-3xl p-5">
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="glass-panel mt-10 rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900">Why this product is different</h2>
          <p className="mt-3 text-sm text-slate-600">
            We focus on signal extraction: what narratives are rising, where the crowd is wrong,
            and what action to take next.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Narrative detection</p>
              <p className="mt-2 text-sm text-slate-700">
                Every theme is labeled as hype, fear, opportunity, or confusion.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Action layer</p>
              <p className="mt-2 text-sm text-slate-700">
                Each signal includes what to do next for product, strategy, and content.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-14 rounded-3xl border border-slate-200 bg-slate-900 px-6 py-10 text-center text-white sm:px-12">
          <h2 className="text-2xl font-semibold">Ready to build from signal, not noise?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-300">
            Start with a free signal preview, then unlock full intelligence with Pro or Premium.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex rounded-2xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-200"
          >
            Create free account
          </Link>
        </section>
      </main>
    </div>
  );
}
