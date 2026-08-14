# LoneEddy Allocator — GitHub Pages main/root deployment

This package is already browser-ready. It does **not** require Vite, Node, npm, pnpm, or GitHub Actions on GitHub Pages.

## Upload

1. Open the GitHub repository named `allocator`.
2. Delete/replace the old site files if needed.
3. Upload the **contents of this ZIP**, not the ZIP file itself.
4. Confirm these files are visible at the repository top level:
   - `index.html`
   - `app.js`
   - `style.css`
   - `.nojekyll`
   - `404.html`
5. Open **Settings → Pages**.
6. Under **Build and deployment** choose **Deploy from a branch**.
7. Choose branch **main** and folder **/(root)**, then Save.
8. Wait for GitHub Pages to publish and open the project site URL.

## Google Apps Script

Use `apps-script/Code.gs` in your Apps Script project, deploy it as a Web App, and paste the Web App URL ending in `/exec` into **Source & settings** on the website.

Do not use `Group`, `AssignedLog`, or `RightBalanceSummary` as the Result sheet name.

## Source code

The former React/Vite source is preserved under `source-react/` for future development. GitHub Pages serves the browser-ready root files directly.
