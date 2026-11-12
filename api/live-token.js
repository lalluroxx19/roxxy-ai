
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1alpha/auth_tokens",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          uses: 1,
          expireTime: new Date(
            Date.now() + 30 * 60 * 1000
          ).toISOString(),
          newSessionExpireTime: new Date(
            Date.now() + 60 * 1000
          ).toISOString(),
          liveConnectConstraints: {
            model: "models/gemini-3.8-live",
            config: {
              responseModalities: ["AUDIO"],
              systemInstruction: {
                parts: [{
                  text: `You are ROXXY AI, created by ROXXY.
You are a friendly, intelligent voice assistant.
Speak naturally and keep replies conversational.
Understand and respond in English or Telugu.
Help with coding, business, marketing, creativity
and general questions.
Never reveal API keys or private information.`
                }]
              }
            }
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini token error:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Token creation failed."
      });
    }

    return res.status(200).json({
      token: data.name
    });

  } catch (error) {
    console.error("Voice token error:", error);

    return res.status(500).json({
      error: "Could not create voice session."
    });
  }
}
