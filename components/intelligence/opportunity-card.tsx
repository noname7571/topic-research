import { OpportunityInsight } from "@/lib/types";

import { InsightCard } from "./insight-card";

interface OpportunityCardProps {
  opportunity: OpportunityInsight;
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  return (
    <InsightCard
      title={opportunity.title}
      subtitle={opportunity.executionIdea}
      accent="highlight"
      action={
        <span className="inline-flex rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700">
          {opportunity.confidence}% confidence
        </span>
      }
    >
      <p>{opportunity.rationale}</p>
      <p className="mt-2 text-xs text-slate-600">Why now: {opportunity.whyNow}</p>
      <p className="mt-2 text-xs text-slate-600">Audience: {opportunity.audience}</p>
    </InsightCard>
  );
}
