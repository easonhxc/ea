import { deepseekJson } from "@/lib/deepseek";
import { AIHolisticSchema } from "@/lib/schema";
import { evaluateCourseFit } from "@/lib/academic-fit";
import { evaluateEvidenceFit } from "@/lib/evidence-fit";

const TEMPLATE={
  academic_context:70,intellectual_vitality:70,activity_coherence:70,major_fit:70,
  course_major_alignment:70,project_major_alignment:70,interdisciplinary_fit:70,
  narrative_strength:70,execution_evidence:70,overall:70,confidence:.6,
  strengths:[],gaps:[],risk_flags:[],rationale:""
};
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));

export async function evaluateProfileWithAI(profile,major){
  const course=evaluateCourseFit(profile,major);const evidence=evaluateEvidenceFit(profile,major);
  const system=`You are the bounded holistic-evaluation layer inside UniPath, a student-facing planning tool.
You do NOT predict admission probability. You score evidence quality in an applicant profile from 0 to 100.
Return JSON only matching this shape: ${JSON.stringify(TEMPLATE)}
Rules:
- Be conservative and evidence-based. Planned/future activities are not achievements and should not raise execution_evidence.
- Do not score sensitive traits, wealth, or school prestige. School context is handled separately.
- Analyze AP/IB/A-level subjects individually. course_major_alignment asks whether actual completed/current coursework covers the intellectual foundations of the stated major; planned courses are only weak evidence.
- Analyze the CONTENT of projects, not just category labels. project_major_alignment should distinguish, for example, materials/chemistry/physics evidence from generic STEM participation.
- interdisciplinary_fit asks whether the applicant has credible cross-disciplinary evidence useful for the intended field (e.g. materials + chemistry + computation + design, or engineering + environment + social impact). Do not reward unrelated breadth by itself.
- Intellectual vitality means curiosity beyond grade optimization. Activity coherence means sustained depth, leadership, impact and thematic coherence.
- Narrative strength means whether the evidence can form a coherent story; do not pretend to have read essays if none are supplied.
- execution_evidence means finished outputs, measured impact, real responsibility and external validation.
- overall should be a balanced synthesis, not a max. confidence should fall when evidence is missing.
- rationale <= 600 characters.`;
  const raw=await deepseekJson([
    {role:"system",content:system},
    {role:"user",content:`Intended major: ${major||profile.primary_major||"unknown"}\nDeterministic course analysis: ${JSON.stringify(course)}\nDeterministic project-evidence analysis: ${JSON.stringify(evidence)}\nProfile:\n${JSON.stringify(profile)}`}
  ],{temperature:.02,max_tokens:1800});
  const parsed=AIHolisticSchema.parse(raw);
  for(const k of ["academic_context","intellectual_vitality","activity_coherence","major_fit","course_major_alignment","project_major_alignment","interdisciplinary_fit","narrative_strength","execution_evidence","overall"]) parsed[k]=Math.round(parsed[k]);
  parsed.confidence=Math.round(parsed.confidence*20)/20;
  // AI can nuance these dimensions but cannot overturn the auditable evidence layers.
  parsed.course_major_alignment=clamp(course.course_alignment*.7+parsed.course_major_alignment*.3);
  parsed.project_major_alignment=clamp(evidence.project_major_alignment*.7+parsed.project_major_alignment*.3);
  parsed.interdisciplinary_fit=clamp(evidence.interdisciplinary_fit*.7+parsed.interdisciplinary_fit*.3);
  return parsed;
}
