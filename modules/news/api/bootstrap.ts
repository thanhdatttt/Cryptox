export type { NewsModuleDependencies } from "../application/ports";
import type { NewsModuleDependencies } from "../application/ports";
import type { NewsModulePublicApi } from "./index";
import { collect, readNews } from "./index";
export function createNewsModule(_deps: NewsModuleDependencies): NewsModulePublicApi {
  return { collect, readNews };
}
