"use client";

import { FormEvent, useMemo, useState } from "react";

interface TopicSearchFormProps {
  onAnalyze: (topic: string, premiumAccessToken?: string) => Promise<void>;
  isLoading: boolean;
}

const suggestedTopics = [
  "AI girlfriends",
  "dropshipping",
  "remote work",
  "creator economy",
  "indie hacking",
];

export function TopicSearchForm({ onAnalyze, isLoading }: TopicSearchFormProps) {
  const [topic, setTopic] = useState("");
  const [premiumAccessToken, setPremiumAccessToken] = useState("");

  const isDisabled = useMemo(() => {
    return isLoading || topic.trim().length < 2;
  }, [isLoading, topic]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isDisabled) {
      return;
    }
    await onAnalyze(topic.trim(), premiumAccessToken.trim() || undefined);
  };

  return (
    <div className="glass-panel w-full rounded-3xl p-5 sm:p-7">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label htmlFor="topic" className="text-sm font-semibold text-slate-700">
          Enter a topic to decode real online discourse
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Example: AI girlfriends"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
          />
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isLoading ? "Analyzing..." : "Analyze Discourse"}
          </button>
        </div>
      </form>

      <details className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-600">
          Premium access
        </summary>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          If you have a premium access code, enter it to unlock full source visibility.
        </p>
        <input
          type="password"
          value={premiumAccessToken}
          onChange={(event) => setPremiumAccessToken(event.target.value)}
          placeholder="Premium access code"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
        />
      </details>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestedTopics.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setTopic(suggestion)}
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 transition hover:border-amber-300 hover:bg-amber-100"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
