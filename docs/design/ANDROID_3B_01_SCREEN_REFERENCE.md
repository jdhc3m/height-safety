# Android 3B-01 screen reference

Brilliant handoff for the bounded inspector sign-in and eligible-job list
slice. The implementation source is
`apps/android/app/src/main/kotlin/au/com/heightsafety/app/FieldScreen.kt`.
Android Studio preview entry points for these frames are in
`apps/android/app/src/main/kotlin/au/com/heightsafety/app/FieldScreenPreviews.kt`.
The debug APK also exposes a static emulator gallery through
`au.com.heightsafety.app.ReferenceActivity`.

## State flow

```text
Signed out
    -> Signing in
        -> Loading jobs
            -> Jobs loaded
            -> Empty jobs
            -> Sync error -> Retry -> Loading jobs
        -> Sign-in error -> Retry/sign in again
        -> Session expired -> Signed out
    -> Sign out -> Signed out
```

## Frames

| Frame | Visible content | Primary action |
| --- | --- | --- |
| Signed out | Height Safety, Inspector sign-in, Company ID, Sign in, provider-neutral note | Enter company ID; sign in |
| Signing in | Sign-in form with disabled controls and progress indicator | Wait for provider/session result |
| Sign-in error | Form plus clear error, such as provider not configured or access required | Retry when offered; correct company ID or sign in again |
| Loading jobs | Inspector Jobs header, signed-in email/company, progress indicator, “Syncing jobs” | Wait for job sync |
| Jobs loaded | Job cards with reference, explicit jurisdiction, status, job pack version, assignment and planned date | Select a future job action |
| Empty jobs | Account context, “No eligible jobs”, synchronised state and refresh action | Refresh jobs |
| Sync error | Account context, failed sync state, error message and Retry | Retry sync |
| Session expired | Session-expiry message and sign-in form | Sign in again |
| Signed out after sign-out | Clean sign-in form; in-memory session cleared | Sign in |

## Frame annotations

- The API/session boundary, not the UI, authorises access.
- Visible jobs are restricted to the authenticated inspector’s company and
  role; released jobs or the inspector’s primary assignment are eligible.
- An unauthorised job is denied/omitted. There is no UI claim that a hidden job
  exists.
- Jurisdiction is displayed as the recorded NSW or Queensland value. It does
  not imply legal rules, compliance, certification or professional approval.
- Status, assignment and job pack version are displayed as recorded values.
- Session credentials are memory-only in this slice; provider selection,
  durable session storage and production deployment configuration remain open.

## Brilliant handoff checklist

Create one frame per state above, plus these interaction notes:

1. Sign-in success transitions through loading to loaded, empty or sync error.
2. Sign-out returns to Signed out and clears local session state.
3. Expired or revoked sessions return to Session expired and require sign-in.
4. Same-company inspector visibility is the only positive list case; other
   companies, other inspectors and non-inspector roles must not appear.

Brilliant is not connected in the current agent workspace. This file is the
reference artifact until a Brilliant workspace or connector is provided. For
local emulator review, launch the debug-only gallery with:

```sh
adb -s emulator-5554 shell am start -n au.com.heightsafety.app/.ReferenceActivity
```
