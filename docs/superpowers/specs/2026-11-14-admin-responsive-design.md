# Admin panel — responsive design spec

Make the admin panel (`src/admin`) responsive for phones and tablets, keeping
the desktop layout (≥ 1280px) exactly as it is. Follow CLAUDE.md; commit per
step with checks passing. Check in Chrome (`localhost:5173/admin`) at 360×800,
390×844, 768×1024 and 1280×800, light and dark, for every page.

## Requirements

- **Layout:** below 1024px the sidebar is hidden and opens as a drawer from a ☰
  button in a top bar (page title, the menu button, theme toggle, the user
  menu); closes on navigation, on the backdrop and with Esc; focus trapped
  while open. Between 1024 and 1280px a narrow icon-only sidebar with
  tooltips. No horizontal page scrolling at any width.
- **Bosh sahifa:** KPI cards in 1 column below 480px, 2 columns up to 1024px;
  the chart fits the width; to-do tiles full width.
- **Tables** (Maydonlar, Foydalanuvchilar, Bronlar, Toʻlovlar, Jurnal): below
  768px show each row as a card with the 3–4 most important fields and the
  status, tap to open; or, where a card doesn't fit, a horizontally scrollable
  table with the first column sticky. Pagination stays usable.
- **Filters:** below 768px collapse into a "Filtrlar" button opening a bottom
  sheet; the search field stays visible.
- **Side panels** (booking, payment, game) and the stadium/user detail pages:
  full-screen on phones with a clear back/close; decision buttons in a sticky
  bottom bar.
- **Modals:** full-width sheets on phones; inputs at least 16px font (no iOS
  zoom), touch targets ≥ 44px.
- Long names and numbers wrap or truncate gracefully; money values never break
  across lines.
- Tests for the drawer (open, close, navigation) and the card view of one
  table.

## Out of scope

- Any change to the layout at ≥ 1280px.
- The Mini App (`src/miniapp`) and `src/shared`, except where a shared token or
  helper is genuinely required.
- New endpoints, fields or business rules.
