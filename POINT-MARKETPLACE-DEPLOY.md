# Point Marketplace V6 — staged deployment

This is a **staged, reviewable update** for the All Club fictional banking simulator. Do **not merge** this branch until the corresponding Supabase Edge Function update is deployed and tested.

## New functionality

- `dev` → **Point Marketplace**: add/edit reward descriptions and point prices, select campus eligibility, set limited or unlimited stock, pause rewards, see pending requests, and mark rewards delivered.
- Main and West Campus member rewards screens display the custom catalog and redemption history.
- The existing fictional-dollar marketplace remains separate.

## Required Supabase change

The Edge Function must be updated **before merging this branch**. Use the `supabase/02-EDGE-FUNCTION.js` inside the downloadable package named `all-club-v6-point-marketplace.zip` from the conversation, and deploy it to your existing `allclub-secure` function. Do not upload SQL migrations or secrets into GitHub. The updated server validates point costs, stock and campus eligibility and records redemptions.

## Test before merging

1. Back up the fictional bank data and the current Edge Function.
2. Deploy the matching Edge Function and verify existing member, Coach and developer sign-in.
3. As dev, create a 25-point limited-stock Main Campus reward.
4. Confirm Main Campus sees it, West Campus does not.
5. Redeem once; verify the member's points decrease, stock decreases, and dev sees a pending redemption.
6. Mark it delivered and verify the updated status appears for the member.
7. Freeze the reward and check it is no longer redeemable.
8. Test old built-in rewards, both campus banking pages and feature locks.
9. Merge this branch only after the checks pass.

These are fictional rewards. Do not enter real financial or sensitive student information.
