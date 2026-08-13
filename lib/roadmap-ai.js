import { deepseekJson } from "@/lib/deepseek";

function isoMonth(d){return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`}
function addMonths(date,n){const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+n,1));return d}
function sanitizeWindow(value,index,now,gradYear){
  const raw=String(value||"").trim();
  const match=raw.match(/(20\d{2})(?:[-/.](\d{1,2}))?/);
  if(!match)return raw||isoMonth(addMonths(now,Math.min(11,index+1)));
  const y=Number(match[1]),m=Number(match[2]||6);const currentKey=now.getUTCFullYear()*12+now.getUTCMonth();const key=y*12+(Math.max(1,Math.min(12,m))-1);
  const maxYear=Number(gradYear)||now.getUTCFullYear()+2;
  if(y>maxYear)return `${maxYear}-${String(Math.min(12,Math.max(1,m))).padStart(2,"0")}`;
  if(key<currentKey)return isoMonth(addMonths(now,Math.min(11,index+1)));
  return raw;
}

export async function generateRoadmapWithAI({profile,predictions,opportunities,existing=[],language="auto"}){
  const now=new Date();const today=now.toISOString().slice(0,10);const grad=profile?.graduation_year||null;
  const applicationSeason=grad?`${grad-1}-${grad}`:"the applicant's future application cycle";
  const system=`You are UniPath's long-horizon university admissions planning counselor. Build a realistic, highly specific 9-12 month roadmap for a high-school student.
Return JSON only with {summary:string, priorities:[string], items:[{title,type,due_window,priority,why,success_metric,source_id}] }.
Today is ${today}. The student's graduation year is ${grad||"unknown"}; their likely undergraduate application cycle is ${applicationSeason}.
Rules:
- NEVER schedule anything in the past. No due_window may be earlier than ${today.slice(0,7)}.
- Do not invent awards, admissions, research positions, publications, internships, acceptances, deadlines, or completed outcomes.
- Separate controllable actions from outcomes.
- Prefer depth and finished outputs over collecting branded programs.
- Include academics/testing only if relevant, 1-2 core activity/output goals, opportunity/application windows, and application preparation appropriate to the student's grade.
- A student graduating in ${grad||"a future year"} should not be told to submit final college applications years early. Schedule essays/application execution in the correct application cycle.
- source_id may reference only an opportunity id supplied below, otherwise null.
- Do not recommend more than 12 items.
- Language: ${language==="zh"?"Simplified Chinese":language==="en"?"English":"the student\'s primary language"}.
- Avoid sensitive-trait inference.`;
  const roadmap=await deepseekJson([
    {role:"system",content:system},
    {role:"user",content:`Profile:\n${JSON.stringify(profile)}\n\nCurrent prediction summary:\n${JSON.stringify(predictions?.scores||{})}\n\nTop matched opportunities:\n${JSON.stringify(opportunities?.slice(0,15)||[])}\n\nExisting roadmap:\n${JSON.stringify(existing||[])}`}
  ],{temperature:.08,max_tokens:3000});
  const items=Array.isArray(roadmap?.items)?roadmap.items.slice(0,12):[];
  roadmap.items=items.map((x,i)=>({...x,due_window:sanitizeWindow(x.due_window,i,now,grad),priority:["high","medium","low"].includes(x.priority)?x.priority:"medium"}));
  return roadmap;
}
