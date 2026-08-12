import { z } from "zod";

const Activity = z.object({
  name: z.string(),
  category: z.enum([
    "research","stem","business","service","sports","arts","humanities",
    "social_science","work","family_responsibility","other"
  ]),
  years: z.number().nullable(),
  hours_per_week: z.number().nullable(),
  role: z.string().nullable(),
  impact_scope: z.enum(["self","school","local","regional","national","international","unknown"]),
  measurable_outcome: z.string().nullable(),
  major_related: z.boolean().nullable(),
});

const Award = z.object({
  name: z.string(),
  level: z.enum(["school","regional","national","international","elite","unknown"]),
  major_related: z.boolean().nullable(),
});

export const ApplicantProfile = z.object({
  applicant_type: z.enum([
    "china_international","other_international","us_domestic","uk_home","unknown"
  ]),
  age_band: z.enum(["13_17","18_plus","unknown"]),
  curriculum: z.enum(["ap","ib","alevel","other","unknown"]),
  gpa_description: z.string().nullable(),
  grade_band: z.enum(["top1","top5","top10","top25","mid","unknown"]),
  sat: z.number().nullable(),
  act: z.number().nullable(),
  toefl: z.number().nullable(),
  ielts: z.number().nullable(),
  ap_5_count: z.number().nullable(),
  ap_4_count: z.number().nullable(),
  ib_predicted: z.number().nullable(),
  a_star_count: z.number().nullable(),
  academic_rigor: z.enum(["highest","strong","average","unknown"]),
  quantitative_preparation: z.enum(["strong","average","weak","unknown"]),
  writing_preparation: z.enum(["strong","average","weak","unknown"]),
  primary_major: z.string().nullable(),
  secondary_major: z.string().nullable(),
  intended_countries: z.array(z.enum(["us","uk"])),
  aid_need: z.enum(["none","some","high","unknown"]),
  awards: z.array(Award),
  activities: z.array(Activity),
  distinctive_outputs: z.array(z.string()),
  profile_summary: z.string(),
  uncertainties: z.array(z.string()),
});
