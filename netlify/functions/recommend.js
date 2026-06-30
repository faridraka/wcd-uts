exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { projectDesc, experience, goal } = JSON.parse(event.body || "{}");

    if (!projectDesc || projectDesc.trim().length < 10) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Deskripsi proyek minimal 10 karakter." }),
      };
    }

    if (experience === "" || Number(experience) < 0 || Number(experience) > 50) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Lama belajar coding harus berupa angka antara 0-50.",
        }),
      };
    }

    if (!goal) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Pilih tujuan utama." }),
      };
    }

    const systemPrompt = `You are a programming language advisor. Based on the user's project description, years of coding experience, and goal, recommend exactly 3 programming languages best suited for them. Respond ONLY with a valid JSON array (no markdown, no preamble), where each item has the keys: "language" (string), "reason" (string, max 25 words, in Bahasa Indonesia), and "fit" (one of "High", "Medium", "Low").`;

    const userPrompt = `Project description: ${projectDesc}
Years of coding experience: ${experience}
Goal: ${goal}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));

      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: errBody?.error?.message || "Failed to call OpenAI API",
        }),
      };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "[]";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const items = JSON.parse(cleaned);

    return {
      statusCode: 200,
      body: JSON.stringify({ items }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || "Internal server error",
      }),
    };
  }
};
