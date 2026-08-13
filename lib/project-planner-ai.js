import { deepseekJson } from "@/lib/deepseek";
import { evaluateCourseFit } from "@/lib/academic-fit";
import { evaluateEvidenceFit } from "@/lib/evidence-fit";

export async function generateOriginalProjects({profile,predictions,language="auto"}){
  const major=profile.primary_major||predictions?.primary_major||"undecided";
  const course=evaluateCourseFit(profile,major);const evidence=evaluateEvidenceFit(profile,major);
  const today=new Date().toISOString().slice(0,10);
  const system=`Act as an experienced university admissions planning counselor. Design ORIGINAL, feasible student-led projects that strengthen the applicant's real weaknesses while building on existing strengths. Do not recommend fake nonprofits, pay-to-play research, fabricated impact, or projects that exist only for admissions optics.
Return JSON only: {summary:string, projects:[{title,theme,why_this_student,gaps_addressed:[string],build_on:[string],duration_weeks:number,hours_per_week:number,difficulty:"medium"|"high",steps:[string],deliverables:[string],success_metrics:[string],external_validation:[string]}]}.
Today is ${today}. The student graduates in ${profile?.graduation_year||"an unknown future year"}. Create exactly 4 high-quality projects. Each must be materially different. Projects must be possible for a high-school student without privileged access, though one may include optional mentor/lab outreach. Planned activities in the profile are NOT completed achievements. Tie each idea to the intended major and interdisciplinary needs. Make deliverables concrete: paper, prototype, dataset, exhibition, policy memo, documentary, open-source tool, field study, etc. ${language==="zh"?"Write in Simplified Chinese.":language==="en"?"Write in English.":"Use the language the student primarily uses."}`;
  return await deepseekJson([
    {role:"system",content:system},
    {role:"user",content:`Applicant profile:\n${JSON.stringify(profile)}\n\nDeterministic course gaps:\n${JSON.stringify(course)}\n\nProject/interdisciplinary evidence:\n${JSON.stringify(evidence)}\n\nCurrent college-model summary:\n${JSON.stringify({primary:predictions?.primary_major,scores:predictions?.scores,warnings:predictions?.warnings})}`}
  ],{temperature:.16,max_tokens:3600});
}
