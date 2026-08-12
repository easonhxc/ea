import { deepseekChat, extractJson } from "@/lib/deepseek";
import { AIHolisticSchema } from "@/lib/schema";

const TEMPLATE={
  academic_context:70,
  intellectual_vitality:70,
  activity_coherence:70,
  major_fit:70,
  narrative_strength:70,
  execution_evidence:70,
  overall:70,
  confidence:.6,
  strengths:[],gaps:[],risk_flags:[],rationale:""
};

export async function evaluateProfileWithAI(profile,major){
  const system=`You are the bounded holistic-evaluation layer inside UniPath, a student-facing planning tool.
You do NOT predict admission probability. You score evidence quality in an applicant profile from 0 to 100.
Return JSON only matching this shape: ${JSON.stringify(TEMPLATE)}

Rules:
- Be conservative and evidence-based.
- Planned/future activities are not achievements and should not raise execution_evidence.
- Do not score race, religion, gender, sexuality, disability, health, family wealth, nationality prestige, or other sensitive traits.
- Do not reward a high-school name by itself. School context is handled by a separate audited aggregate-data layer.
- Academic context means rigor/performance relative to the information supplied, not an invented school comparison.
- Intellectual vitality means evidence of curiosity beyond grade optimization.
- Activity coherence means sustained depth, leadership, impact and thematic coherence.
- Major fit means preparation and evidence connected to the stated major.
- Narrative strength means whether the profile has a coherent story; do not pretend to have read essays if none are supplied.
- execution_evidence means finished outputs, measured impact, real responsibility and external validation.
- overall should be a balanced synthesis, not a simple max.
- confidence should be lower when key information is missing.
- rationale <= 500 characters.`;
  const out=await deepseekChat([
    {role:"system",content:system},
    {role:"user",content:`Intended major: ${major||profile.primary_major||"unknown"}\nProfile:\n${JSON.stringify(profile)}`}
  ],{temperature:.05,max_tokens:1800,json:true});
  return AIHolisticSchema.parse(extractJson(out));
}
