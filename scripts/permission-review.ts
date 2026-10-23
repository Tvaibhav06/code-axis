import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { samplecoSources } from "../src/lib/sampleco";
// Trusted MANUAL fixtures exercise permissions/transactions. They do not simulate a product AI pass.
export async function reviewPermissionChecks({ creator, reviewer, manager, otherCreator, admin, workspaceId, ownerId, campaignId, bookId, bookVersion, check }: {
  creator: SupabaseClient; reviewer: SupabaseClient; manager: SupabaseClient; otherCreator: SupabaseClient; admin: SupabaseClient;
  workspaceId: string; ownerId: string; campaignId: string; bookId: string; bookVersion: number; check: (name: string, passed: boolean) => void;
}) {
  const version = await creator.from("campaign_versions").select("id").eq("campaign_id", campaignId).eq("version", 3).single();
  if (version.error) throw new Error("review fixture version");
  const finding = { id: randomUUID(), ruleId: samplecoSources[0].id, category: "source_conflict", quote: "sample", explanation: "Permission-test manual fixture only", suggestion: null, origin: "exact", blocking: true };
  const args = { p_workspace: workspaceId, p_actor: ownerId, p_campaign: campaignId, p_version: version.data.id, p_rulebook: bookId,
    p_status: "manual", p_model: null, p_error: null, p_supported: [], p_findings: [finding] };
  const forged = await creator.rpc("record_check_run", args);
  check("Browser identity cannot forge trusted check results", forged.error?.code === "42501");
  const fixture = await admin.rpc("record_check_run", args);
  check("Trusted server records a labelled manual fixture", !fixture.error && typeof fixture.data === "string");
  if (fixture.error) throw new Error("manual permission fixture");
  const action = (name: string, note = "Permission verification", findingId: string | null = null) => ({ p_campaign: campaignId, p_expected_version: 3, p_action: name, p_note: note, p_finding: findingId });
  const submit = await creator.rpc("review_action", action("submit"));
  check("Creator submits the saved version", !submit.error);
  const approveArgs = { p_campaign: campaignId, p_expected_version: 3, p_rulebook: bookId, p_run: fixture.data,
    p_checklist: { finalReview: true, facts: true, claims: true, tone: true } };
  check("Creator cannot self-approve", (await creator.rpc("approve_campaign", approveArgs)).error?.code === "42501");
  check("Another workspace cannot approve", (await otherCreator.rpc("approve_campaign", approveArgs)).error?.code === "42501");
  check("Unresolved blocker prevents approval", (await reviewer.rpc("approve_campaign", approveArgs)).error?.code === "22023");
  check("Dismissal requires a reason", (await reviewer.rpc("review_action", action("dismiss", "", finding.id))).error?.code === "22023");
  const dismissed = await reviewer.rpc("review_action", action("dismiss", "This is an explicit permission-test false-alarm fixture.", finding.id));
  check("Reviewer records a reasoned dismissal", !dismissed.error);
  check("AI-off approval requires the manual checklist", (await reviewer.rpc("approve_campaign", { ...approveArgs, p_checklist: { finalReview: true } })).error?.code === "22023");
  const approved = await reviewer.rpc("approve_campaign", approveArgs);
  check("Independent reviewer can approve after manual checks", !approved.error);
  const current = await creator.rpc("approval_state", { p_campaign: campaignId });
  check("Approval is recomputed as current", !current.error && current.data?.current === true && current.data?.approval?.review_mode === "manual");
  await reviewer.rpc("review_action", action("request_changes"));
  check("Requested changes invalidate the approval", (await creator.rpc("approval_state", { p_campaign: campaignId })).data?.current === false);
  await creator.rpc("review_action", action("submit"));
  // One focused two-request race. Whichever locks first, the final v4 cannot inherit v3 approval.
  const [edited, racedApproval] = await Promise.all([
    creator.rpc("save_campaign", { p_workspace: workspaceId, p_campaign: campaignId, p_expected_version: 3,
      p_title: "Permission fixture revised", p_purpose: "Verify edit versus approve", p_audience: "Test reviewers", p_body: "Try SampleCo free for 14 days." }),
    reviewer.rpc("approve_campaign", approveArgs),
  ]);
  check("Concurrent edit saves one new version", !edited.error && edited.data?.[0]?.version === 4);
  check("Concurrent approval succeeds for v3 or returns an explicit conflict", !racedApproval.error || (racedApproval.status === 409 && racedApproval.error.code === "PT409"));
  check("Edited version never inherits old approval", (await creator.rpc("approval_state", { p_campaign: campaignId })).data?.current === false);
  const clean = await admin.rpc("record_check_run", { ...args, p_version: edited.data?.[0]?.version_id, p_findings: [] });
  await creator.rpc("review_action", { ...action("submit"), p_expected_version: 4 });
  const second = await reviewer.rpc("approve_campaign", { ...approveArgs, p_expected_version: 4, p_run: clean.data });
  check("New version needs a fresh approval", !second.error);
  const changed = await manager.rpc("publish_rulebook", { p_workspace: workspaceId, p_expected_version: bookVersion, p_entries: samplecoSources });
  check("Manager publishes changed source snapshot", !changed.error);
  check("New sources make the previous approval historical", (await creator.rpc("approval_state", { p_campaign: campaignId })).data?.current === false);
  const expiredSources = samplecoSources.map((s) => s.kind === "trial_days" ? { ...s, validUntil: "2026-10-01" } : s);
  const expiredBook = await manager.rpc("publish_rulebook", { p_workspace: workspaceId, p_expected_version: bookVersion + 1, p_entries: expiredSources });
  if (expiredBook.error) throw new Error("expired supporting-source fixture");
  const expiredRun = await admin.rpc("record_check_run", { ...args, p_version: edited.data?.[0]?.version_id,
    p_rulebook: expiredBook.data[0].id, p_supported: [samplecoSources[1].id], p_findings: [] });
  if (expiredRun.error) throw new Error("expired manual review fixture");
  await creator.rpc("review_action", { ...action("submit"), p_expected_version: 4 });
  const expiredApproval = await reviewer.rpc("approve_campaign", { ...approveArgs, p_expected_version: 4,
    p_rulebook: expiredBook.data[0].id, p_run: expiredRun.data });
  check("Expired supporting fact prevents approval even with no unresolved findings", expiredApproval.error?.code === "22023");
}
