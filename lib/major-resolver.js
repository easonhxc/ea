import majors from "@/data/majors.json";

const bySlug = Object.fromEntries(majors.map(m => [m.slug, m]));

const clean = value => String(value ?? "")
  .normalize("NFKC")
  .trim()
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[／/|,，;；:：()（）\[\]{}]+/g, " ")
  .replace(/[-–—_]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const compact = value => clean(value).replace(/\s+/g, "");

const ALIASES = [
  ["materials_engineering", ["materials science and engineering", "materials science", "material science", "materials engineering", "material engineering", "mse", "材料科学与工程", "材料科学", "材料工程", "材料学"]],
  ["environmental_engineering", ["environmental engineering", "environment engineering", "环境工程", "环境科学与工程"]],
  ["environmental_science", ["environmental science", "environment studies", "环境科学", "环境研究"]],
  ["computer_science", ["computer science", "cs", "计算机科学", "计算机", "计算机科学与技术"]],
  ["artificial_intelligence", ["artificial intelligence", "machine intelligence", "ai", "人工智能"]],
  ["data_science", ["data science", "数据科学", "数据科学与大数据技术"]],
  ["computer_engineering", ["computer engineering", "计算机工程"]],
  ["electrical_engineering", ["electrical engineering", "electrical and electronic engineering", "electronic engineering", "电子工程", "电气工程", "电子电气工程", "电气与电子工程"]],
  ["mechanical_engineering", ["mechanical engineering", "机械工程", "机械工程及自动化"]],
  ["aerospace_engineering", ["aerospace engineering", "aeronautical engineering", "航空航天工程", "航空工程"]],
  ["biomedical_engineering", ["biomedical engineering", "bme", "生物医学工程"]],
  ["bioengineering", ["bioengineering", "biological engineering", "生物工程"]],
  ["chemical_engineering", ["chemical engineering", "化学工程", "化工"]],
  ["civil_engineering", ["civil engineering", "土木工程"]],
  ["industrial_engineering", ["industrial engineering", "工业工程"]],
  ["robotics", ["robotics", "robotics engineering", "机器人", "机器人工程"]],
  ["energy_engineering", ["energy engineering", "能源工程", "新能源工程"]],
  ["nanotechnology", ["nanotechnology", "nanoscience", "纳米技术", "纳米科学"]],
  ["engineering_physics", ["engineering physics", "工程物理"]],
  ["physics", ["physics", "物理", "物理学"]],
  ["chemistry", ["chemistry", "化学"]],
  ["biology", ["biology", "biological science", "生物", "生物学", "生命科学"]],
  ["biochemistry", ["biochemistry", "生物化学"]],
  ["molecular_biology", ["molecular biology", "分子生物学"]],
  ["neuroscience", ["neuroscience", "神经科学"]],
  ["cognitive_science", ["cognitive science", "认知科学"]],
  ["public_health", ["public health", "公共卫生"]],
  ["mathematics", ["mathematics", "math", "数学", "数学系"]],
  ["applied_mathematics", ["applied mathematics", "应用数学"]],
  ["statistics", ["statistics", "统计", "统计学"]],
  ["economics", ["economics", "econ", "经济", "经济学"]],
  ["finance", ["finance", "金融", "金融学"]],
  ["business_administration", ["business administration", "business", "management", "工商管理", "商科", "商业管理"]],
  ["accounting", ["accounting", "会计", "会计学"]],
  ["psychology", ["psychology", "心理学", "心理"]],
  ["political_science", ["political science", "politics", "政治学", "政治科学"]],
  ["international_relations", ["international relations", "international studies", "国际关系", "国际事务"]],
  ["sociology", ["sociology", "社会学"]],
  ["anthropology", ["anthropology", "人类学"]],
  ["communication", ["communication", "communications", "传播学", "传媒"]],
  ["journalism", ["journalism", "新闻学", "新闻"]],
  ["public_policy", ["public policy", "公共政策"]],
  ["history", ["history", "历史", "历史学"]],
  ["philosophy", ["philosophy", "哲学"]],
  ["english", ["english literature", "english", "英语文学", "英文", "英语"]],
  ["linguistics", ["linguistics", "语言学"]],
  ["architecture", ["architecture", "建筑学", "建筑"]],
  ["film", ["film", "cinema", "电影", "影视"]],
  ["music", ["music", "音乐", "音乐学"]],
  ["art_history", ["art history", "艺术史"]],
  ["earth_science", ["earth science", "geoscience", "地球科学"]],
  ["geology", ["geology", "地质学", "地质"]],
  ["oceanography", ["oceanography", "海洋学", "海洋科学"]],
  ["atmospheric_science", ["atmospheric science", "大气科学"]],
  ["marine_biology", ["marine biology", "海洋生物学"]],
  ["nutrition", ["nutrition", "营养学"]],
  ["nursing", ["nursing", "护理学", "护理"]],
  ["education", ["education", "教育学", "教育"]],
  ["urban_studies", ["urban studies", "城市研究"]],
  ["geography", ["geography", "地理", "地理学"]],
  ["ppe", ["ppe", "philosophy politics and economics", "哲学政治经济", "哲政经"]],
];

const aliasRows = ALIASES.flatMap(([slug, aliases]) => aliases.map(alias => ({ slug, alias, compact: compact(alias) })));

function tokenSet(value) {
  return new Set(clean(value).split(" ").filter(x => x.length > 1));
}

function jaccard(a, b) {
  const A = tokenSet(a), B = tokenSet(b);
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  for (const x of A) if (B.has(x)) intersection++;
  return intersection / (A.size + B.size - intersection);
}

export function resolveMajor(value) {
  const original = String(value ?? "").trim();
  if (!original) return { slug: null, label: null, category: "other", matched: false, method: "empty", confidence: 0, original };
  const q = clean(original), qc = compact(original);

  const exactSlug = bySlug[original] || bySlug[original.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")];
  if (exactSlug) return { ...exactSlug, matched: true, method: "slug", confidence: 1, original };

  const exactLabel = majors.find(m => clean(m.label) === q);
  if (exactLabel) return { ...exactLabel, matched: true, method: "label", confidence: 1, original };

  const aliasExact = aliasRows.find(a => a.compact === qc);
  if (aliasExact && bySlug[aliasExact.slug]) return { ...bySlug[aliasExact.slug], matched: true, method: "alias", confidence: .98, original };

  const aliasContains = aliasRows
    .filter(a => a.compact.length >= 2 && (qc.includes(a.compact) || a.compact.includes(qc)))
    .sort((a, b) => b.compact.length - a.compact.length)[0];
  if (aliasContains && bySlug[aliasContains.slug]) return { ...bySlug[aliasContains.slug], matched: true, method: "alias_contains", confidence: .92, original };

  let best = null;
  for (const m of majors) {
    const score = Math.max(jaccard(q, m.label), jaccard(q, m.slug.replaceAll("_", " ")));
    if (!best || score > best.score) best = { major: m, score };
  }
  if (best && best.score >= .60) return { ...best.major, matched: true, method: "fuzzy", confidence: Math.min(.9, best.score), original };

  return { slug: null, label: original, category: "other", matched: false, method: "unresolved", confidence: 0, original };
}

export function canonicalMajorLabel(value) {
  const r = resolveMajor(value);
  return r.matched ? r.label : (String(value ?? "").trim() || null);
}

export function majorCategory(value) {
  return resolveMajor(value).category || "other";
}

export function majorCatalog() {
  return majors;
}
