
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { message } = req.body || {};

    // Validate message
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    if (message.length > 10000) {
      return res.status(400).json({
        error: "Message is too long."
      });
    }

    // Read API key securely from Vercel
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API key is not configured."
      });
    }

    // Connect to Gemini
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: `You are ROXXY AI, a smart and friendly personal AI assistant.

Your identity:
- Your name is ROXXY AI.
- You were created by ROXXY.
- You are helpful, intelligent, creative and professional.

Your capabilities:
- Answer general questions.
- Help with coding and website development.
- Help with business planning.
- Create marketing strategies.
- Help with social media content.
- Generate ideas and explanations.
- Assist with customer support messages.

Rules:
- Give clear and useful answers.
- Use simple language when possible.
- Be honest when you don't know something.
- Never claim to have performed an action you haven't performed.
- Do not reveal API keys or private server information.
- Format answers clearly with headings and lists when useful.`
              }
            ]
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: message
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    // Handle Gemini errors
    if (!response.ok) {
      console.error("Gemini API error:", data.error);

      return res.status(502).json({
        error:
          data.error?.message ||
          "Gemini could not process your request."
      });
    }

    // Extract AI response
    const answer = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("");

    if (!answer) {
      return res.status(502).json({
        error: "Gemini returned an empty response."
      });
    }

    return res.status(200).json({
      reply: answer
    });

  } catch (error) {
    console.error("ROXXY AI error:", error);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
}
