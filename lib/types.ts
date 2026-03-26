export type Platform = "reddit" | "youtube" | "news" | "web" | "mock";

export type SentimentLabel = "positive" | "neutral" | "negative";

export type TrendDirection = "rising" | "falling" | "stable";

export type SignalStrength = "strong" | "weak";

export type PlanTier = "free" | "pro" | "premium";
export type NarrativeLabel = "hype" | "fear" | "opportunity" | "confusion";

export interface DiscussionItem {
  id: string;
  platform: Platform;
  title: string;
  snippet: string;
  author?: string;
  url: string;
  publishedAt: string;
  engagement: number;
  commentCount?: number;
  source: string;
  queryUsed: string;
  sentiment?: SentimentLabel;
}

export interface ExecutiveSummary {
  headline: string;
  summary: string;
  bullets: string[];
  confidence: number;
}

export interface ThemeInsight {
  name: string;
  summary: string;
  sentiment: SentimentLabel;
  volume: number;
  signalExamples: string[];
  narrative?: NarrativeLabel;
  whatPeopleAreSaying?: string;
  signalStrength?: SignalStrength;
  whyItMatters?: string;
  implication?: string;
  actionLayer?: string;
}

export interface PlatformInsight {
  platform: Platform;
  itemCount: number;
  avgEngagement: number;
  sentiment: SentimentLabel;
}

export interface TrendInsight {
  name: string;
  direction: TrendDirection;
  signalStrength: number;
  reason: string;
}

export interface OpportunityInsight {
  title: string;
  rationale: string;
  confidence: number;
  whyNow?: string;
  executionIdea?: string;
  audience?: string;
}

export interface ContrarianInsight {
  title: string;
  rationale: string;
  supportingSignal: string;
  crowdBelief?: string;
  whyCrowdMayBeWrong?: string;
}

export interface ContentIdea {
  title: string;
  format: "youtube" | "twitter" | "tiktok";
  hook: string;
  angle: string;
}

export interface SentimentOverview {
  positive: number;
  neutral: number;
  negative: number;
  dominant: SentimentLabel;
}

export interface SourcePreview {
  title: string;
  url: string;
  platform: Platform;
}

export interface SourceAccess {
  tier: PlanTier;
  defaultVisibleCount: number;
  totalCount: number;
  hiddenCount: number;
  canViewAll: boolean;
}

export type LockedSection =
  | "deepThemeAnalysis"
  | "trendAnalysis"
  | "opportunities"
  | "contrarianInsights"
  | "contentIdeas"
  | "evidenceDepth";

export interface AccessContext {
  plan: PlanTier;
  usedToday: number;
  dailyLimit: number | null;
  remainingToday: number | null;
  lockedSections: LockedSection[];
  upgradeMessage?: string;
}

export interface AnalysisResult {
  topic: string;
  generatedAt: string;
  fromCache: boolean;
  totalSignals: number;
  executiveSummary: ExecutiveSummary;
  keyThemes: ThemeInsight[];
  platformBreakdown: PlatformInsight[];
  trends: TrendInsight[];
  opportunities: OpportunityInsight[];
  contrarianInsights: ContrarianInsight[];
  contentIdeas: ContentIdea[];
  sentimentOverview: SentimentOverview;
  sampleSources: SourcePreview[];
  dataQualityNote?: string;
  sourceAccess?: SourceAccess;
  accessContext?: AccessContext;
}

export interface PipelineResult {
  expandedQueries: string[];
  items: DiscussionItem[];
  analysis: AnalysisResult;
}
