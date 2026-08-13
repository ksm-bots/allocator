# LoneEddy Allocator — check & repair report

Checked: 2026-08-13

## Fixed

1. **Repeat-cycle allocation bug**
   - The old repeat phase could reuse an already assigned ticket even while another unused ticket was still available after a Right-3 cycle reset.
   - Repeat mode now prioritizes the lowest global ticket use count, so unused tickets are exhausted before repeats.
   - `uniqueUsed`, `repeatTotal`, and `leftoverQty` now remain consistent.

2. **Live frontend result identity/type mismatch**
   - Apps Script results do not include the React seller `id` or `notes` fields.
   - The frontend now normalizes live results and restores stable seller IDs/notes before rendering.
   - Live `right3Limit` values are normalized to strings so CSV output correctly shows `AUTO` for zero.

3. **Dangerous result-sheet overwrite**
   - A user-entered result sheet named `Group`, `AssignedLog`, or `RightBalanceSummary` could previously overwrite/clear a protected sheet.
   - Result sheet names are now validated in Apps Script before any output write.

4. **Saved Apps Script endpoint status**
   - The UI previously showed `Live source` immediately just because a URL existed in local storage.
   - It now checks the saved endpoint first and only shows live status after a successful response.

5. **Manus-only runtime/storage dependencies removed from the app configuration**
   - The frontend no longer depends on `/manus-storage/...` image URLs.
   - The missing mark/hero assets were replaced by portable CSS/HTML visuals.
   - Manus-specific Vite plugins were removed from `vite.config.ts` and from the direct package importer list.

6. **Portable Vite output**
   - `base: "./"` is configured so built assets use relative paths, which is safer for subfolder/static hosting.
   - The unresolved analytics placeholder script was removed.
   - `pnpm build` now builds the static frontend only.
   - `pnpm build:full` remains available when a bundled Node server is also needed.

## Checks completed

- TypeScript/TSX syntax parse: **PASS** (69 files)
- Apps Script JavaScript syntax: **PASS**
- Package JSON syntax: **PASS**
- Allocation regression: Right-3 cycle with unused stock: **PASS**
- Allocation regression: 20 unique tickets / demand 30: **PASS** (`20 unique`, `10 repeat`, `0 leftover`)
- Protected `Group` output sheet rejection: **PASS**

## Environment limitation

A complete Vite dependency install/build could not be executed in the checking environment because outbound access to the npm registry was unavailable. The source syntax, package consistency changes, and allocator logic were checked locally without network access.

## Deployment note

This repository contains Vite/React source code. A browser cannot run the `.tsx` source directly as a plain GitHub Pages folder; the frontend must be built first. The static build output is `dist/public` after running `pnpm build`. The Google Apps Script backend must still be copied/deployed separately from `apps-script/Code.gs`, and the resulting `/exec` URL must be connected in the website.
