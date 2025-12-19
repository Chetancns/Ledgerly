# Frontend Updates Needed

## Changes to EnhancedDebtForm.tsx

1. Add state for:
   - `createTransaction` (checkbox)
   - `categoryId` (when creating transaction)
   - `categories` (load from API)

2. Add UI elements after Account field:
   - Checkbox: "Create Transaction Now?"
   - If checked, show category selector
   - Help text explaining when transaction is created

3. Update form submission payload to include:
   - `createTransaction: form.createTransaction ? 'yes' : 'no'`
   - `categoryId: form.categoryId`

## Changes to EnhancedDebtList.tsx

1. Add delete button with confirmation modal
2. Add edit button (can use existing updateDebt)
3. Add "Settlement Groups" view/tab
4. Show settlement group ID in debt cards if present

## New Component: Settlement Groups Manager

Create component to:
- List all settlement groups
- Show total pending per group
- View/manage debts in each group
- Quick actions to settle entire group

## Files to update:
- ledgerly_app/src/components/EnhancedDebtForm.tsx
- ledgerly_app/src/components/EnhancedDebtList.tsx
- ledgerly_app/src/services/categories.ts (if not exists, add getCategories)
