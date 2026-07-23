# Build two training PowerPoints — HQ to Retail Connector

You are creating **two separate PowerPoint decks** of step-by-step user instructions for an internal web app called **HQ to Retail Connector** (built by Advantage Solutions). One deck is for **HQ users** (who enter and submit work) and one is for **RCSMs** (Retail Client Services Managers, who review, approve/deny, and export). Produce clean, screenshot-ready instructional slides — short titles, numbered steps, one task per slide. If you can generate a .pptx (e.g., with python-pptx), do so; otherwise produce a slide-by-slide outline I can paste into PowerPoint.

## Brand / style
- Company: Advantage Solutions. Tagline: "We keep commerce and life moving."
- Colors: background cream `#FFF3E3`; primary text green `#14332D`; headings green `#007B4E`; buttons/accents green `#00C48D`; alerts orange `#FF9527`.
- Font: Arial / Helvetica. Keep it simple and legible; a title slide, an overview slide, then one slide per task, then a short "tips" slide.

## What the app is (say this on an overview slide in both decks)
A two-role web tool. **HQ** enters upcoming retail work and submits it; each submission routes automatically to the **RCSM** who owns that client; the RCSM reviews, approves or denies, and exports approved work in the format the downstream system needs. Sign-in is by username + password. A role toggle ("Viewing As: HQ / RCSM") lives in the Settings (gear) menu.

## Shared concept to explain early in BOTH decks
Every HQ submission starts with a required confirmation checkbox: **"Please Confirm this Client is Contracted for Retail Work in the Submitted Accounts."** You cannot proceed until it's checked.

---

## DECK 1 — HQ USER GUIDE (slides)

1. **Title:** HQ to Retail Connector — HQ User Guide.
2. **Overview:** what the app does + that everything HQ submits goes to the owning RCSM for approval.
3. **Signing in:** go to the site, enter username + password. First-time users either set their password from an invite link or use the default password they were given, then change it under Settings → Change password.
4. **The home screen (launcher):** three choices — **Add priority**, **Authorize items**, **View current priorities**.
5. **Add a priority → choose type:** clicking "Add priority" shows two kinds — **Shelf Conditions** (goes to Home Location Check) and **Promotion / Display**.
6. **Enter a Promotion / Display (single):** confirm the contract gate → fill the form: Client, Chains, Product, Brand, Category, Promo Type (TPR / Feature / Display / Feature and Display), Start & End dates, Mechanic, Retail & Promo price, Expected lift, Display requirements, **Photo Requested? (Yes/No)**, and an optional **file attachment** (photo, planogram, PDF). Click Add.
7. **Bulk upload promotions:** on the "Add priority → Promotion / Display" launcher, click **Bulk upload** → **Download template** → fill in Excel (Chains, Promo Type, and Photo are dropdowns; dates are locked to YYYY-MM-DD) → **Upload filled template** → review the drafts → they appear in your list to submit.
8. **Home Location Check (Shelf Conditions):** a step-by-step wizard — Confirm → Team → Client → **Chains** (you pick chains; the app includes all their stores automatically) → **Items** (check the products) → **Dates** → Review → **Submit to RCSM**. (Bulk upload also available: template has a chain dropdown and splits each chain into its stores on upload.)
9. **Authorize items — two options:** **New item build** (enter brand-new UPCs; Brand/Family/Category are dropdowns from existing product values) or **Authorize existing item** (search the client's existing items and pick them). Each is a wizard: Confirm → Team → Client → items → chains/accounts → Authorization details (type + effective date) → Review → Submit. Bulk upload available for both.
10. **Submitting & routing:** when you submit, the item automatically routes to the RCSM who owns that client. You don't choose the RCSM.
11. **My Submissions:** track everything you've sent — status shows Draft, Submitted, Approved, or Rejected, plus who it routed to.
12. **If something is rejected:** you'll see the RCSM's **reason**; edit the item and **resubmit**.
13. **Request reporting:** on a submitted/approved priority, use the "Request reporting" button to ask for a report tied to it.
14. **Tips slide:** use bulk upload for many items; keep the template's helper sheets intact; attachments are optional; change your password after first login.

---

## DECK 2 — RCSM USER GUIDE (slides)

1. **Title:** HQ to Retail Connector — RCSM Guide.
2. **Overview:** you receive everything HQ submitted for **your clients**, review it, approve or deny, and export approved work for your downstream system.
3. **Signing in & role:** username + password; make sure Settings shows **Viewing As: RCSM** and your **RCSM identity** is selected.
4. **Your Inbox:** items routed to you, **grouped by client**. Each client group shows a headline number — **estimated minutes of work per store** — which you weigh against the contracted amount you already know for that client.
5. **Reviewing an item:** click **Review details** to expand. What you see depends on type: a **Priority** shows its per-store time and details; a **Home Location Check** shows work-flag stats (avg/max/min per store, total) and estimated time; an **Authorize** shows the new/existing items and chains for correctness.
6. **Approving a Home Location Check:** click **Approve**, then you MUST pick a **Reason** (M, Z, A, B, P, N) and a **frequency** (Work once / Work every) before confirming. The downstream reason code is the letter, doubled for "work every" (e.g., M + work every = MM).
7. **Approving other items:** click Approve (priorities/authorize don't require a reason).
8. **Denying an item:** click **Reject** — a **reason is required**. The item goes back to HQ, editable, so they can fix and resubmit.
9. **Exporting approved work:** once approved, click **Export** to download the CSV in the downstream format (Home Location Checks export in the WORKFLAG1 layout: one row per store × item).
10. **Manage RCSMs (admin):** assign which **clients** each RCSM owns — this is what routes submissions. Set each RCSM's **notification email** here.
11. **Manage Users (admin):** add users one at a time or in bulk, send invite links, reset passwords.
12. **Tips slide:** the per-store minutes is your quick check against contract; always give a clear reason when rejecting; export only after approving.

---

## Notes for the deck author (do not put on slides unless asked)
- Email notifications (RCSM notified on submit; HQ notified on approve/deny with the reason) and file attachments are available but only active once the backend email/blob services are configured — describe them as "if enabled" if unsure.
- Keep instructions action-oriented ("Click…", "Pick…", "Enter…"). Leave placeholder boxes where screenshots go.
