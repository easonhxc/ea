const ENDPOINT = "https://models.github.ai/inference/chat/completions";

export function githubModelName() {
  return process.env.GITHUB_MODEL || "deepseek/DeepSeek-V3-0324";
}

function token() {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is not configured.");
  }
  return process.env.GITHUB_TOKEN;
}

export async function githubChat(messages, options = {}) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token()}`,
      "X-GitHub-Api-Version": "2026-03-10",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: githubModelName(),
      messages,
      temperature: options.temperature ?? 0.15,
      max_tokens: options.max_tokens ?? 3500,
    }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || data?.error?.message || `GitHub Models error ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      throw new Error(`${message}. Check that GITHUB_TOKEN has models: read permission.`);
    }
    if (response.status === 429) {
      throw new Error(`${message}. GitHub Models free-tier rate limit reached; try again later.`);
    }
    throw new Error(message);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("GitHub Models returned an empty response.");
  return content;
}

export function extractJson(text) {
  let cleaned = String(text || "").trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try { return JSON.parse(cleaned); } catch {}
  const a = cleaned.indexOf("{"), b = cleaned.lastIndexOf("}");
  if (a >= 0 && b > a) return JSON.parse(cleaned.slice(a, b + 1));
  throw new Error("AI response was not valid JSON.");
}
