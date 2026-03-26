import { ReactNode } from "react";

interface InsightCardProps {
  title: string;
  subtitle?: string;
  accent?: "default" | "highlight" | "muted";
  action?: ReactNode;
  children: ReactNode;
}

const accentClass = {
  default: "border-slate-200 bg-white",
  highlight: "border-blue-200 bg-blue-50/60",
  muted: "border-slate-200 bg-slate-50/80",
};

export function InsightCard({
  title,
  subtitle,
  accent = "default",
  action,
  children,
}: InsightCardProps) {
  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${accentClass[accent]}`}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </header>
      <div className="text-sm leading-6 text-slate-700">{children}</div>
    </article>
  );
}
