/**
 * llmClient.js
 *
 * Small wrapper around the configured LLM provider.
 *
 * The rest of the application should call callLLMJson()
 * instead of talking to the provider directly.
 */

async function callLLMJson({ system, user }) {
  const provider = (process.env.LLM_PROVIDER || "").toLowerCase();

  if (!provider) {
    return {
      ok: false,
      reason: "LLM_PROVIDER is not configured.",
    };
  }

  if (!process.env.LLM_API_KEY) {
    return {
      ok: false,
      reason: "LLM_API_KEY is not configured.",
    };
  }

  try {
    if (provider === "openai") {
      return await callOpenAI({ system, user });
    }

    return {
      ok: false,
      reason: `Unsupported LLM provider: ${provider}`,
    };
  } catch (error) {
    console.error("LLM request error:", error.message);

    return {
      ok: false,
      reason: error.message || "LLM request failed.",
    };
  }
}

async function callOpenAI({ system, user }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: system,
        },
        {
          role: "user",
          content: user,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    return {
      ok: false,
      reason: `LLM provider returned HTTP ${response.status}: ${errorText.slice(
        0,
        300
      )}`,
    };
  }

  const data = await response.json();

  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    return {
      ok: false,
      reason: "LLM returned an empty response.",
    };
  }

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      ok: false,
      reason: "LLM returned invalid JSON.",
    };
  }

  return {
    ok: true,
    data: parsed,
  };
}

module.exports = {
  callLLMJson,
};

