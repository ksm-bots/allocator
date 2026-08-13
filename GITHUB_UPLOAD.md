# LoneEddy Allocator — full frontend + Apps Script handoff

This repository contains the React/Vite frontend and the Google Apps Script backend in one project.

## Folder map

- `client/` — React frontend
- `apps-script/Code.gs` — Google Apps Script backend
- `apps-script/DEPLOYMENT.md` — Apps Script deployment notes
- `CHECK_REPORT.md` — fixes and validation performed on this package

The connection is:

`LoneEddy frontend → deployed Apps Script /exec URL → Google Sheet 1EV8jc9Tb7E78HGcg7G3nRamrBNtaC1-wXoWuwJzWBUY`

## Frontend build

This is Vite/React source code and must be built before static hosting.

```bash
corepack enable
pnpm install
pnpm build
```

The static website is produced in:

```text
dist/public
```

`pnpm build` is intentionally frontend-only. If you are deploying to a Node host and also want the included Express server bundle, run:

```bash
pnpm build:full
pnpm start
```

The Vite configuration uses relative asset paths (`base: "./"`) so the built frontend is portable to subfolder/static hosting.

## Google Apps Script setup

1. Open the target Google Sheet with the account that owns/has access to it.
2. Open **Extensions → Apps Script**.
3. Replace the script with `apps-script/Code.gs` and save.
4. Deploy it as a Web app with **Execute as: Me** and an access level that allows the frontend to call it.
5. Copy the deployed URL ending in `/exec`.
6. Open the frontend, go to **Source & settings**, paste the `/exec` URL, and click **Connect source**.
7. The site now verifies the endpoint before showing **Live source**.

## Data contract

The backend reads valid six-digit ticket numbers from `Group!A:J`. It writes allocation output to the configured result sheet and writes logs/summary data to `AssignedLog` and `RightBalanceSummary`.

The protected sheets `Group`, `AssignedLog`, and `RightBalanceSummary` cannot be selected as the allocation result sheet.

The frontend/backend communicate with JSONP using:

- `action=status`
- `action=allocateBatch`

Allocation requests include seller `name`, `qty`, `right3Limit`, plus repeat/leftover/result-sheet options.

## Important behavior

Unique tickets are always preferred before repeats. If an exact Right-3 limit forces a new suffix cycle, the allocator still prefers tickets with the lowest global use count before repeating already-used tickets.
