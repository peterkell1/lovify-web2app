# Edge functions used by the web funnel (deploy to the Lovify Supabase project)

The funnel front end calls Supabase Edge Functions that live in the main
`lovifymusic` repo. New functions authored from this repo are staged here for
deployment (source of truth should move to `lovifymusic/supabase/functions/`).

## suggest-comeback-ideas

Personalized brainstorm for the /comeback1 song chat ("Need a few ideas?" /
"Help me imagine it"). Uses the project's existing `ANTHROPIC_API_KEY` secret.

API:
- `POST { kind: "actions", pain }`          → `{ categories: [{ title, ideas: string[] }] }` (3×3)
- `POST { kind: "dreams", pain, actions }`  → `{ ideas: string[] }` (6)

Deploy (from a checkout containing `supabase/functions/suggest-comeback-ideas/`):

```bash
supabase functions deploy suggest-comeback-ideas --project-ref pqjqurjdujwforscefov
```

Until deployed, the funnel silently falls back to its built-in categorized
idea banks — nothing breaks.
