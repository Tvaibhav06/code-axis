export type IssueDecision = { id: string; findingId: string; campaignId: string; ruleId: string; decision: "confirm" | "dispute" | "dismiss"; createdAt: string };
export function issueCounts(decisions: IssueDecision[]) {
  const findings = new Map<string, IssueDecision>();
  for (const event of [...decisions].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))) findings.set(event.findingId, event);
  const rules = new Map<string, { ruleId: string; confirmed: number; disputed: number }>();
  const counted = new Set<string>();
  for (const event of findings.values()) {
    if (event.decision === "dismiss") continue;
    const pair = `${event.campaignId}/${event.ruleId}/${event.decision}`;
    if (counted.has(pair)) continue;
    counted.add(pair);
    const row = rules.get(event.ruleId) || { ruleId: event.ruleId, confirmed: 0, disputed: 0 };
    if (event.decision === "confirm") row.confirmed++; else row.disputed++;
    rules.set(event.ruleId, row);
  }
  return [...rules.values()].sort((a, b) => b.confirmed - a.confirmed || b.disputed - a.disputed || a.ruleId.localeCompare(b.ruleId));
}
