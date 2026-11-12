
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
      "https://generativelanguage.googleapis.com/v1beta/auth_tokens",
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
            model: "models/gemini-3.8-live"
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

    if (!data.name) {
      return res.status(500).json({
        error: "Gemini did not return an authentication token."
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
