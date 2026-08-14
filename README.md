# LoneEddy Allocator — GitHub Pages v10

Static GitHub Pages frontend + Google Apps Script backend. No npm build or GitHub Actions is required for the `main / (root)` publishing method.

Important: v10 does **not** generate a fake successful allocation when Google Sheets is disconnected. Connect the Apps Script `/exec` endpoint and use **Test Sheet Write** before running.

See `apps-script/DEPLOYMENT.md` for Apps Script steps and `CHECK_REPORT.md` for the regression checks.
