export class SentimentException extends Error {
  constructor(
    readonly code:
      | "ANALYSIS_FAILED"
      | "DUPLICATE_RESULT"
      | "INVALID_INPUT"
      | "INVALID_RESULT"
      | "INVALID_SNAPSHOT"
      | "SNAPSHOT_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "SentimentException";
  }
}
