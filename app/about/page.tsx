export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:px-8 lg:px-12">
      <section className="glass-panel rounded-3xl p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          About
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Understand what the internet actually thinks
        </h1>
        <p className="mt-5 text-base leading-8 text-slate-700">
          Discourse Intelligence Engine is built for operators, founders, creators, and investors who
          need signal, not noise. We analyze conversations across communities to reveal what is
          accelerating, what people are confused about, where demand is forming, and what actions are
          worth taking.
        </p>
        <p className="mt-4 text-base leading-8 text-slate-700">
          This product is intentionally not a generic AI assistant. It is a strategic layer on top of
          internet discourse that helps you make better decisions faster.
        </p>
      </section>
    </div>
  );
}
