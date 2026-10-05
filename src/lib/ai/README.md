# GROWN. Intelligence (AI layer)

Not implemented in Milestone 1. This folder holds the contracts so the UI and
the server can be built against a stable shape.

Planned server-side entry points (Next.js Route Handlers):

- `POST /api/intelligence/analyze` — accepts `ProductAnalysisRequest`, returns
  `ProductAnalysisResponse`. Uses Claude with vision (image scans), text, and
  web search with citations (links/claims).

Rules:

- The Anthropic API key lives only in server environment variables.
- Responses are literacy, not diagnosis. Never prescribe; always cite.
- Associations, never causation, in anything that touches the user's own logs.
