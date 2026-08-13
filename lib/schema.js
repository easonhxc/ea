import { z } from "zod";

const CourseStatus=z.enum(["completed","current","planned"]);

export const APCourseSchema=z.object({
  subject:z.string().default(""),
  score:z.number().min(1).max(5).nullable().default(null),
  status:CourseStatus.default("completed")
});
export const IBCourseSchema=z.object({
  subject:z.string().default(""),
  level:z.enum(["HL","SL","unknown"]).default("unknown"),
  score:z.number().min(1).max(7).nullable().default(null),
  status:CourseStatus.default("completed")
});
export const ALevelCourseSchema=z.object({
  subject:z.string().default(""),
  grade:z.enum(["A*","A","B","C","D","E","U","predicted","unknown"]).default("unknown"),
  status:CourseStatus.default("completed")
});
export const SchoolPreferenceSchema=z.object({
  school_name:z.string().default(""),
  interest:z.number().min(0).max(10).nullable().default(null),
  note:z.string().nullable().default(null)
});

export const ActivitySchema = z.object({
  name: z.string().default(""),
  description:z.string().nullable().default(null),
  category: z.enum([
    "research","stem","business","service","sports","arts","humanities",
    "social_science","work","family_responsibility","other"
  ]).default("other"),
  status: z.enum(["completed","ongoing","planned","unknown"]).default("unknown"),
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
  status: z.enum(["earned","planned","unknown"]).default("unknown"),
  major_related: z.boolean().nullable().default(null),
});

export const ApplicantProfileSchema = z.object({
  applicant_type: z.enum(["china_international","other_international","us_domestic","uk_home","unknown"]).default("unknown"),
  age_band: z.enum(["13_17","18_plus","unknown"]).default("unknown"),
  graduation_year: z.number().nullable().default(null),
  current_grade: z.enum(["8","9","10","11","12","gap","unknown"]).default("unknown"),
  high_school_id: z.string().nullable().default(null),
  high_school_name: z.string().nullable().default(null),
  school_country: z.string().nullable().default(null),
  curriculum: z.enum(["ap","ib","alevel","us","other","unknown"]).default("unknown"),
  gpa_description: z.string().nullable().default(null),
  grade_band: z.enum(["top1","top5","top10","top25","mid","unknown"]).default("unknown"),
  sat: z.number().nullable().default(null),
  act: z.number().nullable().default(null),
  toefl: z.number().nullable().default(null),
  ielts: z.number().nullable().default(null),
  ap_courses:z.array(APCourseSchema).default([]),
  ib_courses:z.array(IBCourseSchema).default([]),
  alevel_courses:z.array(ALevelCourseSchema).default([]),
  ap_5_count: z.number().nullable().default(null),
  ap_4_count: z.number().nullable().default(null),
  ib_predicted: z.number().nullable().default(null),
  a_star_count: z.number().nullable().default(null),
  academic_rigor: z.enum(["highest","strong","average","unknown"]).default("unknown"),
  quantitative_preparation: z.enum(["strong","average","weak","unknown"]).default("unknown"),
  writing_preparation: z.enum(["strong","average","weak","unknown"]).default("unknown"),
  primary_major: z.string().nullable().default(null),
  secondary_major: z.string().nullable().default(null),
  intended_countries: z.array(z.enum(["us","uk","canada","singapore","hk","australia","europe"])).default(["us"]),
  aid_need: z.enum(["none","some","high","unknown"]).default("unknown"),
  school_preferences:z.array(SchoolPreferenceSchema).default([]),
  awards: z.array(AwardSchema).default([]),
  activities: z.array(ActivitySchema).default([]),
  distinctive_outputs: z.array(z.string()).default([]),
  essay_quality: z.enum(["unknown","average","good","excellent"]).default("unknown"),
  recommendation_quality: z.enum(["unknown","average","good","excellent"]).default("unknown"),
  profile_summary: z.string().default(""),
  uncertainties: z.array(z.string()).default([]),
});

export const AIHolisticSchema = z.object({
  academic_context: z.number().min(0).max(100),
  intellectual_vitality: z.number().min(0).max(100),
  activity_coherence: z.number().min(0).max(100),
  major_fit: z.number().min(0).max(100),
  course_major_alignment:z.number().min(0).max(100).default(70),
  project_major_alignment:z.number().min(0).max(100).default(70),
  interdisciplinary_fit:z.number().min(0).max(100).default(70),
  narrative_strength: z.number().min(0).max(100),
  execution_evidence: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  strengths: z.array(z.string()).max(6).default([]),
  gaps: z.array(z.string()).max(6).default([]),
  risk_flags: z.array(z.string()).max(6).default([]),
  rationale: z.string().default(""),
});

export const EmptyProfile = ApplicantProfileSchema.parse({});
