# Handoff tasks

- [ ] Verify Google Sheets access for spreadsheet `1EV8jc9Tb7E78HGcg7G3nRamrBNtaC1-wXoWuwJzWBUY`.
- [ ] Inspect the target spreadsheet tabs and preserve existing data before making changes.
- [x] Test whether the spreadsheet is readable through a public, account-independent Sheets endpoint — access returned HTTP 401.
- [x] Prepare the exact Apps Script deployment handoff for the spreadsheet owner, targeting the supplied spreadsheet ID.
- [x] Prepare a GitHub-compatible ZIP/export fallback when GitHub connector login is unavailable.
- [ ] Deploy the Apps Script from the spreadsheet owner’s Google account and paste the `/exec` URL into the website.
- [ ] Create or push the GitHub repository from the user’s GitHub account.
- [ ] Verify the live integration after the user completes the account-dependent steps.
- [ ] Include the complete frontend project folder, not only a website-only ZIP.
- [ ] Include the Apps Script backend in the same GitHub upload package with a clear folder boundary.
- [ ] Document the connection chain: frontend endpoint field → Apps Script `/exec` deployment → target Google Sheet ID.
- [ ] Verify that the frontend payload names and backend `doGet` actions match before packaging.
