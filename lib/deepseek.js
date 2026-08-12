const ENDPOINT = "https://api.deepseek.com/chat/completions";

export function deepseekModelName() {
  return process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
}

function token() {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is not configured.");
  return process.env.DEEPSEEK_API_KEY;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function retryMessages(messages, json, forceFinal = false) {
  return [
    ...messages,
    {
      role: "system",
      content: json
        ? "Retry requirement: return one complete, non-empty JSON object only. Do not use markdown fences, commentary, or blank output. Ensure every array/object is fully closed and valid JSON."
        : forceFinal
          ? "Retry requirement: answer the user's request directly with a complete final answer. Do not return only hidden reasoning or an empty response."
          : "Retry requirement: return a complete, non-empty final answer."
    }
  ];
}

async function callDeepSeek(messages, options) {
  const body = {
    model: options.model || deepseekModelName(),
    messages,
    max_tokens: options.max_tokens ?? 3200,
    thinking: { type: options.thinking ? "enabled" : "disabled" },
    ...(options.thinking
      ? { reasoning_effort: options.reasoning_effort === "max" ? "max" : "high" }
      : { temperature: options.temperature ?? 0.15 }),
    ...(options.json ? { response_format: { type: "json_object" } } : {})
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout_ms ?? 70000);

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token()}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("DeepSeek request timed out.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const rawText = await response.text();
  let data = {};
  try { data = rawText ? JSON.parse(rawText) : {}; } catch { data = {}; }

  if (!response.ok) {
    const message = data?.error?.message || data?.message || rawText || `DeepSeek API error ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  const choice = data?.choices?.[0] || null;
  return {
    content: choice?.message?.content,
    reasoning: choice?.message?.reasoning_content,
    finishReason: choice?.finish_reason || null,
    model: data?.model || body.model,
    usage: data?.usage || null
  };
}

export async function deepseekChat(messages, options = {}) {
  const wantsJson = !!options.json;
  const requestedThinking = !!options.thinking && !wantsJson;

  // JSON extraction is intentionally always non-thinking. For normal chat, if
  // thinking consumes the entire token budget and produces no final content,
  // automatically retry once in non-thinking mode rather than surfacing an
  // empty answer to the user.
  const plan = wantsJson
    ? [
        { json: true, thinking: false, retry: false },
        { json: true, thinking: false, retry: true },
        { json: false, thinking: false, retry: true }
      ]
    : requestedThinking
      ? [
          { json: false, thinking: true, retry: false },
          { json: false, thinking: false, retry: true, forceFinal: true },
          { json: false, thinking: false, retry: true, forceFinal: true }
        ]
      : [
          { json: false, thinking: false, retry: false },
          { json: false, thinking: false, retry: true }
        ];

  let lastError;

  for (let attempt = 0; attempt < plan.length; attempt++) {
    const step = plan[attempt];
    try {
      const result = await callDeepSeek(
        step.retry ? retryMessages(messages, wantsJson, step.forceFinal) : messages,
        {
          ...options,
          json: step.json,
          thinking: step.thinking,
          max_tokens: step.thinking
            ? Math.max(options.max_tokens ?? 3200, 4200)
            : (options.max_tokens ?? 3200)
        }
      );

      if (typeof result.content === "string" && result.content.trim()) return result.content;

      lastError = new Error(
        `DeepSeek returned an empty response${result.finishReason ? ` (finish_reason: ${result.finishReason})` : ""}.`
      );
      console.warn("DeepSeek empty final content; retrying", {
        attempt: attempt + 1,
        model: result.model,
        jsonMode: step.json,
        thinking: step.thinking,
        finishReason: result.finishReason,
        hasReasoning: typeof result.reasoning === "string" && result.reasoning.length > 0,
        usage: result.usage
      });
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || 0);
      const msg = String(error?.message || "");

      if (status === 401 || status === 403) {
        throw new Error(`${msg}. Check DEEPSEEK_API_KEY.`);
      }
      if (status === 402) {
        throw new Error(`${msg}. DeepSeek account balance may be insufficient.`);
      }
      if (status === 429) {
        lastError = new Error(`${msg}. DeepSeek rate limit reached; retry shortly.`);
      }

      const nonRetryable = /API_KEY|balance|401|403|402/i.test(msg);
      if (nonRetryable) throw lastError;
    }

    if (attempt < plan.length - 1) await sleep(650 * (attempt + 1));
  }

  throw lastError || new Error("DeepSeek request failed.");
}

function normalizeJsonText(text) {
  return String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^\uFEFF/, "")
    .trim();
}

export function extractJson(text) {
  const cleaned = normalizeJsonText(text);
  try { return JSON.parse(cleaned); } catch {}

  const a = cleaned.indexOf("{");
  const b = cleaned.lastIndexOf("}");
  if (a >= 0 && b > a) {
    const sliced = cleaned.slice(a, b + 1);
    try { return JSON.parse(sliced); } catch {}

    // Conservative repair for a common model formatting mistake.
    const withoutTrailingCommas = sliced.replace(/,\s*([}\]])/g, "$1");
    try { return JSON.parse(withoutTrailingCommas); } catch {}
  }

  throw new Error("AI response was not valid JSON.");
}

export async function deepseekJson(messages, options = {}) {
  let lastError;
  let malformed = "";

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const requestMessages = attempt === 0
        ? messages
        : malformed
          ? [
              {
                role: "system",
                content: "Repair the supplied malformed JSON. Return exactly one complete valid JSON object only. Preserve the original facts; do not add new facts. Do not use markdown fences."
              },
              { role: "user", content: malformed.slice(0, 22000) }
            ]
          : retryMessages(messages, true);

      const out = await deepseekChat(requestMessages, {
        ...options,
        json: true,
        thinking: false,
        max_tokens: Math.max(options.max_tokens ?? 3200, attempt > 0 ? 4200 : 3200)
      });

      try {
        return extractJson(out);
      } catch (error) {
        malformed = out;
        lastError = error;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < 2) await sleep(500 * (attempt + 1));
  }

  throw lastError || new Error("AI JSON response could not be parsed.");
}
