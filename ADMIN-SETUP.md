# RSVP administration

Supabase project: weddinginvitation (`yyxnpryfwwjkfrsxtnxp`), Singapore.

The invitation at `/` accepts replies. `/admin.html` is the admin entry point.
Administrator setup is intentionally pending at the owner's request. No admin is currently authorized.

## Activate an administrator later

1. Ask the owner which email should manage guest replies. Create or invite that user through Supabase Authentication. The user must establish their own password through the supported Supabase flow; never commit a password or service key.
2. After verifying the intended user's identity, add their Auth user UUID to `public.wedding_admins` using the Supabase dashboard/authorized database tooling. Never add client-side admin enrollment.
3. Set `adminSetupPending` to `false` in `rsvp-config.js` and publish. This flag only controls UI; database RLS enforces authorization even if a visitor changes the JavaScript.
4. Verify that the intended user can log in at `/admin.html`, read replies, receive a new test reply through Realtime, update follow-up notes, and export CSV. Verify another authenticated user cannot read the data. Remove test replies afterwards.

## Behaviour

- Guests can insert only their reply fields. They cannot read or edit any saved replies or set admin notes/status.
- Client retries reuse a UUID. The browser stores only the UUID, a fingerprint and completion flag, not raw guest details. Repeat submissions from another browser are separate replies; the admin should review potential duplicates.
- Authenticated administrators can view replies and update follow-up status and internal notes. The dashboard uses realtime events plus a 15-second fallback refresh, and displays the last successful sync.
- Counts include only attending replies; declines have zero adults and children. Follow-up counts refer to replies, not people.
- Export includes the current filtered result; formula-like CSV cells are escaped. Guest-provided strings are rendered with textContent.
- Future admin authentication uses email/password with a session limited to the current tab. No public registration UI is provided.
- Only a publishable API key is shipped. Server keys are never needed by this static site.
- Supabase client 2.118.0 is pinned and vendored with its MIT license.

## Verification completed before release

Database transaction tests: guest insert, anonymous read/update denial, non-admin read denial, admin read/update, attendee totals and invalid counts. Transaction rolled back.
HTTP tests: insert 201, duplicate 409, anonymous read 401, invalid counts 400. Synthetic record removed.
JS syntax and asset checks passed. Supabase security advisor returned no findings. Full browser interaction and administrator login/realtime verification await admin activation.
