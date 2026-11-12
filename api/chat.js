
const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite"
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const SYSTEM_PROMPT = `You are ROXXY AI, created by ROXXY.

You are a helpful, intelligent and friendly personal AI assistant.

Help users with:
- General questions and explanations
- Website development and coding
- Business planning and ideas
- Marketing and social media
- Customer support
- Creativity and productivity

Give accurate, clear and useful answers.
Use headings and lists when helpful.
Be honest about your limitations.
Never claim to have performed actions you did not perform.
Never reveal API keys, passwords or private server information.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { message } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Please enter a message." });
    }

    if (message.length > 10000) {
      return res.status(400).json({ error: "Message is too long." });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API key is not configured in Vercel."
      });
    }

    let lastError = "All AI models are temporarily unavailable.";

    for (const model of MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 25000);

          let response;

          try {
            response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-goog-api-key": apiKey
                },
                body: JSON.stringify({
                  system_instruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                  },
                  contents: [{
                    role: "user",
                    parts: [{ text: message.trim() }]
                  }]
                }),
                signal: controller.signal
              }
            );
          } finally {
            clearTimeout(timeout);
          }

          const data = await response.json().catch(() => ({}));

          if (response.ok) {
            const answer = data.candidates?.[0]?.content?.parts
              ?.map(part => part.text || "")
              .join("")
              .trim();

            if (answer) {
              return res.status(200).json({
                reply: answer,
                model
              });
            }

            lastError = "The AI returned an empty response.";
            break;
          }

          lastError = data.error?.message || `Gemini returned ${response.status}.`;

          const temporaryError =
            response.status === 429 ||
            response.status === 500 ||
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504;

          if (temporaryError) {
            if (attempt === 0) {
              const retryAfter = Number(response.headers.get("retry-after"));
              const delay = Number.isFinite(retryAfter) && retryAfter > 0
                ? Math.min(retryAfter * 1000, 10000)
                : 2000;

              await sleep(delay);
              continue;
            }

            break;
          }

          return res.status(response.status).json({
            error: lastError
          });

        } catch (error) {
          lastError = error.name === "AbortError"
            ? "Gemini request timed out."
            : error.message || "Network error.";

          if (attempt === 0) {
            await sleep(2000);
            continue;
          }
        }
      }
    }

    return res.status(503).json({
      error: "ROXXY AI is temporarily busy. Please try again in a few seconds.",
      details: lastError
    });

  } catch (error) {
    console.error("ROXXY AI error:", error);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
}
