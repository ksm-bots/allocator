# LoneEddy Allocator — full frontend + backend handoff

This repository contains the complete website frontend and the Google Apps Script backend in one upload folder.

## Folder map

`client/` contains the React frontend. `apps-script/Code.gs` contains the backend that reads the `Group!A:J` input range and writes `Distribution`, `AssignedLog`, and `RightBalanceSummary`. `apps-script/DEPLOYMENT.md` contains the Google deployment instructions. `ideas.md` documents the visual system and product improvements.

The backend is intentionally kept in a separate `apps-script/` folder because Google Apps Script is deployed from the Apps Script editor, while the frontend is built with the Node/React project files. They are still delivered together in this repository so the full system has one source of truth.

## Connection chain

The connection is:

`LoneEddy frontend → deployed Apps Script /exec URL → Google Sheet 1EV8jc9Tb7E78HGcg7G3nRamrBNtaC1-wXoWuwJzWBUY`

The frontend accepts the deployed `/exec` URL in **Source & settings** and stores it in the browser for the next visit. It calls the backend with the `status` action to load stock counts and with the `allocateBatch` action to save an allocation. If no endpoint is configured, the website stays in **Review mode** and uses local demo values; it does not write to Google Sheets.

## Setup sequence

1. Upload the complete project folder to a new GitHub repository. Do not upload `node_modules/`, `dist/`, or `.manus-logs/`; they are generated or environment-specific.
2. In the correct Google account, open the target spreadsheet and go to **Extensions → Apps Script**.
3. Copy `apps-script/Code.gs` into the Apps Script editor, save, and deploy it as a Web app with **Execute as: Me**. Choose the narrowest access setting that allows the frontend to call it.
4. Copy the deployed web-app URL ending in `/exec`.
5. Open the LoneEddy frontend and paste the URL into **Source & settings → Frontend → Apps Script endpoint**. Click **Connect source**. A successful connection changes the top status from **Review mode** to **Live source** and refreshes the stock metrics.

## Contract

The frontend and backend use JSONP so a static frontend can call Apps Script without a separate server. The backend accepts `action=status` and `action=allocateBatch`. Allocation requests include seller `name`, `qty`, and `right3Limit`, plus `repeat`, `includeLeftover`, and `sheetName` settings.

## Safety

The backend opens the supplied spreadsheet by ID and does not seed ticket data. It reads existing `Group!A:J` values and only creates or refreshes output sheets when an allocation is explicitly run. Confirm the target spreadsheet and deployment access settings before using live mode.
