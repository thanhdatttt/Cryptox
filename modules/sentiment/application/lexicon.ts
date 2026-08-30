import type {
  SentimentAnalysisInput,
  SentimentLabel,
  SentimentProvider,
  SentimentProviderResult,
} from "./ports";

export const LEXICON_V1_ID = "LEXICON_V1" as const;

export const LEXICON_V1_ANALYSIS_PROFILE_ID = LEXICON_V1_ID;
export const LEXICON_V1_MODEL_NAME = LEXICON_V1_ID;
export const LEXICON_V1_MODEL_VERSION = "1";

/**
 * The local provider deliberately uses exact tokens rather than a stemming
 * library or a downloaded model. Keeping the vocabulary in source makes the
 * result reproducible and reviewable in the delivered runtime.
 */
const LEXICON: ReadonlyMap<string, number> = new Map([
  ["adoption", 1],
  ["approve", 1],
  ["approved", 1],
  ["approval", 1],
  ["breakout", 1],
  ["bull", 1],
  ["bullish", 1],
  ["gain", 1],
  ["gained", 1],
  ["gains", 1],
  ["growth", 1],
  ["improve", 1],
  ["improved", 1],
  ["milestone", 1],
  ["optimistic", 1],
  ["outperform", 1],
  ["partnership", 1],
  ["profit", 1],
  ["profits", 1],
  ["positive", 1],
  ["rallied", 1],
  ["rally", 1],
  ["record", 1],
  ["recover", 1],
  ["recovery", 1],
  ["soar", 1],
  ["soared", 1],
  ["strong", 1],
  ["success", 1],
  ["successful", 1],
  ["support", 1],
  ["upgrade", 1],
  ["win", 1],
  ["wins", 1],
  ["up", 1],
  ["ban", -1],
  ["banned", -1],
  ["bear", -1],
  ["bearish", -1],
  ["concern", -1],
  ["concerns", -1],
  ["crash", -1],
  ["crashed", -1],
  ["decline", -1],
  ["declined", -1],
  ["declines", -1],
  ["downgrade", -1],
  ["drop", -1],
  ["dropped", -1],
  ["drops", -1],
  ["exploit", -1],
  ["fail", -1],
  ["failed", -1],
  ["failure", -1],
  ["fear", -1],
  ["fears", -1],
  ["fraud", -1],
  ["hack", -1],
  ["hacked", -1],
  ["loss", -1],
  ["losses", -1],
  ["negative", -1],
  ["plunge", -1],
  ["plunged", -1],
  ["risk", -1],
  ["risks", -1],
  ["scam", -1],
  ["sell", -1],
  ["selloff", -1],
  ["uncertain", -1],
  ["underperform", -1],
  ["warning", -1],
  ["weak", -1],
  ["weakness", -1],
  ["down", -1],
]);

const NEGATIONS = new Set(["barely", "hardly", "no", "never", "not", "without"]);
const INTENSIFIERS = new Map([
  ["extremely", 1.75],
  ["highly", 1.5],
  ["major", 1.5],
  ["massive", 1.75],
  ["strongly", 1.5],
  ["very", 1.5],
]);
const DIMINISHERS = new Map([
  ["limited", 0.5],
  ["mildly", 0.5],
  ["modestly", 0.5],
  ["slightly", 0.5],
  ["somewhat", 0.5],
]);
const SENTENCE_BOUNDARIES = new Set([".", "?", "!", ";", ":"]);
const MODIFIER_LOOKBACK = 3;

function tokensFor(input: SentimentAnalysisInput): string[] {
  const normalized = `${input.title}. ${input.content}`
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/n['’]t\b/g, " not");
  return normalized.match(/[\p{L}\p{N}]+|[.!?;:]/gu) ?? [];
}

function precedingTokens(tokens: readonly string[], index: number): string[] {
  const preceding: string[] = [];
  for (let cursor = index - 1; cursor >= 0 && preceding.length < MODIFIER_LOOKBACK; cursor -= 1) {
    const token = tokens[cursor];
    if (SENTENCE_BOUNDARIES.has(token)) break;
    preceding.push(token);
  }
  return preceding;
}

function normalizedScore(rawScore: number): number {
  if (rawScore === 0) return 0;
  return Number((rawScore / (1 + Math.abs(rawScore))).toFixed(6));
}

function analyzeLexicon(input: SentimentAnalysisInput): SentimentProviderResult {
  const tokens = tokensFor(input);
  let rawScore = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const weight = LEXICON.get(tokens[index]);
    if (weight === undefined) continue;
    const preceding = precedingTokens(tokens, index);
    const negated = preceding.some((token) => NEGATIONS.has(token));
    const multiplier = preceding.reduce(
      (value, token) => value * (INTENSIFIERS.get(token) ?? DIMINISHERS.get(token) ?? 1),
      1,
    );
    rawScore += weight * multiplier * (negated ? -1 : 1);
  }

  const score = normalizedScore(rawScore);
  const label: SentimentLabel = score > 0 ? "POSITIVE" : score < 0 ? "NEGATIVE" : "NEUTRAL";
  return {
    label,
    score,
    providerId: LEXICON_V1_ID,
    analysisProfileId: LEXICON_V1_ANALYSIS_PROFILE_ID,
    modelName: LEXICON_V1_MODEL_NAME,
    modelVersion: LEXICON_V1_MODEL_VERSION,
  };
}

export function createLexiconV1Provider(): SentimentProvider {
  return {
    id: LEXICON_V1_ID,
    analyze: async (input) => analyzeLexicon(input),
  };
}
