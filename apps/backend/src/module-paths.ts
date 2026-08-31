import { createRequire } from "node:module";
import path from "node:path";

/**
 * The workspace module packages retain their source-root `modules/*` public
 * type imports in compiled CommonJS output.  Add the corresponding package
 * dist roots before any public bootstrap is loaded so those imports resolve
 * in both the saved checkout and the backend container.
 */
const packageNames = [
  "auth",
  "backtesting",
  "evaluation",
  "leaderboard",
  "market-data",
  "news",
  "search",
  "sentiment",
  "strategy",
] as const;

const moduleLoader = createRequire(__filename)("module") as {
  _initPaths?: () => void;
};
const projectRoots = [
  path.resolve(process.cwd()),
  path.resolve(process.cwd(), "..", ".."),
  path.resolve(__dirname, "../../../../../../"),
];
const modulePaths = projectRoots.flatMap((root) =>
  packageNames.map((name) => path.join(root, "modules", name, "dist")),
);
const existingPaths = process.env.NODE_PATH?.split(path.delimiter).filter(Boolean) ?? [];
process.env.NODE_PATH = [...new Set([...existingPaths, ...modulePaths])].join(path.delimiter);
moduleLoader._initPaths?.();
