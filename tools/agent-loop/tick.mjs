#!/usr/bin/env node
// Periodic orchestrator for the design-system agent loop.
//
// A scheduled workflow runs this every few minutes with a PAT (AGENT_TOKEN) so the
// label changes it makes can trigger other workflows (GITHUB_TOKEN changes cannot).
//
// Each tick:
//   1. For issues marked status:done, squash-merge their open PR and close the issue.
//   2. If fewer than MAX_CONCURRENT tickets are in progress/validating, start the next
//      status:ready (or status:blocked) issue whose dependencies are all CLOSED by
//      moving it to status:in-progress.
//
// Usage: GITHUB_REPOSITORY=owner/repo node tools/agent-loop/tick.mjs [--dry-run]
import { execFileSync } from "node:child_process";

const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  console.error("GITHUB_REPOSITORY is required (owner/repo)");
  process.exit(1);
}
const maxConcurrent = Number(process.env.MAX_CONCURRENT ?? "1");
const dryRun = process.argv.includes("--dry-run");

const gh = (args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const ghJson = (args) => JSON.parse(gh(args));

const log = (...args) => console.log(...args);

const depNumbers = (body) => {
  const found = new Set();
  for (const line of (body ?? "").split("\n")) {
    if (/^\s*(depends on|blocked by)\s*:/i.test(line)) {
      for (const match of line.matchAll(/#(\d+)/g)) found.add(Number(match[1]));
    }
  }
  return [...found];
};

const DESIGN_TICKET_MARKER = "Part of #32";
const isDesignIssue = (issue) => (issue.body ?? "").includes(DESIGN_TICKET_MARKER);

const listIssues = (label) =>
  ghJson(["issue", "list", "--repo", repo, "--state", "open", "--label", label, "--limit", "200", "--json", "number,title,body,labels"]);

const stateOf = (number) =>
  gh(["issue", "view", String(number), "--repo", repo, "--json", "state", "--jq", ".state"]).trim().toUpperCase();

const openPrs = ghJson([
  "pr",
  "list",
  "--repo",
  repo,
  "--state",
  "open",
  "--limit",
  "200",
  "--json",
  "number,title,headRefName,body",
]);

const prForIssue = (number) =>
  openPrs.find(
    (pr) =>
      pr.headRefName === `ticket-${number}` ||
      new RegExp(`\\bissue[-_]?${number}\\b`, "i").test(pr.headRefName) ||
      new RegExp(`#${number}\\b`).test(`${pr.title}\n${pr.body ?? ""}`),
  );

// 1. Merge and close finished tickets.
for (const issue of listIssues("status:done")) {
  if (!isDesignIssue(issue)) continue;
  const pr = prForIssue(issue.number);
  if (!pr) {
    log(`#${issue.number}: status:done but no open PR found; leaving for inspection`);
    continue;
  }
  if (issue.labels?.some(({ name }) => name === "needs-owner")) {
    const reviewDecision = gh([
      "pr",
      "view",
      String(pr.number),
      "--repo",
      repo,
      "--json",
      "reviewDecision",
      "--jq",
      ".reviewDecision",
    ]).trim();
    if (reviewDecision !== "APPROVED") {
      log(`#${issue.number}: waiting for owner approval on PR #${pr.number}`);
      continue;
    }
  }
  log(`#${issue.number}: squash-merge PR #${pr.number}${dryRun ? " [dry-run]" : ""}`);
  if (!dryRun) {
    try {
      gh(["pr", "merge", String(pr.number), "--repo", repo, "--squash", "--delete-branch"]);
    } catch (error) {
      log(`#${issue.number}: merge failed (${String(error.message).split("\n")[0]}); leaving open`);
      continue;
    }
  }
  log(`#${issue.number}: close${dryRun ? " [dry-run]" : ""}`);
  if (!dryRun) gh(["issue", "close", String(issue.number), "--repo", repo, "--reason", "completed"]);
}

// 2. Capacity check.
const active = [
  ...listIssues("status:in-progress"),
  ...listIssues("status:validating"),
  ...listIssues("status:changes-requested"),
].filter(isDesignIssue).length;
let slots = Math.max(0, maxConcurrent - active);
log(`active=${active} max=${maxConcurrent} slots=${slots}`);

if (slots > 0) {
  const candidates = [...listIssues("status:ready"), ...listIssues("status:blocked")];
  const eligible = [];
  for (const issue of candidates) {
    if (!isDesignIssue(issue)) continue;
    if (issue.labels?.some(({ name }) => name === "agent:failed")) continue;
    if (prForIssue(issue.number)) continue;
    const openDeps = depNumbers(issue.body).filter((dep) => stateOf(dep) !== "CLOSED");
    if (openDeps.length === 0) eligible.push(issue);
  }
  const priority = (issue) =>
    issue.labels?.some(({ name }) => name === "priority:validation") ? 0 : 1;
  eligible.sort((a, b) => priority(a) - priority(b) || a.number - b.number);

  for (const issue of eligible) {
    if (slots <= 0) break;
    slots -= 1;
    log(`#${issue.number}: start "${issue.title}"${dryRun ? " [dry-run]" : ""}`);
    if (dryRun) continue;
    gh(["issue", "edit", String(issue.number), "--repo", repo, "--remove-label", "status:ready", "--remove-label", "status:blocked", "--remove-label", "agent:failed"]);
    gh(["issue", "edit", String(issue.number), "--repo", repo, "--add-label", "status:in-progress"]);
  }
}

log("tick complete");
