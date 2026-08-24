import type { NewsReadItem } from "../domain/contracts";
import type { NewsModuleDependencies } from "./ports";
type InternalDependencies = Partial<NewsModuleDependencies>;
export interface NewsModuleRuntime {
    collect(): Promise<void>;
    readNews(): Promise<NewsReadItem[]>;
}
export declare function createInMemoryNewsDependencies(): NewsModuleDependencies;
export declare function createNewsModule(dependencies?: InternalDependencies): NewsModuleRuntime;
export {};
