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

export type OpportunityLevel = "high" | "medium" | "watch";

export interface ContrarianRadarSignal {
  theme: string;
  contrarianScore: number;
  opportunityLevel: OpportunityLevel;
  sentimentBias: "crowd-negative" | "crowd-neutral" | "crowd-positive";
  velocityScore: number;
  expertEngagementScore: number;
  rationale: string;
}

export type CredibilityConfidence = "high" | "medium" | "low";

export interface SourceCredibilityInsight {
  source: string;
  platform: Platform;
  credibilityScore: number;
  confidence: CredibilityConfidence;
  weightedSignals: number;
  itemCount: number;
  historicalAccuracy: number;
  conflictRisk: number;
  botLikelihood: number;
  citationDepth: number;
  rationale: string;
}

export type AudienceReaction = "positive" | "mixed" | "negative";

export interface AudienceReactionForecast {
  segment: string;
  reaction: AudienceReaction;
  confidence: number;
  reason: string;
}

export interface ActionSimulation {
  angle: string;
  channel: "youtube" | "twitter" | "tiktok" | "linkedin" | "landing-page";
  audienceReactions: AudienceReactionForecast[];
  upsideScore: number;
  backlashRisk: number;
  recommendation: string;
}

export interface EvidenceCitation {
  title: string;
  url: string;
  platform: Platform;
  source: string;
}

export interface EvidenceInsightCard {
  claim: string;
  confidence: number;
  uncertainty: string;
  citations: EvidenceCitation[];
}

export interface ContentAngleForecast {
  title: string;
  channel: "youtube" | "twitter" | "tiktok" | "linkedin" | "newsletter";
  targetAudience: string;
  resonanceScore: number;
  hook: string;
  rationale: string;
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
  | "actionSimulator"
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
  contrarianRadar: ContrarianRadarSignal[];
  sourceCredibility: SourceCredibilityInsight[];
  actionSimulator: ActionSimulation[];
  evidenceCards: EvidenceInsightCard[];
  contentAngleEngine: ContentAngleForecast[];
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
