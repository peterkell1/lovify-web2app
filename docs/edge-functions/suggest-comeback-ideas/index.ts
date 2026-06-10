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
    const { kind, pain, actions, dream } = await req.json();

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

    const isVisions = kind === "visions";
    const isActions = !isVisions && kind !== "dreams";

    const visionsSystemPrompt = `You help people who are turning their lives around SEE their best-case future.
Given what hurts, their action plan, and their dream (their own words), create 4 vision-image options of THEM living that future — each a specific, concrete scene tied directly to what they said (their relationship, their body, their work, their family — whatever THEY named). The dream side only, never the pain.
For each: a single fitting emoji; a short user-facing title (max 7 words, first person feel, e.g. "Date night, laughing like we used to"); and an image-generation prompt written as "as myself …" describing them in that scene — photorealistic, cinematic, warm golden light, emotionally specific.`;

    const systemPrompt = isVisions ? visionsSystemPrompt : isActions
      ? `You help people see the version of themselves who ALREADY lives their dream life.
Given what hurts now and the dream they want (their own words), describe that best version of them:
1. traits — 5 short personality/character traits that version embodies (1-3 words each, e.g. "Calm under pressure", "Disciplined", "Playful with her") — specific to their situation, never generic filler.
2. actions — 5 things that version does on a consistent basis (verb-first, max 7 words, concrete enough to picture, tied directly to the pains and dreams they named).`
      : `You are a wise, warm friend helping someone turn their life around. Read their words CAREFULLY — they just vented what hurts.

Reply with two things:

1. reflection — 1-2 short sentences that prove you truly HEARD them: mirror their specific situation back with warmth, in plain conversational language. No platitudes, no diagnoses, no claims their words don't support. End by pointing forward.

2. ideas — 6 vivid best-case-scenario MOMENTS of their future life with those pains gone — like scenes from a mind-movie, specific to what THEY named, not generic. Each: first person, present tense, max 8 words, emotionally vivid.`;

    const userContent = isVisions
      ? `What hurts right now, in their own words:\n\n"${pain}"\n\nTheir plan to climb out:\n\n"${actions || ""}"\n\nTheir dream life, in their own words:\n\n"${dream || ""}"\n\nCreate the 4 vision options.`
      : isActions
      ? `What hurts right now, in their own words:\n\n"${pain}"\n\nThe dream life they want, in their own words:\n\n"${dream || ""}"\n\nDescribe the traits and consistent actions of the version of them who already lives that dream.`
      : `What hurts right now, in their own words:\n\n"${pain}"\n\nReply with the reflection and the best-case-scenario moments.`;

    const visionsTool = {
      name: "suggest_visions",
      description: "Create 4 personalized vision-image options of their dream future",
      input_schema: {
        type: "object",
        properties: {
          visions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                emoji: { type: "string", description: "Single fitting emoji" },
                title: { type: "string", description: "Short user-facing title, max 7 words" },
                prompt: { type: "string", description: 'Image prompt starting "as myself", photorealistic, cinematic, specific to their dream' },
              },
              required: ["emoji", "title", "prompt"],
              additionalProperties: false,
            },
            minItems: 4,
            maxItems: 4,
          },
        },
        required: ["visions"],
        additionalProperties: false,
      },
    };

    const tool = isVisions
      ? visionsTool
      : isActions
      ? {
          name: "suggest_actions",
          description: "Describe the best version of them: 5 character traits + 5 consistent daily actions",
          input_schema: {
            type: "object",
            properties: {
              traits: {
                type: "array",
                items: { type: "string", description: "Short personality/character trait, 1-3 words, specific to their situation" },
                minItems: 5,
                maxItems: 5,
              },
              actions: {
                type: "array",
                items: { type: "string", description: "Verb-first consistent action, max 7 words, tied to what they said" },
                minItems: 5,
                maxItems: 5,
              },
            },
            required: ["traits", "actions"],
            additionalProperties: false,
          },
        }
      : {
          name: "suggest_dreams",
          description: "Reflect what was heard, then suggest 6 vivid best-case-scenario moments of their future life",
          input_schema: {
            type: "object",
            properties: {
              reflection: {
                type: "string",
                description: "1-2 warm conversational sentences mirroring their specific situation, ending pointed forward. No platitudes.",
              },
              ideas: {
                type: "array",
                items: { type: "string", description: "First person, present tense, max 8 words" },
                minItems: 6,
                maxItems: 6,
              },
            },
            required: ["reflection", "ideas"],
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
