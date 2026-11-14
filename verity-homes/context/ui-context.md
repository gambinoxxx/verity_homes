# UI Context

The visual source of truth is `design/`, with all styles in
`design/assets/verity.css` (public) and `design/assets/admin.css` (admin).
When this file and the design differ, **the design wins**. Update this file
to match.

## Theme

The site uses a light theme with deep navy sections for emphasis, in navy,
white and gold. Headings are an elegant serif and UI text is a clean sans.
Big photography and bold oversized type, inspired by Megamound, carry the
look. There are no gradient washes and no emoji.

## Colors (CSS variables, mirrored into Tailwind `@theme`)

| Role | Variable | Value |
| --- | --- | --- |
| Page background | `--bg-base` | `#FFFFFF` |
| Alt section | `--bg-subtle` | `#F5F6F8` |
| Warm section | `--bg-cream` | `#F6EFDD` |
| Brand navy | `--bg-navy` | `#0A1A33` |
| Deepest navy (footer, preloader, bands) | `--bg-navy-deep` | `#071226` |
| Navy surface | `--bg-navy-surface` | `#13294B` |
| Primary text | `--text-primary` | `#0A1A33` |
| Muted text | `--text-muted` | `#4A5568` |
| Text on navy | `--text-on-navy` | `#FFFFFF` |
| Muted on navy | `--text-on-navy-muted` | `#C5CEDD` |
| Gold (fills, outlines, accents) | `--accent-primary` | `#C8A24E` |
| Light gold | `--accent-soft` | `#E9D4A0` |
| Gold text on light backgrounds | `--accent-text` | `#8A6A22` |
| Border | `--border-default` | `#E3E6EB` |
| Input border | `--border-input` | `#D7DBE2` |
| Border on navy | `--border-navy` | `#22395F` |
| Error | `--state-error` | `#B42318` |
| Success | `--state-success` | `#15803D` |
| WhatsApp | (buttons only) | `#1FAF55` / float `#25D366` |

One-off shell shades also live in `:root` (from `design/assets/verity.css`):
`--accent-hover` `#D6B464`, `--header-scrolled` `rgba(7,18,38,.96)`,
`--border-navy-soft` `#1A2D4D`, `--text-on-navy-faint` `#A7B2C4`,
`--placeholder-on-navy` `#8C98AD`, `--text-on-navy-dim` `#7F8CA3` (showcase dots),
`--border-navy-dashed` `#3A5482` (partner tiles), `--statement-unfilled` `#D5D9E0` and
`--accent-text-on-cream` `#866720` (small gold text on cream; `--accent-text` is 4.4:1 there).

Gold `#C8A24E` is never used as small text on white. Use `--accent-text`
there instead.

### Tailwind names (`app/globals.css`)

The CSS variables above live in `:root`. `@theme` exposes them as utilities:
`base`, `subtle`, `cream`, `navy`, `navy-deep`, `navy-surface`, `ink`
(text-primary), `muted`, `on-navy`, `on-navy-muted`, `gold`
(accent-primary), `gold-soft`, `gold-text`, `line`, `line-input`,
`line-navy`, `error`, `success`, `whatsapp` and `whatsapp-float`. For
example: `bg-navy`, `text-gold-text`, `border-line`.

Radii: `rounded-pill` (999px), `rounded-input` (12px), `rounded-card`
(18px), `rounded-panel` (24px), `rounded-box` (32px), `rounded-sheet`
(44px), `rounded-sheet-mobile` (28px) and `rounded-arch` (240px).

Other utilities: `max-w-site` (1280px), `ease-brand`, `font-display` and
`font-sans`.

## Typography

| Role | Font | Variable |
| --- | --- | --- |
| Display and headings | Playfair Display 500–700, italic for accent words | `--font-display` |
| UI and body | Manrope 400–800 | `--font-sans` |

| Element | Size |
| --- | --- |
| Hero H1 | `clamp(54px, 8vw, 116px)` |
| Page-hero H1 | `clamp(56px, 9vw, 128px)` |
| Section H2 (`.h2`) | `clamp(38px, 5.2vw, 72px)`, line-height 1.02, letter-spacing -1px |
| Body | 16–18px, line-height 1.65–1.85 |

Accent words in headings are `<em>`: italic and gold. On light sections the gold
is `--accent-text` (contrast); on navy it is `--accent-primary`.

## Radius scale

| Context | Radius |
| --- | --- |
| Buttons, pills, tabs, badges, soft inputs | `999px` |
| Inputs and selects | `10–12px` |
| Cards (property, blog, service) | `18px` |
| Plans, forms, values, contact cards | `20–24px` |
| Big panels (contact box), showcase cards | `24–32px` |
| Page "sheet" overlapping the hero | `44px 44px 0 0` (28px on mobile) |
| Hero image, CEO portrait | Arched top (`220–240px`) |

## Signature patterns (all in `design/`)

| Pattern | What it is | Where |
| --- | --- | --- |
| **Preloader** | Logo strokes draw, the wordmark fades in, a gold bar fills, then a curtain slides up. Plays every load; skipped for reduced motion. | All pages (home first) |
| **Page hero + sheet** | Full-bleed photo, dark overlay, giant title with a gold italic word, breadcrumb, optional subtitle on the right. Then a white sheet with a 44px radius overlaps it by 56px. | All inner pages |
| **Marquee band** | Huge scrolling words alternating solid, gold outline and gold italic, separated by ✦. Pauses on hover. | Home ×2, About |
| **Pill ticker** | Small gold-bordered pill with a scrolling uppercase label. Used instead of eyebrows on key sections. | Home, inner pages |
| **Sticky showcase** | Left: sticky panel with an outline number, location, name, status and CTA. Right: photo cards that stick and stack, the one underneath scaling to 0.94 and darkening. The left panel syncs to the active card. On mobile, captions sit inside the cards. | Home |
| **Statement** | Large centred serif sentence whose words darken one by one on scroll. | Home |
| **Map block** | Rounded 24px iframe, grayscale, with a white card top-left holding the name, area and an "Open in Google Maps" button. | Property, contact |
| **Gallery** | One large photo and four small. The last tile says "View all N photos". Opens a lightbox with arrows, Esc, a counter and focus return. | Property |
| **Enquiry card** | Sticky sidebar card: agent avatar, form, "or", WhatsApp button. On mobile it becomes a fixed bottom bar (Enquire and WhatsApp). | Property |

## Layout

- **Container:** `max-width: 1280px`, `padding: 0 24px`.
- **Section padding:** 120px vertically on desktop, 80px on mobile.
- **Header:** fixed and transparent over the hero, turning navy with blur
  after 40px of scroll. On mobile, the menu becomes a full-screen drawer.
- **Grids:** properties have 3 columns (2 inside the sidebar layout, 1 on
  mobile), and the sidebar is `300px + 1fr`. Detail pages use
  `1fr + 340px`, with the sidebar sticky at `top: 104px`.
- **Admin:**
  - a 260px navy sidebar that becomes an off-canvas drawer at 860px or
    narrower
  - a white top bar with title and breadcrumb
  - panels on `#F5F6F8`, tables that scroll inside their box
  - the editor is `1fr + 320px`, with a sticky publish panel

## Components

- **Public:** custom components in `components/site/`, ported one-to-one
  from `design/`. Keep the class structure readable, using Tailwind or CSS
  modules.
  - Shared globals in `app/globals.css`: `.container` (1280px + 24px
    padding, overrides Tailwind's), `.btn` / `.btn-gold` / `.btn-outline` /
    `.btn-outline-dark` / `.btn-white` / `.btn-navy`, `.ph` (dashed
    placeholder), `.skip-link`, `:focus-visible`.
  - Also global: `.sec`, `.sec-head`, `.eyebrow`, `.h2`, `.lead`, `.link-arrow`,
    `.media` (image box with house fallback), `.reveal` / `.reveal-img` (+ `.d1`–`.d3`).
  - **Reveal-on-scroll is owned by React.** Use `<Reveal as="h2" delay={1}>`, `<Reveal
    variant="image">`, `<RevealLink>` or the `useReveal()` hook (`components/site/reveal.tsx`);
    `PropertyCard` takes `reveal={0–3}`. Never write `reveal`/`in` in a className by hand, and
    never `classList.add` on an element React renders: a re-render rewrites className and
    drops it (that blanked tapped services items, 2026-11-12).
  - The hiding classes are rendered only after hydration (`useHydrated`), so server HTML and a
    page whose JS failed show everything. The hero headline (`useSiteLoaded`) and the
    statement fill (`.ready`) follow the same rule. Nothing is written onto `<html>`/`<body>`.
  - `variant="image"` reveals when its **parent** enters view (Chrome measures an observed
    element after its own `clip-path`). Give it an unclipped parent of about its own size.
  - Inner pages: `PageHero` (`components/site/page-hero.tsx`: photo, giant title with gold
    `<em>`, breadcrumb, optional subtitle) followed by `<section className="sheet">` (or
    `sheet subtle`). Global `.pills`, `.card`, `.ctl` (labelled control; use a `fieldset.ctl`
    + `legend.lbl` for groups), `.cta-card`.
  - `PageHero variant="post"` is the design/post.html hero (min-height 520px, smaller title up
    to 900px wide, optional `kicker` above the title) for /privacy and blog posts (Unit 11).
    Follow it with `<section className="sheet"><article className="container article">` and a
    `.prose` body. `.article` (780px column) is unlayered in `globals.css` so it beats the
    `container` utility; `.prose` (with `--text-prose`) lives in the components layer.
  - Blog: `components/site/blog/` (`blog-browser.tsx` list + sidebar, `markdown.tsx` body,
    `post-sections.tsx` tag/share/author). `PostsSection` (`components/site/post-cards.tsx`,
    `layout="featured"` on home, `"pair"` for the post page's "More articles"). `ShareButton`
    takes a `label`. Global `.prose` also styles `ol`, tables, `hr`, `code` and `.prose-img`.
  - Shared sections: `CeoSection` (`components/site/ceo.tsx`; home and /about pass their own
    text column) and `PartnerMarquee` (`components/site/partner-marquee.tsx`; `light` on /about;
    renders nothing without partners). A `.on-cream` section darkens `PillTicker` text to
    `--accent-text-on-cream`. About sections live in `components/site/about/`.
  - Investment: `PlanCard` / `PlanGrid` / `InvestSteps` / `InvestDisclaimer`
    (`components/site/invest/plans.tsx`) are shared by the home invest section and /invest;
    the copy lives in `lib/invest.ts`. `EnquiryForm` variants: `full`, `card`, `contact`,
    `invest`.
  - Reusable: `PropertyCard` (`cta="details"` on /properties, `"enquire"` elsewhere; the tag
    carries `data-tag`), `MarqueeBand` (`light`, `reverse`), `SaveButton`, `PillTicker`
    (the `.pill` ticker; label read once by screen readers), `EnquiryForm` (field names match
    `enquirySchema`; Unit 7 wires it), `icons.tsx` (the design's own glyphs, copied from its
    `<symbol>` set).
  - Property page sections live in `components/site/property/` (`sections.tsx` server parts,
    `gallery.tsx` gallery + lightbox, `share-button.tsx`). `EnquiryForm` has a `card` variant
    for the sidebar. The mobile bottom bar carries `data-mbar`; `floats.module.css` and
    `footer.module.css` use `body:has([data-mbar])` for the design's `.has-mbar` offsets.
  - Home sections live in `components/site/home/`. Scroll effects (showcase, statement) are
    one client component each, batch work with `requestAnimationFrame` and skip the motion
    under `prefers-reduced-motion`.
  - CSS modules (`*.module.css`) are plain CSS using the variables. They
    skip the Tailwind loader, so don't use `@apply` in them.
  - Shell: `<SiteChrome>` (`components/site/site-chrome.tsx`) = skip link,
    scroll progress, preloader, header + drawer, `<main id="main">`, footer,
    WhatsApp float (only when a number is set), back-to-top.
- **Admin:** no shadcn/ui (owner decision, Q46). Port `design/assets/admin.css` into CSS
  modules next to the components and match `design/admin-*.html`.
  - Shell (Unit 12): `components/admin/admin-shell.tsx` — `AdminShell` (layout), `AdminTopbar`
    (each page: `title`, optional `crumb`/`actions`; the page's only `<h1>`), `AdminContent`
    (`<main id="main">`). Styles in `admin-shell.module.css` (`.panel` for simple cards). Sidebar
    items from `lib/admin-nav.ts`; group labels use `--text-on-navy-faint` (design `#7F8CA3`
    fails AA at 11px); hover uses `--admin-nav-hover`. Glyphs in `components/admin/icons.tsx`.
  - Sign-in / no-access: `components/admin/auth-screen.tsx` (navy screen, Verity ADMIN mark).
  - Dashboard (Unit 13): `components/admin/dashboard/` (`dashboard.module.css` ports admin.css
    `.stats/.stat/.grid2/.panel/.list/.badge/.quick`). Status badge colours are tokens
    `--badge-new-*`, `--badge-contacted-*`, `--badge-neutral-bg`. Unbuilt admin targets render a
    "Coming soon" pill instead of a link (`lib/admin-dashboard.ts` `BUILT_ADMIN_ROUTES`).
  - Shared controls (Unit 14): `components/admin/ui.module.css` (`.btn` + `navy/ghost/danger`,
    `.iconBtn`, `.badge` + `pub/draft`, `.input/.select`, `.switch`, `.panel`, `.alert`, `.dialog`).
    Properties list and editor in `components/admin/properties/` (`properties.module.css`,
    `editor.module.css`). Toasts: sonner `<AdminToaster />` in the (panel) layout. Editor element
    ids are prefixed per instance (`IdScope`, `useId`), since Next keeps the previous page mounted
    but hidden.
  - Photos + map (Unit 15): `photos-field.tsx` (design `.drop/.photos/.photo` in
    `editor.module.css`) and `map-picker.tsx` (Leaflet, gold `divIcon` pin `.pin`, map box
    `.map` 280 px). Leaflet's CSS is imported only by the picker (admin only).
  - Enquiries inbox (Unit 16): `components/admin/enquiries/` (`enquiries.module.css`: split
    view, unread/selected rows with a stretched name link, `.detail` panel; full-screen with a
    Back link at ≤ 860 px). Status badges `ui.bNew/bContacted/bClosed`; gold button `ui.gold`.
  - Plans + FAQs (Unit 17) reuse the properties list/editor styles: `components/admin/plans/`,
    `components/admin/faqs/`. Shared: `components/admin/delete-button.tsx` (confirm dialog for
    properties, plans, FAQs), `components/admin/reorder.tsx` (`useReorder` drag + `MoveButtons`
    ↑↓). Plan top-bar “Add plan” uses the dashboard's icon-only-on-phones button.
  - Plot options (Unit 17b): editor panels “Plot options” (fieldset rows, ↑↓/×) and
    “Development & offer” (`editor.module.css` `.plotRow`, `.plotOps`); the single Price panel is
    disabled with a note while plots exist.
- **Property page plots (Unit 17b)**: `components/site/property/plots.tsx` — “Choose your plot”
  under the facts strip (a 5-column table; stacked cards ≤ 700 px), `OfferNote`; notes box
  `.terms` (cream); head shows “From ₦…”, “Initial deposit from ₦…” and “A development by …”.
  Select → `lib/plot-select.ts` event → the enquiry form (message + hidden `plotId`) and the
  WhatsApp buttons (`whatsapp-link.tsx`) follow the chosen plot.
    Clerk's card uses the tokens through `appearance.variables` (CSS variables work).

## Icons

- The logo is a custom SVG in `components/site/logo.tsx`. Copy the paths
  from `design/index.html` (`#logo` symbol) or from the brand kit.
- Everything else uses Lucide React, stroke only, sized `h-4 w-4` inline
  and `h-5 w-5` in buttons.
  - On navy, icons use `--accent-primary`.
  - On light backgrounds, they use `--text-primary` or `--accent-text`.

## Motion

- Easing is `cubic-bezier(.2,.7,.2,1)`.
- Reveal-on-scroll moves from 40px below with opacity 0 to rest, over 1s.
- Image reveals use a clip-path wipe.
- Card hover lifts the card 8px and zooms the image 1.08×.
- Services accordion: the active title does **not** shift 6px right (the design's
  `.svc-item.active h3` translateX was removed on request, 2026-11-12) so all titles align;
  the arrow rotation, navy arrow circle and opening description stay.
- Logo on a gold background (intro badge): `<Logo monochrome />` draws roof and V in
  `currentColor` (navy-deep); the regular gold V would vanish on gold.
- Every animation is disabled under `prefers-reduced-motion`. Transitions are set to
  `0s` with no delay (not the design's `0.01ms`), so nothing is ever half-hidden for a frame
  (that broke drawer focus and made e2e clicks land on the wrong element). Nothing in the app
  listens for `transitionend`.
