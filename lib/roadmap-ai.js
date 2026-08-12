import { deepseekJson } from "@/lib/deepseek";

export async function generateRoadmapWithAI({profile,predictions,opportunities,existing=[]}){
  const system=`You are UniPath's long-horizon planning engine. Build a realistic 9-12 month roadmap for a high-school student applying to university.
Return JSON only with {summary:string, priorities:[string], items:[{title,type,due_window,priority,why,success_metric,source_id}] }.
Rules:
- Do not invent awards, admissions or research positions.
- Separate controllable actions from outcomes.
- Prefer depth and finished outputs over collecting branded programs.
- Include academics, testing only if relevant, 1-2 core activity/output goals, opportunity/application windows, and application preparation appropriate to the student's grade.
- source_id may reference only an opportunity id supplied below, otherwise null.
- Do not recommend more than 12 items.
- Avoid sensitive-trait inference.
- Use the student's language when possible.`;
  const roadmap=await deepseekJson([
    {role:"system",content:system},
    {role:"user",content:`Profile:\n${JSON.stringify(profile)}\n\nCurrent prediction summary:\n${JSON.stringify(predictions?.scores||{})}\n\nTop matched opportunities:\n${JSON.stringify(opportunities?.slice(0,15)||[])}\n\nExisting roadmap:\n${JSON.stringify(existing||[])}`}
  ],{temperature:.15,max_tokens:4200});
  return roadmap;
}
