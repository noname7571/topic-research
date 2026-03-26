import { ThemeInsight } from "@/lib/types";

import { InsightCard } from "./insight-card";

interface ThemeCardProps {
  theme: ThemeInsight;
}

const signalStrengthLabel = (theme: ThemeInsight): "Strong signal" | "Emerging signal" | "Weak signal" => {
  if (theme.signalStrength === "strong") {
    return "Strong signal";
  }

  if (theme.volume >= 3) {
    return "Emerging signal";
  }

  return "Weak signal";
};

const signalClass = {
  "Strong signal": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Emerging signal": "border-blue-200 bg-blue-50 text-blue-700",
  "Weak signal": "border-amber-200 bg-amber-50 text-amber-700",
};

const narrativeClass = {
  hype: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  fear: "border-rose-200 bg-rose-50 text-rose-700",
  opportunity: "border-emerald-200 bg-emerald-50 text-emerald-700",
  confusion: "border-slate-200 bg-slate-100 text-slate-700",
};

export function ThemeCard({ theme }: ThemeCardProps) {
  const label = signalStrengthLabel(theme);

  return (
    <InsightCard
      title={theme.name}
      subtitle={theme.summary}
      action={
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${signalClass[label]}`}
        >
          {label}
        </span>
      }
    >
      <p className="text-sm text-slate-700">{theme.whatPeopleAreSaying ?? theme.summary}</p>
      {theme.narrative ? (
        <p className="mt-3">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${narrativeClass[theme.narrative]}`}
          >
            Narrative: {theme.narrative}
          </span>
        </p>
      ) : null}
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Why it matters
      </p>
      <p>{theme.whyItMatters ?? "This cluster shows repeated behavior that impacts decisions."}</p>
      <p className="mt-2 text-xs text-slate-500">Implication: {theme.implication}</p>
      {theme.actionLayer ? (
        <p className="mt-2 text-xs font-semibold text-slate-600">Action: {theme.actionLayer}</p>
      ) : null}
    </InsightCard>
  );
}
