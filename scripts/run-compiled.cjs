const path = require("node:path");
const Module = require("node:module");

const [distDirectory, entrypoint] = process.argv.slice(2);

if (!distDirectory || !entrypoint) {
  console.error("Usage: node scripts/run-compiled.cjs <dist-directory> <entrypoint>");
  process.exit(1);
}

const distRoot = path.resolve(process.cwd(), distDirectory);
const compiledEntrypoint = path.resolve(distRoot, entrypoint);

process.env.NODE_PATH = [distRoot, process.env.NODE_PATH]
  .filter(Boolean)
  .join(path.delimiter);
Module._initPaths();

require(compiledEntrypoint);
