# Aqivo — Get Found. Get Customers. Grow.

Multi-tenant SaaS for African small businesses (beauty first): profile, website, WhatsApp, leads, bookings,
customers, reviews, analytics, marketing, AI assistant, subscriptions and an admin/sales-CRM portal.

- `backend/` FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL. Also serves the public business sites (Jinja, SEO, no dashboard JS).
- `frontend/` Vite + React + TypeScript (strict) + Tailwind. Landing, templates, onboarding, dashboard, `/admin`.

## Run locally
```bash
createdb bizora
cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
cp .env.example .env            # set SECRET_KEY, DATABASE_URL
alembic upgrade head
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='choose-a-strong-one' python -m app.seed --demo   # plans, templates, super admin, 5 demo businesses
uvicorn app.main:app --reload --port 8000

cd ../frontend && npm i && npm run dev     # http://localhost:5173 (proxies /api to :8000)
```
Production: `npm run build` in `frontend/`; the backend serves `frontend/dist` and public pages on one origin. Set `ENVIRONMENT=production`, a real `SECRET_KEY`, `BASE_DOMAIN`, `PUBLIC_BASE_URL`, and point `*.yourdomain` at the server for subdomain sites.

## Tests
`cd backend && pytest` (uses database `bizora_test`; create it first). Includes explicit cross-tenant isolation tests.

## What is real vs. "Coming soon"
Real: auth (lockout, refresh cookie), tenancy + RBAC, plans/feature gating, website generation/publish/SEO, bookings with slot
locking, leads/CRM, reviews (verified single-use links), analytics from real events, health score, retention, campaigns
(owner-confirmed; delivery = owner taps prepared WhatsApp links), AI answers from your data, invoices/PDF, QR, audit log,
audited impersonation, idempotent authenticated payment webhooks.
Not configured / coming soon (and labelled so in the UI): M-Pesa STK push (needs Daraja credentials in `.env`), M-Pesa
collection from a business's customers, automatic WhatsApp sending, custom-domain activation, Google/social integrations,
referral rewards, LLM drafting (set `ANTHROPIC_API_KEY`; otherwise templates are used and labelled).

## Operating manually (first 100 customers)
/admin → Sales CRM → Create business (creates owner login + site) → "Manage as owner" (audited) to add services/photos →
Publish → Change subscription → Activate after taking payment out-of-band.

## Security notes
bcrypt, JWT access (30 min, memory) + httpOnly refresh cookie, per-tenant repositories (business_id never taken from client),
rate limiting (in-process; move to Redis for multiple workers), image decode/validation/re-encode, JSON-LD escaping,
security headers, CORS allow-list, honeypots, webhook secret + unique (provider,event) idempotency.

## Images
Photos in `frontend/public/img/` (and `backend/app/seed_assets/` for demo businesses) are CC0/public-domain stock found via
Openverse; sources and creators are listed in `frontend/public/img/CREDITS.json`. No attribution is required, but it is
kept for traceability. Demo businesses are re-seeded with these photos in development (`python -m app.seed --demo`).
The phone frame is `frontend/public/phone-frame.png` rendered through `src/components/PhoneFrame.tsx`.

## Storefront engine & builder (Phase 1)

The public storefront is **not** a fixed template. A page is an ordered list of *sections* (`backend/app/services/sections.py`), each with validated JSON settings and styles. Adding a section type = one registry entry + one Jinja partial in `public/templates/sections/` — no migration.

- **Sections (35):** hero, announcement, profile, image, image+text, text, rich text, about, product grid / carousel, offers, categories, service list / cards / carousel, discount banner, verified reviews, testimonials, FAQ, gallery, video (YouTube/Vimeo/mp4 only), team, booking form, booking button, WhatsApp prompt, contact, sign-up form, opening hours, location, map (OpenStreetMap), social links, button, spacer, divider, custom embed (runs in a sandboxed iframe — it cannot reach your site, cookies or other tenants). Also: collection grid, Instagram feed and Google reviews (these show only once you connect the account; the builder tells you when one isn't connected).
- **Automatic storefront:** creating a business composes a storefront from its actual data (retail gets categories + product grid first). *Rebuild from my business details* regenerates it.
- **Style presets, not templates:** the 17 earlier designs are now style presets (colours, fonts, corner style, header look). Switching preset never touches your sections.
- **Builder** (`/dashboard/website`): drag-and-drop (mouse and keyboard) section list, add / duplicate / hide / delete, per-section forms generated from the registry, section style (background, spacing, alignment, width), desktop / tablet / mobile preview of the real rendered page, click a section in the preview to edit it, autosave (draft) and Publish.
- **One renderer:** the builder previews exactly what visitors get — the same server-rendered pages (SEO-friendly, no client-only shell).
- **Products & categories** (`/dashboard/products`): photos, was-price (shows the saving), SKU, tags, stock tracking (sold out / low stock), draft/archived, featured, nested categories (3 levels). **Variants, inventory movements and product pages** arrive in Phase 2.
- **Media library:** per-business image library (folders, search, rename, delete), resized WebP variants, used by every image field.
- API: `GET /websites/me/registry`, `POST/PATCH/DELETE /websites/me/sections[/{id}]`, `POST …/duplicate`, `PUT /websites/me/order`, `POST /websites/me/regenerate`, `/products`, `/categories`, `/media`.

## Commerce, pages & operations (Phases 2–3)

- **Pages & menu:** a storefront has a Home page plus custom pages (`/{slug}/p/{page}`) built from the same sections; a menu manager (drag-free up/down, one dropdown level, links to pages, categories, shop, services, booking, contact, search or external URLs). The menu is automatic until you edit it, and links to things that don't exist are hidden. Pages and the menu are draft until Publish; sections or pages added after the last publish never leak live.
- **Public catalogue:** product pages (gallery, options, stock, reviews, related, `Product` + breadcrumb JSON-LD), category pages, service pages, search with suggestions and recent searches, per-business `sitemap.xml`. Links work on `{slug}.aqivo.shop` too.
- **Cart & checkout** (`/{slug}/checkout`): the browser sends only item ids and quantities; prices, stock, discount, delivery fee and tax are recomputed server-side. Delivery or pickup, delivery areas with fees, free-delivery threshold, tax (inclusive/exclusive), minimum order, discount codes.
- **Orders:** sequential numbers per business, unguessable tracking link for the customer, status flow (new → confirmed → preparing → ready → completed; cancel; refund), timeline, private notes, create-order-by-hand for phone/WhatsApp sales. Cancelling or refunding returns stock. Orders are created atomically under a per-business lock, so stock can't be oversold.
- **Payments (honest):** Pay on delivery/pickup, M-Pesa to *your* till/paybill/phone, bank transfer, or arrange on WhatsApp. The customer can submit their payment code; **you** confirm it. No online card/mobile-money provider is connected yet (Flutterwave, Paystack, Pesapal, DPO, PawaPay, Airtel Money are listed as not connected and nothing is charged). The existing `PaymentProvider` interface is where they plug in.
- **Variants & inventory:** up to 3 options and 100 variants per product, each with its own stock, price and SKU. Stock changes only through an append-only ledger (sale, restock, adjustment, return, cancelled). Inventory view with low/out-of-stock filters and history.
- **Discounts:** percent, fixed, free delivery; minimum order, product/category scope, dates, usage limits, once per customer (by phone).
- **Product reviews:** only from a completed order's tracking token (verified purchase), once per product.
- **Roles:** Owner, Admin, Manager, Sales, Editor, Staff with granular permissions (`orders:*`, `products:*`, `website:*`, `store:*`, `discounts:*`, `inventory:write`). Team invites need the Business plan.
- Courier company APIs are not built: you assign a rider by hand and the customer sees their name, phone and tracking link.

## Growth: attribution, campaigns & the AI operator (Phases 4–5)

- **Source attribution:** the storefront remembers `?source=` / `?campaign=` (and UTM equivalents, else the referrer) for 30 days and stamps them on every view, enquiry, booking and order. Sources are normalised (instagram, tiktok, google, whatsapp, qr, poster…, or your own slug). Analytics → Sources / Funnel / Campaigns / Products show visitors, WhatsApp taps, enquiries, orders + bookings, new customers, conversion and **tracked revenue** (paid online orders + completed bookings) per source and campaign. Visitors are distinct sessions.
- **Links & QR codes** (Marketing → Links & QR): tracked-link builder for any page, product, service, category or custom page; saved QR codes (PNG, SVG, printable A4 poster PDF) with scan counts.
- **Growth campaigns:** one offer across Instagram, WhatsApp, Facebook, TikTok, Google, QR poster and a storefront banner. Copy is built from *your* offer text (no invented prices or discounts; an LLM only polishes wording if `ANTHROPIC_API_KEY` is set) and each channel gets its own tracked link. Optional WhatsApp broadcast list; “add banner to storefront” drops a draft discount banner under your hero.
- **Customer timeline:** enquiries, bookings, orders, payments, reviews, messages and notes in one list, plus where the customer came from. Anonymous browsing before someone identifies themselves is not shown.
- **Today's growth plan** (AI Assistant, and the top 3 on the dashboard): ranked from real data — leads waiting 2+ hours, orders to confirm and payment codes to check, customers inactive 45+ days, reviews to ask for, products people view but don't buy, popular items running low, best/worst channels, campaign results, setup gaps. Each item shows its numbers and may carry a **proposed** action.
- **Actions need your confirmation:** prepare lead follow-ups, win-back messages, review requests (single-use links), a growth campaign (+ discount code if you asked for a percentage), product descriptions. They create *drafts*; Aqivo never sends anything — you tap each WhatsApp link yourself.
- **Ask Aqivo:** answers “what should I do today?”, “which source brings customers?”, “why are my sales down?” (period-over-period facts; it says it can't know *why* customers chose differently), “create a weekend promotion”, product descriptions, and the earlier performance/reactivation questions.
- **Opt-in automations:** once a day Aqivo can *prepare* drafts for waiting leads, inactive customers and review requests and notify you (lazy on opening the plan, or schedule `python -m app.jobs.growth_daily`). Off by default; Pro plan.
- **Not built:** Instagram/TikTok posting, multi-touch attribution (last-touch within 30 days is used). Sending is only through the business's own connected WhatsApp, after the owner confirms a campaign.

## Plans, domains & SEO (Phase 6)

- **Free plan is genuinely useful:** the storefront builder, products, orders and WhatsApp checkout, bookings, customers, leads and reviews are free. Paid plans add things that cost us or grow your business: custom domain, removing the Aqivo credit, source/funnel analytics, ad pixels (Grow); M-Pesa, campaigns, AI and the daily plan (Pro); team accounts and locations (Business). Prices, features **and limits** live in the database and are editable at `/admin/plans`; existing databases are upgraded on startup by `PLAN_VERSION` (adds new features/limits, never overwrites prices).
- **Limits & usage:** every plan has numeric limits (products, services, gallery photos, pages, QR codes, library images, custom domains, team members, AI questions a month; a missing limit = unlimited). Hitting one returns a clear 402 “Your Free plan includes 30 products. Upgrade to add more.” Settings → Plan usage shows the bars. A lapsed plan locks paid features but never deletes data.
- **Custom domains:** add `www.yourshop.co.ke`, paste two DNS records (a TXT to prove ownership and a CNAME/A to point at us), press *Check now*. Verification uses real DNS lookups and an observed HTTPS connection — nothing is assumed. Verified domains serve the storefront; make one your **main address** and the aqivo.shop link and any other domain 301-redirect to it, canonical URLs, sitemap, QR codes and shared links switch over. Config: `CUSTOM_DOMAIN_CNAME`, `CUSTOM_DOMAIN_IPS`. **HTTPS certificates are not issued by this app** — put it behind a proxy with on-demand TLS (Caddy, Cloudflare for SaaS…); the app reports TLS as active only when a secure connection actually works.
- **SEO tooling:** an audit that checks what you actually publish (titles, descriptions, photos, duplicates, local details, social image) and links to the fix; per-page and per-product titles/descriptions; social share image; redirects (301/302, per business, loop and open-redirect safe); `Product`, `Service`, `BreadcrumbList`, `LocalBusiness` and `FAQPage` structured data; per-business `robots.txt` and `sitemap.xml`.
- **Tracking & branding:** Google Analytics 4 and Meta Pixel IDs (validated, injected only on the published storefront — never in the builder; arbitrary tag-manager scripts are deliberately not allowed because storefronts share an origin). Add your own cookie notice if you advertise to EU/UK visitors.
- **Integrations (honest):** WhatsApp, Instagram/Facebook/TikTok profile links, Google review/Maps links (the review button appears on your review page and reviews section), GA4, Meta Pixel, manual M-Pesa. *Not built:* Instagram posting, Google Merchant Center, Pesapal/DPO/PawaPay/Airtel checkout.
- **Billing:** subscription receipts as PDF; `/subscriptions/usage`. Payments for subscriptions still go through the existing M-Pesa provider when configured.

## Connections (your own accounts)
Dashboard → **Connections**. Bizora never holds money or sends from its own number: each business connects its own accounts. Secrets are encrypted at rest (Fernet, key derived from `SECRET_KEY`), write-only (the API only returns a masked hint) and never logged.
- **Paystack / Flutterwave** — card & mobile-money checkout redirect. Set the webhook URL shown on the card. Webhooks are signature-verified per business, idempotent, and an order is marked paid only when amount and currency match. The customer's return page also verifies with the provider.
- **M-Pesa STK push (your Daraja)** — PIN prompt to the customer (KES stores). Callback uses a per-business secret.
- **WhatsApp Cloud API** — order-status messages (opt-out in Checkout settings), confirmed campaigns, login codes, and a reply inbox. Free text only inside WhatsApp's 24-hour window; otherwise your approved template names are used. Paste the webhook URL and verify token into Meta.
- **Instagram (Graph API) / Google Places** — feed and reviews sections, cached 6 h, stale copy served if the provider fails.
- **Customer accounts** — phone/email OTP (sent on WhatsApp when connected, else email; in development the code is returned in the API response only), httpOnly per-store cookie, saved products, addresses, order history.
- **Collections** — hand-picked product groups usable as sections, menu items, links and QR codes.
- **Rate limiting** — set `REDIS_URL` for a shared limiter across workers; falls back to in-process if unset or unreachable.

**Testing honesty:** provider adapters are covered by tests that mock the providers' HTTP APIs and signatures. They have not been exercised against live Paystack/Flutterwave/Daraja/Meta/Instagram/Google accounts — run each card's "Test connection" and one real small payment/message with your own credentials before relying on them.

### Roadmap
All six phases and the connections layer are built. Remaining: Pesapal/DPO/PawaPay/Airtel checkout, publishing to Instagram, Google Merchant Center, courier-company APIs, one-click Google/Instagram sign-in.
