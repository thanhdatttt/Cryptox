import "reflect-metadata";
import { composeWorkerModules } from "./compose";

composeWorkerModules();
console.log("worker skeleton ready");
setInterval(() => undefined, 60_000);
