import { existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(rootDir, "dist", "assets");

const budgets = [
  { label: "app index chunk", pattern: /^index-[A-Za-z0-9_-]+\.js$/, maxBytes: 380 * 1024 },
  { label: "react vendor chunk", pattern: /^react-vendor-[A-Za-z0-9_-]+\.js$/, maxBytes: 240 * 1024 },
  { label: "icon vendor chunk", pattern: /^icon-vendor-[A-Za-z0-9_-]+\.js$/, maxBytes: 56 * 1024 },
  { label: "ui vendor chunk", pattern: /^ui-vendor-[A-Za-z0-9_-]+\.js$/, maxBytes: 72 * 1024 },
  { label: "misc vendor chunk", pattern: /^vendor-[A-Za-z0-9_-]+\.js$/, maxBytes: 120 * 1024 },
  { label: "desktop stylesheet", pattern: /^index-[A-Za-z0-9_-]+\.css$/, maxBytes: 96 * 1024 }
];

const totalJavaScriptBudget = 860 * 1024;

if (!existsSync(assetsDir)) {
  fail(`Missing desktop build assets at ${assetsDir}. Run pnpm --filter @geond-agent/desktop build first.`);
}

const assets = readdirSync(assetsDir)
  .map((fileName) => ({
    fileName,
    bytes: statSync(path.join(assetsDir, fileName)).size
  }))
  .sort((left, right) => left.fileName.localeCompare(right.fileName));

const failures = [];

for (const budget of budgets) {
  const matches = assets.filter((asset) => budget.pattern.test(asset.fileName));
  if (!matches.length) {
    failures.push(`${budget.label}: no matching asset found`);
    continue;
  }

  const bytes = matches.reduce((total, asset) => total + asset.bytes, 0);
  const status = bytes <= budget.maxBytes ? "ok" : "over";
  console.log(
    `${status.padEnd(4)} ${budget.label.padEnd(24)} ${formatBytes(bytes)} / ${formatBytes(budget.maxBytes)}`
  );
  if (bytes > budget.maxBytes) {
    failures.push(`${budget.label}: ${formatBytes(bytes)} exceeds ${formatBytes(budget.maxBytes)}`);
  }
}

const totalJavaScriptBytes = assets
  .filter((asset) => asset.fileName.endsWith(".js"))
  .reduce((total, asset) => total + asset.bytes, 0);
const totalStatus = totalJavaScriptBytes <= totalJavaScriptBudget ? "ok" : "over";
console.log(
  `${totalStatus.padEnd(4)} total JavaScript assets  ${formatBytes(totalJavaScriptBytes)} / ${formatBytes(totalJavaScriptBudget)}`
);
if (totalJavaScriptBytes > totalJavaScriptBudget) {
  failures.push(
    `total JavaScript assets: ${formatBytes(totalJavaScriptBytes)} exceeds ${formatBytes(totalJavaScriptBudget)}`
  );
}

if (failures.length) {
  fail(`Desktop chunk budget failed:\n- ${failures.join("\n- ")}`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}
