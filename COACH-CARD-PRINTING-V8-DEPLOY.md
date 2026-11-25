# All Club V8 — Coach barcode card printing

This pull request adds the **Cards & Printing** page for Coach/Admin accounts at Main and West Campus.

## What changes

- Coaches can select one member or a group from **their own campus**, issue a new member barcode, and download a printable wallet-card sheet.
- Coach controls: **Print one**, **Replace**, **Freeze**, **Unfreeze**, and **Mark lost**.
- Each barcode is a randomly generated Code 128 credential. No QR codes. The code is visible **only in the one-time print response**.
- **dev** also has a clearer "Print one member card" panel and dedicated "Print new" / "Replace & print" controls. That independent Dev enhancement has already been committed to `main`.

## REQUIRED: Supabase backend FIRST

The Coach Card Desk deliberately uses the **new** server operations `issueCards` and `cardStatus`. GitHub Pages cannot safely mint authorized cards alone.

1. Export a private bank backup and copy your currently deployed `allclub-secure` Edge Function into a private backup.
2. Deploy `02-EDGE-FUNCTION-V8.js` provided with the V8 installer ZIP in this chat to your EXISTING Supabase Edge Function **allclub-secure**. Keep JWT verification configuration unchanged and keep RLS enabled.
3. Verify normal Dev/Coach/Member logins still work and the function has no errors.
4. Merge this PR into `main`. Wait for Pages to deploy and refresh the campus site.
5. Coach → Cards & Printing → issue one Main Campus test card. Open the downloaded HTML file in your browser and print at **100% scale**.
6. Verify barcode login at the correct campus, freeze/revoke functionality, and a West Campus Coach cannot issue Main Campus cards.
7. Test replacement: previously issued codes must be rejected after replacement.

**Do not merge this before the Edge Function is updated.** Otherwise the new page cannot issue cards. Code 128 printed cards are bearer credentials—any person with a copy could sign in, so store print sheets privately and delete them when finished. No real money or sensitive student data.

### Permission architecture

The server requires a Coach session, enforces member campus, global/member feature locks, generates unique secrets, stores only token digests, and records non-secret audit events. A Coach cannot use a normal frontend request to issue another campus's cards.

This PR does not alter your database schema or rerun the SQL migration.