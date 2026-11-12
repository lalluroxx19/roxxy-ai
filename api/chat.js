
const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash"
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

    let lastError = "All Gemini models are temporarily unavailable.";

    for (const model of MODELS) {
      // Try each model up to two times.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
              },
              body: JSON.stringify({
                system_instruction: {
                  parts: [{
                    text: `You are ROXXY AI, created by ROXXY.

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
Never reveal API keys, passwords or private server information.`
                  }]
                },
                contents: [{
                  role: "user",
                  parts: [{ text: message.trim() }]
                }]
              })
            }
          );

          const data = await response.json();

          if (response.ok) {
            const answer = data.candidates?.[0]?.content?.parts
              ?.map(part => part.text || "")
              .join("");

            if (answer) {
              return res.status(200).json({
                reply: answer,
                model: model
              });
            }

            lastError = "The AI returned an empty response.";
            break;
          }

          lastError = data.error?.message || "Gemini request failed.";

          // Retry or use another model for temporary capacity or quota errors.
          if (response.status === 429 || response.status === 503) {
            if (attempt === 0) {
              await sleep(1500);
              continue;
            }
            break;
          }

          // Don't hide permanent configuration or request errors.
          return res.status(response.status).json({
            error: lastError
          });

        } catch (error) {
          lastError = error.message || "Network error.";
          if (attempt === 0) {
            await sleep(1000);
            continue;
          }
        }
      }
    }

    return res.status(503).json({
      error: "All available AI models are busy or unavailable. Please try again shortly.",
      details: lastError
    });

  } catch (error) {
    console.error("ROXXY AI error:", error);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
}
