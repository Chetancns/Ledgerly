# Changelog

## 2026-05-09

### Added
- AI draft review-save workflow for receipt and audio parsing (`preview=true` parse + explicit `/ai/save-transactions`).
- AI confidence and needs-review metadata in parse responses.
- Recoverable parse failure responses with retry fallback prompt behavior.
- OpenAI Vision-based receipt parsing path in backend AI service.
- AI budget suggestions endpoint: `GET /budgets/ai-suggestions`.
- Conversational financial Q&A endpoint: `POST /ai/chat` and new frontend page `/ai-chat`.
- Budgets page first-setup CTA to load/apply AI budget suggestions.

### Changed
- Upload receipt/audio UX now supports inline confirm/edit before final save.
- Docs updated for new AI endpoints and preview/save flow.
