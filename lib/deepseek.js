const ENDPOINT = "https://api.deepseek.com/chat/completions";

export function deepseekModelName() {
  return process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
}

function token() {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is not configured.");
  return process.env.DEEPSEEK_API_KEY;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function retryMessages(messages, json) {
  if (!json) return messages;
  return [
    ...messages,
    {
      role: "system",
      content: "Retry requirement: return one complete, non-empty JSON object only. Do not use markdown fences, commentary, or blank output."
    }
  ];
}

export async function deepseekChat(messages, options = {}) {
  const wantsJson = !!options.json;
  const wantsThinking = !!options.thinking;
  const attempts = wantsJson ? 3 : 2;
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const useJsonMode = wantsJson && attempt < 2;
      const body = {
        model: options.model || deepseekModelName(),
        messages: attempt === 0 ? messages : retryMessages(messages, wantsJson),
        max_tokens: options.max_tokens ?? 3200,
        thinking: { type: wantsThinking ? "enabled" : "disabled" },
        ...(wantsThinking
          ? { reasoning_effort: options.reasoning_effort === "max" ? "max" : "high" }
          : { temperature: options.temperature ?? 0.15 }),
        ...(useJsonMode ? { response_format: { type: "json_object" } } : {})
      };

      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token()}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(body),
        cache: "no-store"
      });

      const rawText = await response.text();
      let data = {};
      try { data = rawText ? JSON.parse(rawText) : {}; } catch { data = {}; }

      if (!response.ok) {
        const message = data?.error?.message || data?.message || rawText || `DeepSeek API error ${response.status}`;
        if (response.status === 401 || response.status === 403) throw new Error(`${message}. Check DEEPSEEK_API_KEY.`);
        if (response.status === 402) throw new Error(`${message}. DeepSeek account balance may be insufficient.`);
        if (response.status === 429) {
          lastError = new Error(`${message}. DeepSeek rate limit reached; retry shortly.`);
          if (attempt < attempts - 1) { await sleep(700 * (attempt + 1)); continue; }
          throw lastError;
        }
        if (response.status >= 500 && attempt < attempts - 1) {
          lastError = new Error(message);
          await sleep(700 * (attempt + 1));
          continue;
        }
        throw new Error(message);
      }

      const choice = data?.choices?.[0];
      const content = choice?.message?.content;
      if (typeof content === "string" && content.trim()) return content;

      lastError = new Error(
        `DeepSeek returned an empty response${choice?.finish_reason ? ` (finish_reason: ${choice.finish_reason})` : ""}.`
      );
      console.warn("DeepSeek empty response; retrying", {
        attempt: attempt + 1,
        model: body.model,
        jsonMode: useJsonMode,
        finishReason: choice?.finish_reason || null,
        hasReasoning: !!choice?.message?.reasoning_content
      });

      if (attempt < attempts - 1) {
        await sleep(500 * (attempt + 1));
        continue;
      }
    } catch (error) {
      lastError = error;
      const msg = String(error?.message || "");
      const nonRetryable = /API_KEY|balance|401|403|402/i.test(msg);
      if (nonRetryable || attempt >= attempts - 1) throw error;
      await sleep(600 * (attempt + 1));
    }
  }

  throw lastError || new Error("DeepSeek request failed.");
}

export function extractJson(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try { return JSON.parse(cleaned); } catch {}
  const a = cleaned.indexOf("{");
  const b = cleaned.lastIndexOf("}");
  if (a >= 0 && b > a) return JSON.parse(cleaned.slice(a, b + 1));
  throw new Error("AI response was not valid JSON.");
}
