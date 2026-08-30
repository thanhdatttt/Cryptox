import { describe, expect, it } from "vitest";
import * as publicBootstrap from "./bootstrap";
import * as infrastructureBootstrap from "../infrastructure/bootstrap";

describe("Sentiment public bootstrap", () => {
  it("exposes the existing PostgreSQL dependencies without duplicating the adapter", () => {
    expect(publicBootstrap.createPostgresSentimentDependencies).toBe(
      infrastructureBootstrap.createPostgresSentimentDependencies,
    );
    expect(publicBootstrap.createPostgresSentimentDependencies).toEqual(expect.any(Function));
  });
});
