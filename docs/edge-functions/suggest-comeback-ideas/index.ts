// suggest-comeback-ideas — personalized brainstorm for the web funnel's
// comeback-song chat (/comeback1). Two modes:
//
//   POST { kind: "actions", pain }            → { categories: [{ title, ideas: string[] }] }  (3 × 3)
//   POST { kind: "dreams",  pain, actions }   → { ideas: string[] }                            (6)
//
// "actions" suggests concrete, realistic steps the user could take to climb
// out of what they vented; "dreams" suggests vivid best-case-scenario moments
// of their future life. Both are tailored to the user's own words. Modeled on
// analyze-dreams (Anthropic tool-forced JSON; same ANTHROPIC_API_KEY secret).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { kind, pain, actions } = await req.json();

    if (!pain || String(pain).trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No pain description provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const isActions = kind !== "dreams";

    const systemPrompt = isActions
      ? `You help people who are turning their lives around brainstorm concrete next steps.
Given what is hurting in someone's life (their own words), suggest realistic, doable actions THEY could take to climb out — specific to what they said, not generic self-help.
Group them into exactly 3 categories with short, punchy titles (2-4 words). 3 ideas per category.
Each idea: first person, starts with a verb, max 7 words, concrete enough to picture doing it.`
      : `You help people who are turning their lives around imagine their best-case future.
Given what is hurting in someone's life and the action plan they came up with (their own words), suggest vivid best-case-scenario MOMENTS of their future life — like scenes from a mind-movie, specific to them, not generic.
Each moment: first person, present tense, max 8 words, emotionally vivid.`;

    const userContent = isActions
      ? `What hurts right now, in their own words:\n\n"${pain}"\n\nSuggest the action ideas.`
      : `What hurts right now, in their own words:\n\n"${pain}"\n\nTheir plan to climb out:\n\n"${actions || ""}"\n\nSuggest the best-case-scenario moments.`;

    const tool = isActions
      ? {
          name: "suggest_actions",
          description: "Suggest 3 categories of concrete comeback actions, 3 ideas each",
          input_schema: {
            type: "object",
            properties: {
              categories: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Short category title (2-4 words)" },
                    ideas: {
                      type: "array",
                      items: { type: "string", description: "First person, starts with a verb, max 7 words" },
                      minItems: 3,
                      maxItems: 3,
                    },
                  },
                  required: ["title", "ideas"],
                  additionalProperties: false,
                },
                minItems: 3,
                maxItems: 3,
              },
            },
            required: ["categories"],
            additionalProperties: false,
          },
        }
      : {
          name: "suggest_dreams",
          description: "Suggest 6 vivid best-case-scenario moments of their future life",
          input_schema: {
            type: "object",
            properties: {
              ideas: {
                type: "array",
                items: { type: "string", description: "First person, present tense, max 8 words" },
                minItems: 6,
                maxItems: 6,
              },
            },
            required: ["ideas"],
            additionalProperties: false,
          },
        };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
        max_tokens: 1024,
        tools: [tool],
        tool_choice: { type: "tool", name: tool.name },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await response.text();
      console.error("Anthropic error:", response.status, errText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const toolUse = (data.content || []).find((b: { type: string }) => b.type === "tool_use");
    if (!toolUse?.input) {
      throw new Error("No tool output in response");
    }

    return new Response(JSON.stringify(toolUse.input), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("suggest-comeback-ideas error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
