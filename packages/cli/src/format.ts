import type { ReviewFinding, ReviewReport } from "./types.ts";

const PRIORITY_ORDER: Record<ReviewFinding["priority"], number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

function stripUnsafeControls(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, "");
}

function escapeInline(value: string): string {
  return stripUnsafeControls(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/([\\`*_[\]{}()#+.!|])/g, "\\$1")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

function quote(value: string): string {
  return escapeBlock(value).trim().split(/\r?\n/).map((line) => `> ${line || " "}`).join("\n");
}

function escapeBlock(value: string): string {
  return stripUnsafeControls(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function inlineCode(value: string): string {
  return `\`${stripUnsafeControls(value).replaceAll("`", "'").replace(/[\r\n]/g, " ")}\``;
}

function location(finding: ReviewFinding): string {
  const side = finding.side === "old" ? " (old side)" : "";
  const lines = finding.endLine !== finding.startLine ? `${finding.startLine}-${finding.endLine}` : String(finding.startLine);
  return `${finding.file}:${lines}${side}`;
}

export function formatMarkdown(report: ReviewReport): string {
  const sorted = [...report.findings].sort((left, right) => (
    PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]
    || right.confidence - left.confidence
    || left.file.localeCompare(right.file, "en")
    || left.startLine - right.startLine
    || left.title.localeCompare(right.title, "en")
  ));
  const counts = sorted.reduce<Record<string, number>>((accumulator, finding) => {
    accumulator[finding.priority] = (accumulator[finding.priority] ?? 0) + 1;
    return accumulator;
  }, {});
  const countText = Object.entries(counts).map(([priority, count]) => `${count} ${priority}`).join(", ");
  const scope = [report.scope.kind, report.scope.base ? `base ${report.scope.base}` : null, report.scope.head ? `head ${report.scope.head}` : null].filter(Boolean).join(" · ");
  const output = ["# Auto Code Review", "", `**Scope:** ${escapeInline(scope)}`, "", escapeInline(report.summary), ""];

  if (sorted.length === 0) {
    output.push("## No actionable findings", "", "The review did not identify a finding that met the reporting threshold.", "");
    return output.join("\n");
  }

  output.push(`**${sorted.length} finding${sorted.length === 1 ? "" : "s"}:** ${countText}`, "");
  sorted.forEach((finding, index) => {
    output.push(
      `## ${index + 1}. [${finding.priority}] ${escapeInline(finding.title)}`,
      "",
      `${inlineCode(location(finding))} · ${inlineCode(finding.category)} · confidence ${Math.round(finding.confidence * 100)}%`,
      "",
      "**Evidence**",
      "",
      quote(finding.evidence),
      "",
      "**Failure scenario**",
      "",
      escapeBlock(finding.failureScenario.trim()),
      "",
    );
    if (finding.suggestedFix) output.push("**Suggested fix**", "", escapeBlock(finding.suggestedFix.trim()), "");
    if (finding.fingerprint) output.push(`Fingerprint: ${inlineCode(finding.fingerprint)}`, "");
  });
  return output.join("\n");
}
