# FunnelOS Affiliate System

A complete, working affiliate program: customers register, log in, get their own
link for every product, send it to their audience, and see every lead that fills
in the form. You mark which leads actually bought, the system works out the
commission, holds it for a week, and then tells you exactly who to pay and where
to send the money.

Everything in this repo runs on free infrastructure. There is nothing to pay for
to get an MVP live.

---

## Try it right now, with nothing to set up

```bash
npm install
npm run dev
```

Open the app and sign in with either sample account:

| Role      | Email                 | Password       |
| --------- | --------------------- | -------------- |
| Admin     | admin@funnelos.app    | admin12345     |
| Affiliate | rahul@funnelos.app    | affiliate123   |

With no database configured the app runs in **demo mode**: a full sample program
(two affiliates, three products, leads at every stage, commissions in and out of
their hold period) lives in your browser's local storage. Every screen and every
rule behaves exactly as it will in production, so you can click through the whole
product before connecting anything. "Reset the demo data" is on the admin
settings page.

---

## How the system works

```
  YOU (admin)                    AFFILIATE                     THEIR AUDIENCE
  ───────────                    ─────────                     ──────────────
  add a product        ──►  gets a link per product  ──►  clicks the link
  set the commission %      copies it, or embeds          fills in the form
                            the form on any page          (name, email, phone)
                                                                 │
                                  ┌──────────────────────────────┘
                                  ▼
                       lead is stored against THAT affiliate
                       welcome email to the lead
                       notification email to you
                       lead POSTed to the FunnelOS automation webhook
                                  │
  you mark the lead  ◄────────────┘
  as purchased, with
  the real sale amount
          │
          ▼
  commission = sale x commission %
  held for 7 days (configurable)
          │
          ▼
  it appears under "Ready to transfer" with the
  affiliate's bank details. You transfer the money
  and record the reference. The affiliate sees it
  land in their dashboard.
```

### What each side sees

**The affiliate dashboard** (`/#/app`)

- Clicks, leads, purchases and conversion rate
- A link and a copy-paste embed snippet for every live product
- Their own leads only, with name, email and phone, searchable and exportable as CSV
- Every commission with its amount, the rate it was earned at, and the exact date it is credited
- Earnings split into "in hold", "ready to be paid" and "already paid"
- Their bank details, which they can update at any time

**The admin panel** (`/#/admin`)

- Program totals: affiliates, clicks, leads, revenue, commission owed and paid
- Leads by affiliate, so you can see who is actually sending business
- Products with price and commission percentage
- Every lead in the program, filterable by affiliate, product and status, exportable as CSV
- One click to record a purchase against a lead, with a live preview of the commission
- Payouts grouped per affiliate, with their bank and UPI details right there, and a record of every transfer
- Program settings: hold period, currency, notification emails, WhatsApp number, FunnelOS webhook

---

## Going live (all free)

You need two things: a Supabase project (database, auth, API) and somewhere to
host a static site. Both have permanent free tiers.

### 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a project. The free
   plan gives you a Postgres database, authentication and edge functions.
2. Open **SQL Editor**, paste in the contents of
   `supabase/migrations/20260916090000_funnelos_affiliate.sql`, and run it.
3. Do the same with `supabase/migrations/20260916090100_funnelos_rpc.sql`.

That creates every table, the row level security policies, and the server side
functions. (With the Supabase CLI installed you can run `supabase db push`
instead.)

### 2. Point the app at it

Copy `.env.example` to `.env.local` and fill in the two values from
**Settings → API** in Supabase:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Restart `npm run dev`. The demo data disappears and the app is now talking to
your database.

### 3. Create your admin account

Register through the normal sign-up page. **The first account to register
becomes the admin** automatically, so a fresh deployment is never locked out.
Everyone who registers after that is an affiliate.

If you ever need to promote someone else, run this in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

### 4. Deploy the site (pick one)

All four options below are free and take a couple of minutes. The app uses a
hash router, so it works on any static host with no rewrite rules.

| Host                | Free tier                          | How                                                                                   |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| **Vercel** (easiest)| 100 GB bandwidth/month, custom domains | Import the GitHub repo. It reads `vercel.json`. Add the two `VITE_` variables under Settings → Environment Variables. |
| **Netlify**         | 100 GB bandwidth/month             | Import the repo. It reads `netlify.toml`. Add the two variables under Site settings → Environment variables. |
| **Cloudflare Pages**| Unlimited bandwidth                | Build command `npm run build`, output directory `dist`. Add the two variables.         |
| **GitHub Pages**    | Free for public repos              | Already wired up: `.github/workflows/deploy.yml` publishes on every push to `main`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository secrets first (Settings → Secrets and variables → Actions), then set Pages → Source to "GitHub Actions". |

Recommendation: **Vercel or Cloudflare Pages**. Both give you a proper custom
domain on the free plan, which matters because affiliate links look more
trustworthy on your own domain than on `github.io`.

After deploying, open the admin settings page and set **Public site URL** to your
live address. That is what affiliate links are built from.

### 5. Turn on the emails (optional but recommended)

Lead capture works without this, but nobody gets an email. To switch emails on,
deploy the edge function and give it an API key from any free email provider:

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref

# Pick ONE provider:
supabase secrets set RESEND_API_KEY=re_...     # resend.com, 3,000 emails/month free
supabase secrets set BREVO_API_KEY=xkeysib-... # brevo.com,  300 emails/day free

supabase functions deploy lead-capture --no-verify-jwt
```

Then in the admin settings page fill in **Send lead emails from** (an address on a
domain you have verified with the provider) and **Copy every new lead to** (your
own inbox).

The `--no-verify-jwt` flag matters: the lead form is public, filled in by people
who are not signed in.

If the function is not deployed, the app falls back to writing the lead straight
to the database, so **a lead is never lost** just because email is not set up yet.

### 6. Connect the FunnelOS automation

In the admin settings page, set **FunnelOS automation webhook** to the URL of
your automation (a FunnelOS webhook trigger, Zapier, Make, n8n, or anything that
accepts JSON). Every new lead is POSTed there:

```json
{
  "event": "affiliate.lead.created",
  "lead":      { "id": "...", "name": "...", "email": "...", "phone": "...", "source": "...", "createdAt": "..." },
  "product":   { "id": "...", "name": "..." },
  "affiliate": { "id": "...", "name": "...", "code": "..." }
}
```

That is where the WhatsApp or email sequence gets kicked off. Setting the
**WhatsApp number** as well adds a "Chat on WhatsApp now" button for the lead
right after they submit, and a one-click WhatsApp link next to every lead's phone
number in the admin panel.

---

## Putting the form on your own landing page

Every affiliate gets a snippet from their "Products & links" page:

```html
<div id="funnelos-form-RH7K2M4P"></div>
<script src="https://your-app.example.com/embed.js"
        data-funnelos-ref="RH7K2M4P"
        data-funnelos-base="https://your-app.example.com" async></script>
```

Paste it into WordPress, Webflow, Shopify, a raw HTML page, anywhere. It drops in
an iframe that resizes itself to fit, carries the host page's URL through as the
lead's source, and credits every submission to that affiliate. Sharing the plain
link (`https://your-app.example.com/#/r/RH7K2M4P`) works just as well and needs no
landing page at all.

---

## Day to day

**Adding a product.** Admin → Products → Add product. Set the price and the
commission percentage. The dialog shows exactly what an affiliate will earn per
sale. Every affiliate gets a link for it the moment they open their products
page.

**Recording a purchase.** Admin → All leads → "Mark purchased" on the lead. The
sale amount defaults to the product price but you can change it to whatever was
actually paid (a discount, a part payment, an upsell). The commission percentage
is copied onto the sale at that moment, so changing a product's rate later never
rewrites commissions that were already earned.

**Paying an affiliate.** Admin → Payouts. Commissions appear under "Ready to
transfer" once they clear the hold period, grouped per affiliate with their bank
account, IFSC and UPI ID ready to copy. Make the transfer in your banking app,
then click "Mark as paid" and enter the reference. It shows up in the affiliate's
dashboard immediately.

**Changing the hold period.** Admin → Settings → Payout hold. Seven days is the
default. It applies to new sales, not to commissions already earned.

---

## What is in the repo

```
src/lib/affiliate/     Pure business rules: commissions, the payout hold, codes,
                       validation, CSV export. No UI, no database.
src/lib/data/          One backend interface, two implementations:
                         local/     localStorage (demo mode and the test suite)
                         supabase/  production
src/lib/auth/          Session handling and the role gate
src/pages/             site/ auth/ public/ affiliate/ admin/
src/components/        Shared UI plus the lead capture form
public/embed.js        The embeddable form script
supabase/migrations/   The full schema, RLS policies and server side functions
supabase/functions/    The public lead capture edge function (email + webhook)
supabase/tests/        SQL test suite, run against a real Postgres
```

The domain rules live in one place and are used by both backends, so the numbers
on screen in demo mode are produced by exactly the same code as in production.

---

## Testing

```bash
npm test         # 76 unit and integration tests (vitest + Testing Library)
npm run test:db  # the SQL suite: schema, RLS policies and RPCs on real Postgres
npm run test:all # typecheck, then both suites
npm run lint
```

What is covered:

- **Money.** Commission maths, rounding, the 7 day hold, custom hold periods, what
  is pending vs payable vs paid.
- **The rules.** A lead cannot be converted twice. A commission cannot be paid
  twice, cannot be paid early, and cannot be paid to the wrong affiliate. A paid
  commission cannot be deleted. Changing a product's rate does not rewrite past
  commissions. Re-submitting the same form does not inflate a lead count.
- **The screens.** Registration with bank details, sign in and rejection of bad
  credentials, the referral page and form submission, the embedded form, the
  affiliate dashboard's numbers, recording a purchase, recording a payout.
- **Isolation.** An affiliate sees their own leads, commissions and payouts and
  nobody else's. An affiliate cannot reach the admin panel. A signed out visitor
  cannot reach the dashboard.
- **The database itself.** The SQL suite spins up a real PostgreSQL instance,
  applies the migrations (twice, to prove they are re-runnable), and then asserts
  every policy from the perspective of an anonymous visitor, an affiliate and the
  admin: that anonymous users cannot read leads or record sales, that an affiliate
  cannot promote themselves to admin, raise their own commission rate, edit a
  commission or invent a payout, and that the commission and credit date are
  always computed by the server and never taken from the client.

The whole product was also driven end to end in a real browser against the
production build, including submitting the embedded form from a separate landing
page.

---

## Security

- Row level security is on for every table. An affiliate can only ever read their
  own profile, bank details, links, leads, commissions and payouts.
- The only things the public internet can call are three database functions:
  resolve a link, count a click, and submit a lead. Nothing else is reachable
  without signing in.
- Commission amounts and credit dates are computed by a database trigger, so a
  tampered request cannot decide what it gets paid.
- A database trigger stops anyone editing their own role or status, even if they
  craft the request by hand.
- Passwords are handled by Supabase Auth (bcrypt). The local demo backend hashes
  them too, but it is a demo and should never be used for real accounts.
- The lead form has a honeypot field and the CSV export neutralises spreadsheet
  formula injection from lead-supplied text.

---

## What this costs

| Piece            | Service                              | Cost                            |
| ---------------- | ------------------------------------ | ------------------------------- |
| Database + auth  | Supabase free plan                   | 0                               |
| Lead capture API | Supabase edge functions (free plan)  | 0                               |
| Hosting          | Vercel / Netlify / Cloudflare / Pages| 0                               |
| Email            | Resend (3,000/mo) or Brevo (300/day) | 0                               |
| Automation       | Your existing FunnelOS webhook       | 0                               |

The only thing you may eventually want to pay for is a domain name, and even that
is optional while you are validating the MVP.

Supabase pauses a free project after a week with no activity. Opening the
dashboard resumes it, and any real traffic keeps it awake.

---

## Not included (deliberately)

- Automatic payouts. Transfers are made by you, by hand, and recorded in the
  panel. That is what the brief asked for, and it avoids a payment gateway.
- Multi-tier / sub-affiliate commissions.
- Click attribution across devices. A lead is attributed by the link the form was
  submitted from, which is exact and cannot be gamed by cookies.

---

## The earlier project in this repo

The Meta Ads dashboard that used to live at the root is still here, moved to
`/#/adpilot`. Nothing was deleted.
