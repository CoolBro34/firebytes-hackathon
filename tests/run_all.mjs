import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const testsDir = join(root, "tests");
const suites = readdirSync(testsDir).filter(name => /^test_.*\.mjs$/.test(name)).sort();
if (!suites.length) {
  console.error("No test suites found.");
  process.exit(1);
}

for (const suite of suites) {
  console.log(`\n▶ ${suite}`);
  const result = spawnSync(process.execPath, [join(testsDir, suite)], { cwd: root, encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    console.error(`FAILED ${suite} (exit ${result.status ?? "unknown"})`);
    process.exit(result.status || 1);
  }
  console.log(`PASSED ${suite}`);
}
console.log("\nALL SUITES PASSED");
