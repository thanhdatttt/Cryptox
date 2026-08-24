export class NewsException extends Error {
  constructor(
    readonly code: "INVALID_NEWS_ITEM" | "PROVIDER_UNAVAILABLE" | "PERSISTENCE_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "NewsException";
  }
}
