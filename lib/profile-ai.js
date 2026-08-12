import { deepseekChat, extractJson } from "@/lib/deepseek";
import { ApplicantProfileSchema } from "@/lib/schema";

const TEMPLATE=ApplicantProfileSchema.parse({});

export async function extractProfileWithAI(text,ageBand){
  const system=`You extract a university applicant profile into strict JSON. Return JSON only.
Rules:
- Never inflate achievements.
- Use null or \"unknown\" when information is missing.
- Mark future intentions as planned, not completed.
- Do not infer race, religion, sexuality, disability, health status, political affiliation, family wealth, or other sensitive traits.
- Preserve exact test scores and intended majors.
- Activities should capture duration, role, impact, measurable output and status only when supported.
- Awards should be earned only if the text clearly says they were received.
- distinctive_outputs means finished artifacts such as papers, software, prototypes, documentaries, reports, publications or performances.
- high_school_id should remain null unless an exact catalog identifier is provided; high_school_name may be natural language.
- Put uncertain or contradictory information in uncertainties.
Required JSON structure:\n${JSON.stringify(TEMPLATE)}`;
  let last;
  for(let i=0;i<2;i++){
    try{
      const out=await deepseekChat([
        {role:"system",content:system},
        {role:"user",content:`Declared age band: ${ageBand}\n\nApplicant description:\n${text}\n\nReturn JSON only.`}
      ],{temperature:.05,max_tokens:5200,json:true});
      const raw=extractJson(out);
      if(["13_17","18_plus"].includes(ageBand)) raw.age_band=ageBand;
      return ApplicantProfileSchema.parse(raw);
    }catch(e){last=e}
  }
  throw last || new Error("AI profile extraction failed.");
}
