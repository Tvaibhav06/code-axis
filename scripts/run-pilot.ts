import { loadEnvConfig } from "@next/env";
import { request } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { pilotCases } from "./pilot-cases";
import { deskStateSchema } from "../src/lib/content-schema";
import { reviewViewSchema } from "../src/lib/review-schema";
loadEnvConfig(process.cwd());
type PilotRow = { id: string; body: string; expectedRule: string | null; expectedCategory: string | null;
 status: string; errorCode: string | null; model: string | null; durationMs: number; correctIssue: boolean;
 findings: { rule: string; category: string; quote: string; explanation: string; origin: string }[] };
async function main() {
 const base = process.env.PHASE6_BASE_URL || "http://localhost:3137";
 if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Local-only evaluation");
 if (process.env.PHASE6_AI !== "true" || Number(process.env.GLOBAL_AI_ATTEMPT_LIMIT || 0) < 12) throw new Error("Explicit 12-attempt Phase 6 allowance required");
 const rows: PilotRow[] = []; let found=0, falseAlarms=0, complete=0, lastCall=0;
 const startedAt=new Date().toISOString();
 const output=`docs/evidence/pilot-${startedAt.replace(/[:.]/g,"-")}.json`;
 mkdirSync("docs/evidence", {recursive:true});
 const save=()=>writeFileSync(output,JSON.stringify({startedAt,model:process.env.GEMINI_MODEL,
  disclosure:"Fictional ten-case development pilot. No automatic retries, no mock provider. Labelled cases were fixed before this run. Timing includes HTTP/persistence.",
  completedAiChecks:complete,completedAiIssueDetections:found,
  pipelineIssuesDetected:rows.filter(r=>r.expectedRule!==null&&r.correctIssue).length,
  cleanDraftsEvaluated:rows.filter(r=>r.expectedRule===null&&r.status==="complete").length,cleanDraftsFlagged:falseAlarms,
  targetMet:rows.length===10&&complete===10&&found>=5&&falseAlarms<=1, rows},null,2)+"\n");
 let context: Awaited<ReturnType<typeof request.newContext>> | undefined;
 try {
  for(let i=0;i<pilotCases.length;i++){
   if(i%5===0){await context?.dispose();context=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base},timeout:60000});
    const start=await context.post("/api/demo/start",{data:{}});if(!start.ok())throw new Error("Demo allocation failed");}
   const c=pilotCases[i];const api=context!;
   const stateResponse=await api.get("/api/desk/state"); if(!stateResponse.ok())throw new Error("Workspace read failed");
   const state=deskStateSchema.parse(await stateResponse.json());
   if(state.rulebooks[0]?.entries.length!==6)throw new Error("Pilot requires the seeded six-source SampleCo book");
   const created=await api.post("/api/desk/campaigns",{data:{campaignId:null,expectedVersion:0,title:`Pilot ${c.id}`,purpose:"Fictional fixed-label development evaluation",audience:"SampleCo prospective users",body:c.body}});
   if(!created.ok())throw new Error("Pilot save failed");
   const saved=await created.json();const campaignId=saved.result[0].campaign_id;
   const wait=65_000-(Date.now()-lastCall); if(wait>0){console.log(`Spacing next free-tier call (${c.id}).`);await new Promise(resolve=>setTimeout(resolve,wait));}
   lastCall=Date.now();console.log(`Running ${c.id}, one real request.`);
   const checked=await api.post("/api/review/check",{data:{campaignId,version:1,ai:true,consent:true,model:"primary"}});
   if(!checked.ok())throw new Error("Check could not be confirmed; stop without retrying");
   const result=await checked.json();
   const historyResponse=await api.get(`/api/review/history?campaign=${campaignId}`);
   const history=reviewViewSchema.parse(await historyResponse.json());const run=history.runs.find(r=>r.id===result.result.runId);
   if(!run)throw new Error("Saved check missing");
   const correctIssue=c.rule!==null&&run.findings.some(f=>f.rule_id===c.rule&&f.category===c.category&&c.body.includes(f.quote)&&f.explanation.length>0);
   if(run.status==="complete"){complete++;if(correctIssue)found++;if(c.rule===null&&run.findings.length>0)falseAlarms++;}
   rows.push({id:c.id,body:c.body,expectedRule:c.rule,expectedCategory:c.category,status:run.status,errorCode:run.error_code,
    model:run.model,durationMs:Date.now()-lastCall,correctIssue,findings:run.findings.map(f=>({rule:f.rule_id,category:f.category,quote:f.quote,explanation:f.explanation,origin:f.origin}))});save();
   console.log(`${c.id}: ${run.status}; findings=${run.findings.length}; expected issue matched=${correctIssue}.`);
   if(run.error_code==="provider_quota"||run.error_code==="session_or_global_allowance_unavailable"){console.log("Stopped on quota/allowance failure; remaining cases are unrun.");break;}
  }
 }finally{save();await context?.dispose();}
 console.log(`Recorded ${rows.length}/10 cases, ${complete} complete AI responses, ${found}/6 issues detected with completed AI. Clean flags: ${falseAlarms}; evaluated clean drafts: ${rows.filter(r=>r.expectedRule===null&&r.status==="complete").length}/4. Report: ${output}`);
 process.exitCode=rows.length===10&&complete===10&&found>=5&&falseAlarms<=1?0:1;
}
main().catch(()=>{console.error("Pilot stopped; inspect any partial report. No automatic retry or credential logging.");process.exitCode=1;});
