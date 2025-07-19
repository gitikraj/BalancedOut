// lib/callDeepSeekViaOpenRouter.js

export async function callDeepSeekViaOpenRouter(prompt, apiKey) {
  if (!apiKey) throw new Error("Missing OpenRouter API Key");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-r1:free",
      messages: [
        {
          role: "system",
          content: "You are a financial analyst. Format response as HTML for email.",
        },
        {
          role: "user",
          content: prompt,
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData?.error?.message || "DeepSeek API call failed");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response from DeepSeek";
}
