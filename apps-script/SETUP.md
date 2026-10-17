# Setup guide — Language Course Registration

The form is hosted by Lovable. Submissions go to a Google Apps Script web app that
saves the receipt and a generated PDF in your private Google Drive. No Google
credentials ever reach the browser; the script runs under your account.

Why not HtmlService: the Lovable-hosted form gives a faster, more polished,
mobile-friendly experience and live preview. It talks to Apps Script over HTTPS
(`fetch` with `text/plain`, which avoids CORS preflight). Apps Script remains the only backend.

## 1. Create the Drive folder
1. In Google Drive create a folder named `Language Course Applications`. Keep it private (do not share it).
2. Open it and copy the ID from the URL: `drive.google.com/drive/folders/<THIS_PART>`.
   `Applications/` and `Payment Receipts/` subfolders are created automatically.

## 2. Create the script
1. Go to script.google.com → New project. Name it "Course Registration".
2. Replace `Code.gs` with the provided `Code.gs`.
3. Project Settings (gear) → Script Properties → Add `ROOT_FOLDER_ID` = the folder ID.
4. Project Settings → Time zone: `(GMT+02:00) Kigali`.
5. In the editor, select `testSetup` → Run → approve the permission prompt. The log should say `OK: Language Course Applications`.

## 3. Deploy
1. Deploy → New deployment → type **Web app**.
2. Execute as: **Me**. Who has access: **Anyone** (needed so applicants without Google accounts can submit; files stay private in your Drive).
3. Deploy, then copy the Web app URL (ends with `/exec`).
4. In the Lovable project, open `src/config.ts` and set `APPS_SCRIPT_URL` to that URL. (Or ask the AI: "set the Apps Script URL to …".)
5. After changing `Code.gs` later: Deploy → Manage deployments → edit → Version: New version. The URL stays the same.

## 4. Updating payment details / QR codes
Edit `PAYMENT_METHODS` in `src/config.ts` (`number`, `ussd`). QR codes are generated automatically from `tel:` + the USSD string.
**Verify the Airtel USSD sequence (`*182*1*2*…#`) with Airtel before launch.**
Upload size: `MAX_UPLOAD_MB` in `src/config.ts` and `MAX_BYTES` in `Code.gs` (keep both equal; keep under ~10 MB because of Apps Script request limits).
Course extras (schedule, price): add text lines to `details` in `COURSES`.

## 5. How it works / safety
- References (`APP-2026-0001`) come from a counter guarded by `LockService`, so concurrent submissions never share a number.
- Each form session sends a random `submissionId`. Retrying the same submission returns the same reference instead of creating a duplicate.
- If saving fails partway, the reference is marked `PENDING` in Script Properties; a retry overwrites the partial files. The applicant only sees success once both files are saved.
- Receipt files are checked by their real file signature (JPG/PNG/PDF), not extension.
- Nothing is approved automatically; every PDF is marked "Pending manual verification".

## 6. Testing checklist
- [ ] `testSetup` runs and both subfolders exist.
- [ ] Opening the `/exec` URL in a browser shows `{"ok":true,...}`.
- [ ] Submit with a PNG, a JPG and a PDF receipt → success screen shows a reference.
- [ ] Drive has `APP-YYYY-NNNN-Application.pdf` and matching receipt; PDF content is correct.
- [ ] Files and folder show "Only you" access (not "Anyone with the link").
- [ ] Try a 6 MB file and a `.txt` renamed to `.png` → both rejected.
- [ ] Skip required fields / declaration → cannot continue.
- [ ] Double-click Submit / resubmit after network drop → one reference only.
- [ ] Set a wrong `ROOT_FOLDER_ID` temporarily → form shows an error, not success.
- [ ] Scan both QR codes on Android and iPhone; dial the codes manually.
- [ ] Check the form on a phone, a tablet and desktop.
