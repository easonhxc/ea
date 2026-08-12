import { githubChat, extractJson } from "@/lib/github-models";
import { ApplicantProfileSchema } from "@/lib/schema";

const TEMPLATE = ApplicantProfileSchema.parse({});

export async function extractProfileWithAI(text,ageBand) {
  const system = `
You extract a college applicant's information into a strict JSON object.

Return JSON only. No markdown.

Rules:
- Never inflate achievements.
- Use null or "unknown" when missing.
- Separate completed achievements from planned/future achievements.
- Do not infer sensitive traits such as race, religion, sexuality, disability, health status, or political affiliation.
- Preserve intended majors/countries.
- For activities, capture years, hours, role, scope, measurable outcomes, and major relevance only when supported.
- "distinctive_outputs" can include research papers, software, policy reports, publications, documentaries, performances, prototypes, products, patents, or comparable finished work.
- Put important missing information in "uncertainties".

Required JSON structure:
${JSON.stringify(TEMPLATE)}
`.trim();

  let error;
  for (let attempt=0;attempt<2;attempt++) {
    try {
      const out=await githubChat([
        {role:"system",content:system},
        {role:"user",content:`Declared age band: ${ageBand}\n\nApplicant description:\n${text}\n\nReturn the JSON object only.`}
      ],{temperature:.05,max_tokens:5000});
      const raw=extractJson(out);
      if (["13_17","18_plus"].includes(ageBand)) raw.age_band=ageBand;
      return ApplicantProfileSchema.parse(raw);
    } catch(e) { error=e; }
  }
  throw error || new Error("AI profile extraction failed.");
}
