#!/usr/bin/env node
// Promotes `status:blocked` issues to `status:ready` when the issue they were
// waiting on closes and every dependency in their "Depends on:" / "Blocked by:"
// lines is now CLOSED.
//
// Usage: GITHUB_REPOSITORY=owner/repo node tools/agent-loop/unblock.mjs <closed-issue-number> [--dry-run]
import { execFileSync } from "node:child_process";

const depNumbers = (body) => {
  const found = new Set();
  for (const line of (body ?? "").split("\n")) {
    if (/^\s*(depends on|blocked by)\s*:/i.test(line)) {
      for (const match of line.matchAll(/#(\d+)/g)) found.add(Number(match[1]));
    }
  }
  return [...found];
};

if (process.argv.includes("--self-test")) {
  const cases = [
    ["Depends on: #33", [33]],
    ["Depends on: #37, #35", [37, 35]],
    ["Part of #32\nDepends on: #41, #43", [41, 43]],
    ["Blocked by: #9", [9]],
    ["Part of #32", []],
  ];
  for (const [input, expected] of cases) {
    const actual = depNumbers(input);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      console.error(`self-test failed: ${JSON.stringify(input)} -> ${actual}, expected ${expected}`);
      process.exit(1);
    }
  }
  console.log("unblock self-test passed");
  process.exit(0);
}

const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  console.error("GITHUB_REPOSITORY is required (owner/repo)");
  process.exit(1);
}

const closedIssue = Number((process.argv[2] ?? "").replace("#", ""));
if (!Number.isInteger(closedIssue) || closedIssue <= 0) {
  console.error("usage: unblock.mjs <closed-issue-number> [--dry-run]");
  process.exit(1);
}
const dryRun = process.argv.includes("--dry-run");

const gh = (args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });

const blockedIssues = JSON.parse(
  gh(["issue", "list", "--repo", repo, "--label", "status:blocked", "--state", "open", "--limit", "200", "--json", "number,body"]),
);

const stateOf = (number) =>
  gh(["issue", "view", String(number), "--repo", repo, "--json", "state", "--jq", ".state"]).trim().toUpperCase();

const DESIGN_TICKET_MARKER = "Part of #32";
const isDesignIssue = (issue) => (issue.body ?? "").includes(DESIGN_TICKET_MARKER);

let promoted = 0;
for (const issue of blockedIssues) {
  if (!isDesignIssue(issue)) continue;
  const deps = depNumbers(issue.body);
  if (!deps.includes(closedIssue)) continue;
  const stillOpen = deps.filter((dep) => stateOf(dep) !== "CLOSED");
  if (stillOpen.length > 0) {
    console.log(`#${issue.number} still blocked by ${stillOpen.map((n) => `#${n}`).join(", ")}`);
    continue;
  }
  const depsLabel = deps.map((n) => `#${n}`).join(", ");
  console.log(`#${issue.number} unblocked (deps ${depsLabel})${dryRun ? " [dry-run]" : ""}`);
  promoted += 1;
  if (dryRun) continue;
  gh(["issue", "edit", String(issue.number), "--repo", repo, "--remove-label", "status:blocked", "--add-label", "status:ready"]);
  gh([
    "issue",
    "comment",
    String(issue.number),
    "--repo",
    repo,
    "--body",
    `Dependencies complete (${depsLabel}); moved to \`status:ready\`.`,
  ]);
}

console.log(promoted === 0 ? "no dependents to unblock" : `promoted ${promoted} issue(s)`);
