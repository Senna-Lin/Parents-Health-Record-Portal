<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/70e952ef-9128-467a-aa8d-3936b497b292

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Configure the two Google Sheets IDs described below in `.env.local`.
4. Run the app:
   `npm run dev`

## Google Sheets setup

1. Create two Google Sheets spreadsheets: one for the father's health records and one for the mother's health records. Existing spreadsheets can also be used; the app preserves the current health-record column format and can add the required `血壓記錄` and `異常通知歷史` tabs when they are missing.
2. Get each `spreadsheetId` from its URL. For `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`, copy the value between `/d/` and `/edit`.
3. Copy `.env.example` to `.env.local` and configure:

   ```env
   VITE_FATHER_SPREADSHEET_ID=father_spreadsheet_id
   VITE_MOTHER_SPREADSHEET_ID=mother_spreadsheet_id
   ```

4. Share both spreadsheets with the same Google account that will sign in to this website, granting edit access so records can be added and deleted.
5. Restart the development server after changing environment variables. For deployment, configure the same two variables in the build environment before running `npm run build`.

The website requests only the Google Sheets OAuth scope (`https://www.googleapis.com/auth/spreadsheets`). It no longer requests Google Drive or `drive.file` access, and it does not search for or create spreadsheet files through the Drive API.

`VITE_*` values are embedded in the browser build. Spreadsheet IDs are resource identifiers, not credentials; access is still enforced by Google account permissions.
