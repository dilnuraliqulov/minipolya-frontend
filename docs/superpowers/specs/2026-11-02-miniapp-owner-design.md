# Mini App owner mode — Jadval, Maydonim, Hisobot, Profil, Maydon qoʻshish

Sub-project D. Autonomous mandate of 2026-11-01 (decisions in
`docs/miniapp-progress.md`). Backend: `docs/api-reference.md` §4 (owner
stadiums), §5 (manual bookings, owner cancel), §9 (`POST /api/games/{id}/cash`),
§10.4–10.7 (pricing, promotions, closures, dashboard).

Owner mode lives inside the Mini App under `/owner/*` with its own tab bar
(Jadval `/owner`, Maydonim `/owner/stadium`, Hisobot `/owner/report`, Profil
`/owner/profile`). Profil → "Ega rejimi" switches in; owner Profil → "Oʻyinchi
rejimiga oʻtish" switches back. Every owner screen shows the **owner's own
prices** (§1.10).

## What exists and what does not

| Needed | API | Decision |
|---|---|---|
| Owner's stadiums with status + `statusReason` | `GET /api/owner/stadiums` | stadium chips, status banners |
| Stadium detail in owner prices (phone, description, hours, minimum, cancellation hours, photos, amenities) | **none** (public detail = player prices, approved only) | **R35**; "Ish vaqti", "Bron shartlari", "Rasmlar" sections "Tez orada"; Maʼlumotlar edits only the list fields (name, address, district, format, surface) — `PUT` applies only non-null fields |
| Photo upload | **none** (Q5) | **R36**; photo step / section "Tez orada" |
| Pricing rules | `GET/POST/DELETE …/pricing` | Narxlar: list by day, add, remove |
| Closures | `GET/POST …/closures`, `DELETE /api/owner/closures/{id}` | Yopiq kunlar: list, add, remove |
| Day schedule | `…/dashboard/stadiums/{id}/schedule?from&to` (+ public availability for free hours) | Jadval |
| Walk-in booking | `POST /api/owner/stadiums/{id}/bookings` | "Qoʻlda band qilish" sheet |
| Owner cancels | `DELETE /api/owner/bookings/{id}` (always full refund) | booking sheet |
| Mark an ordinary booking's remainder as cash | **none** (Q6) | **R37**; "Naqd olindi" disabled "Tez orada" |
| Stats | `…/dashboard/stadiums/{id}/stats` | Hisobot Bugun / Hafta / Oy: bookings, revenue, rating, occupancy |
| Unpaid remainders list, app vs cash split | **none** (would be a client filter of one page) | **R38**; section "Tez orada" |
| Owner's contract / payout status | **none** (admin only) | **R39**; owner Profil "Toʻlovlar" "Tez orada" |
| New stadium | `POST /api/owner/stadiums` (pending until an admin approves) | wizard: Asosiy → Manzil → Ish vaqti → Narx va shartlar → Koʻrib chiqish → Yuborildi (photos step skipped, R36) |

Money typed by the owner is so'm → `somToTiyin` before sending; shown back with
`formatMoney`. `minBookingAmount` ≥ 500 soʻm is the backend's validation (its
400 is shown through `errors.ts`).

## Frames

Jadval `d4l7yJ` `IyIwX` `YZFHH` `IAh1u` `st7cd` `CXPY9` `Z2sgHy` `w4Bhy` `YMA8O`
· Maydonim `w1Pj0h` `zl6WZ` `Xixju` `lwWRX` `n5xKf9` `cTcMg` `JKjkh` `eHmMb`
`sUe0P` · Maydon qoʻshish `MTxIv` `ttB1M` `cVtxW` `DCuyS` `DeUaS` `vvNZW` ·
Hisobot `LqqTk` `sckgC` `QkqKu` `S9LJi` `K4VUtC` `hQpYY` · Profil `lulrq` `XenNj`
`XaEu7`.
