const fs = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..");
const modulesRoot = path.join(repositoryRoot, "modules");
const forbidden = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "dist" || entry.name === "node_modules") {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(absolutePath);
      continue;
    }

    if (entry.name.endsWith(".js") || entry.name.endsWith(".d.ts")) {
      forbidden.push(path.relative(repositoryRoot, absolutePath));
    }
  }
}

visit(modulesRoot);

if (forbidden.length > 0) {
  console.error("Source-adjacent generated module artifacts are forbidden:");
  for (const file of forbidden.sort()) {
    console.error(`- ${file}`);
  }
  process.exitCode = 1;
} else {
  console.log("No source-adjacent generated module artifacts found.");
}
