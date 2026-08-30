import { createHash } from "node:crypto";
import { evaluateBacktest } from "../domain/evaluator";

export const EVALUATION_RUNTIME_VERSION = "1.0.0";
export const EVALUATION_RUNTIME_SHA256 = createHash("sha256")
  .update(`${EVALUATION_RUNTIME_VERSION}\n${evaluateBacktest.toString()}`, "utf8")
  .digest("hex");
