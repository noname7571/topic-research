const unique = <T,>(items: T[]): T[] => {
  return Array.from(new Set(items));
};

const normalizeTopic = (topic: string): string => {
  return topic
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

const detectIntent = (topic: string): "investment" | "howto" | "comparison" | "general" => {
  if (/stock|invest|portfolio|etf|market|sector/.test(topic)) {
    return "investment";
  }

  if (/how|strategy|guide|start|beginner|steps/.test(topic)) {
    return "howto";
  }

  if (/vs\b|versus|compare|alternative/.test(topic)) {
    return "comparison";
  }

  return "general";
};

const intentTemplates: Record<ReturnType<typeof detectIntent>, (topic: string, year: number) => string[]> = {
  investment: (topic, year) => [
    `${topic} ${year} long term outlook and market sentiment`,
    `${topic} top opportunities and risk factors ${year}`,
    `${topic} retail investor discussion trends`,
    `${topic} sector performance and thesis breakdown`,
    `${topic} contrarian investment angles`,
  ],
  howto: (topic, year) => [
    `${topic} practical strategy and execution steps`,
    `${topic} beginner mistakes and common pitfalls ${year}`,
    `${topic} real case studies and lessons learned`,
    `${topic} best workflow and tools for ${topic}`,
    `${topic} what experts recommend right now`,
  ],
  comparison: (topic, year) => [
    `${topic} key differences and tradeoffs explained`,
    `${topic} user sentiment comparison ${year}`,
    `${topic} strengths weaknesses and best use cases`,
    `${topic} pricing value and performance debate`,
    `${topic} which option users prefer and why`,
  ],
  general: (topic, year) => [
    `${topic} community sentiment and major debates ${year}`,
    `${topic} common complaints and unmet needs`,
    `${topic} success stories and real outcomes`,
    `${topic} business opportunities and market gaps`,
    `${topic} future outlook and emerging trends`,
  ],
};

export const expandQueries = (topic: string): string[] => {
  const normalized = normalizeTopic(topic);
  if (!normalized) {
    return [];
  }

  const year = new Date().getFullYear();
  const intent = detectIntent(normalized);
  const rewritten = intentTemplates[intent](normalized, year);

  const tokenized = normalized
    .split(/[\s,/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
    .slice(0, 2)
    .map((token) => `${token} discussion trend`);

  return unique([normalized, ...rewritten, ...tokenized]).slice(0, 5);
};
