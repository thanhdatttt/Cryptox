import type { SentimentInput, SentimentModulePublicApi, SentimentResult } from "./contracts";

export * from "./contracts";

const notImplemented = (): never => {
  throw new Error("NOT_IMPLEMENTED");
};

export const analyze = async (_input: SentimentInput): Promise<SentimentResult> => notImplemented();
export const readLatestForNews: SentimentModulePublicApi["readLatestForNews"] = async () =>
  notImplemented();
