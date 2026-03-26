export function LoadingState() {
  return (
    <section className="mt-10 space-y-5 animate-pulse">
      <div className="glass-panel rounded-3xl p-6">
        <div className="h-3 w-32 rounded bg-slate-200" />
        <div className="mt-3 h-9 w-56 rounded bg-slate-200" />
        <div className="mt-4 h-4 w-full rounded bg-slate-100" />
        <div className="mt-2 h-4 w-10/12 rounded bg-slate-100" />
        <div className="mt-4 flex gap-2">
          <div className="h-7 w-28 rounded-full bg-slate-100" />
          <div className="h-7 w-28 rounded-full bg-slate-100" />
          <div className="h-7 w-28 rounded-full bg-slate-100" />
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6">
        <div className="h-6 w-48 rounded bg-slate-200" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="h-28 rounded-2xl bg-slate-100" />
          <div className="h-28 rounded-2xl bg-slate-100" />
          <div className="h-28 rounded-2xl bg-slate-100" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-44 rounded-2xl bg-white/80" />
        <div className="h-44 rounded-2xl bg-white/80" />
      </div>
    </section>
  );
}
