import { z } from "zod";

export const ActivitySchema = z.object({
  name: z.string().default(""),
  category: z.enum([
    "research","stem","business","service","sports","arts","humanities",
    "social_science","work","family_responsibility","other"
  ]).default("other"),
  years: z.number().nullable().default(null),
  hours_per_week: z.number().nullable().default(null),
  role: z.string().nullable().default(null),
  impact_scope: z.enum(["self","school","local","regional","national","international","unknown"]).default("unknown"),
  measurable_outcome: z.string().nullable().default(null),
  major_related: z.boolean().nullable().default(null),
});

export const AwardSchema = z.object({
  name: z.string().default(""),
  level: z.enum(["school","regional","national","international","elite","unknown"]).default("unknown"),
  major_related: z.boolean().nullable().default(null),
});

export const ApplicantProfileSchema = z.object({
  applicant_type: z.enum(["china_international","other_international","us_domestic","uk_home","unknown"]).default("unknown"),
  age_band: z.enum(["13_17","18_plus","unknown"]).default("unknown"),
  curriculum: z.enum(["ap","ib","alevel","other","unknown"]).default("unknown"),
  gpa_description: z.string().nullable().default(null),
  grade_band: z.enum(["top1","top5","top10","top25","mid","unknown"]).default("unknown"),
  sat: z.number().nullable().default(null),
  act: z.number().nullable().default(null),
  toefl: z.number().nullable().default(null),
  ielts: z.number().nullable().default(null),
  ap_5_count: z.number().nullable().default(null),
  ap_4_count: z.number().nullable().default(null),
  ib_predicted: z.number().nullable().default(null),
  a_star_count: z.number().nullable().default(null),
  academic_rigor: z.enum(["highest","strong","average","unknown"]).default("unknown"),
  quantitative_preparation: z.enum(["strong","average","weak","unknown"]).default("unknown"),
  writing_preparation: z.enum(["strong","average","weak","unknown"]).default("unknown"),
  primary_major: z.string().nullable().default(null),
  secondary_major: z.string().nullable().default(null),
  intended_countries: z.array(z.enum(["us","uk"])).default(["us"]),
  aid_need: z.enum(["none","some","high","unknown"]).default("unknown"),
  awards: z.array(AwardSchema).default([]),
  activities: z.array(ActivitySchema).default([]),
  distinctive_outputs: z.array(z.string()).default([]),
  essay_quality: z.enum(["unknown","average","good","excellent"]).default("unknown"),
  recommendation_quality: z.enum(["unknown","average","good","excellent"]).default("unknown"),
  profile_summary: z.string().default(""),
  uncertainties: z.array(z.string()).default([]),
});

export const EmptyProfile = ApplicantProfileSchema.parse({});
