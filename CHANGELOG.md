# Changelog

## 2026-06-13

### Changed
- Moved the light/dark theme toggle into the account profile popover in the app header on desktop and mobile.

## 2026-05-15

### Added
- Debt person-ledger API/UI with grouped borrowed/lent summaries, exposure analytics, duplicate hints, and person-level quick actions.
- Debt update intents (`payment`, `promise`, `reminder`, `note`) plus reconciliation metadata and running-balance timeline output.
- Strict debt DTO validation and RESTful `PATCH /debts/:id`, `DELETE /debts/:id`, and `DELETE /debts/updates/:updateId` flows.

### Changed
- Debt page now separates person-ledger workflows from individual debt reconciliation.
- Institutional overdue logic now uses scheduled due dates, while P2P overdue logic uses reminder dates and payment inactivity.
- Debt form now auto-fills recent P2P account/category defaults when a known person is selected.

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
