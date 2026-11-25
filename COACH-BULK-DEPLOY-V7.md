# Coach bulk deposits — required deployment step

The Coach UI is staged here, not yet live. **Do not merge before the Supabase server is updated.**

## Supabase first
1. Back up your fictional bank state, and save the current allclub-secure function code.
2. Download the V7 Bulk + iPad ZIP from the ChatGPT conversation.
3. Supabase Dashboard → Edge Functions → allclub-secure → Code.
4. Replace that function with `supabase/02-EDGE-FUNCTION.js` from the V7 ZIP and deploy.
5. Keep V6 Row Level Security enabled. Do not rerun the SQL migration.
6. Check existing member, Coach and dev login. Confirm a Banker deposit works.

## Then merge this PR
1. Merge and let GitHub Pages finish publishing.
2. Coach Portal → Bulk Deposits: select test members, choose $1, confirm.
3. Check that ONLY the assigned campus received deposits.
4. Check member balances, ledger history, notifications and Coach action logs.
5. Lock deposits for a test member in dev and confirm the server rejects the Coach bulk request.

Developer bulk deposits and iPad scanner improvements were independently committed to the main branch.

This project uses fictional money and is not suitable for sensitive student information.
