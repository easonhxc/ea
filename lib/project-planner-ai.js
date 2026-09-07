import { deepseekJson } from "@/lib/deepseek";
import { evaluateCourseFit } from "@/lib/academic-fit";
import { evaluateEvidenceFit } from "@/lib/evidence-fit";

const text=value=>String(value||"").trim().slice(0,700);
const list=(value,max=6)=>Array.isArray(value)?value.map(text).filter(Boolean).slice(0,max):[];
function normalizeProjects(raw){
  const projects=Array.isArray(raw?.projects)?raw.projects:[];
  const clean=projects.map((project,index)=>({
    title:text(project.title)||`Independent project ${index+1}`,
    theme:text(project.theme),why_this_student:text(project.why_this_student),gaps_addressed:list(project.gaps_addressed,4),build_on:list(project.build_on,4),
    duration_weeks:Math.max(2,Math.min(24,Number(project.duration_weeks)||8)),hours_per_week:Math.max(1,Math.min(18,Number(project.hours_per_week)||4)),difficulty:project.difficulty==="high"?"high":"medium",
    steps:list(project.steps,7),milestones:(Array.isArray(project.milestones)?project.milestones:[]).map(x=>({week:text(x?.week),goal:text(x?.goal),proof:text(x?.proof)})).filter(x=>x.goal).slice(0,7),deliverables:list(project.deliverables,5),success_metrics:list(project.success_metrics,5),external_validation:list(project.external_validation,4),resources:list(project.resources,5),risks:list(project.risks,5),
    admissions_impact:{primary_signal:text(project.admissions_impact?.primary_signal),why_it_matters:text(project.admissions_impact?.why_it_matters),secondary_signals:list(project.admissions_impact?.secondary_signals,4),application_uses:list(project.admissions_impact?.application_uses,4)}
  })).filter(x=>x.why_this_student&&x.deliverables.length&&x.milestones.length>=3).slice(0,4);
  if(clean.length<3)throw new Error("AI project plan did not include enough feasible, structured projects.");
  return {summary:text(raw?.summary)||"Projects matched to the current evidence gaps.",projects:clean};
}

export async function generateOriginalProjects({profile,predictions,language="auto"}){
  const major=profile.primary_major||predictions?.primary_major||"undecided";
  const course=evaluateCourseFit(profile,major);const evidence=evaluateEvidenceFit(profile,major);
  const today=new Date().toISOString().slice(0,10);
  const system=`Act as an experienced university admissions planning counselor. Design ORIGINAL, feasible student-led projects that strengthen the applicant's real weaknesses while building on existing strengths. Do not recommend fake nonprofits, pay-to-play research, fabricated impact, or projects that exist only for admissions optics.
Return JSON only: {summary:string, projects:[{title,theme,why_this_student,gaps_addressed:[string],build_on:[string],duration_weeks:number,hours_per_week:number,difficulty:"medium"|"high",steps:[string],milestones:[{week:string,goal:string,proof:string}],deliverables:[string],success_metrics:[string],external_validation:[string],resources:[string],risks:[string],admissions_impact:{primary_signal:string,why_it_matters:string,secondary_signals:[string],application_uses:[string]}}]}.
Today is ${today}. The student graduates in ${profile?.graduation_year||"an unknown future year"}. Create exactly 4 high-quality projects. Each must be materially different by method, audience, and output; do not return four versions of a research paper. Projects must be possible for a high-school student without privileged access, though one may include optional mentor/lab outreach. Planned activities are NOT completed achievements and must never be described as existing accomplishments.
For each project, show an evidence chain: current starting point → method → independently verifiable output → realistic feedback or validation. Every success metric must be measurable and under the student's control. Name a concrete scope ceiling to prevent the project from becoming an unrealistic startup, nonprofit, publication, or clinical study. Do not promise admission, publication, funding, research placement, media coverage, or external adoption. Prefer a modest completed artifact over a prestigious but inaccessible idea. Include practical, methodological, ethical, access, and time risks where relevant. Milestones must cover setup, iteration, final output and reflection. Use 5–7 milestones, 3–5 deliverables, 3–5 success metrics, and 2–4 realistic validation options. ${language==="zh"?"Write in Simplified Chinese.":language==="en"?"Write in English.":"Use the language the student primarily uses."}`;
  const raw=await deepseekJson([
    {role:"system",content:system},
    {role:"user",content:`Applicant profile:\n${JSON.stringify(profile)}\n\nDeterministic course gaps:\n${JSON.stringify(course)}\n\nProject/interdisciplinary evidence:\n${JSON.stringify(evidence)}\n\nCurrent college-model summary:\n${JSON.stringify({primary:predictions?.primary_major,scores:predictions?.scores,warnings:predictions?.warnings})}`}
  ],{temperature:.12,max_tokens:5200});
  return normalizeProjects(raw);
}
