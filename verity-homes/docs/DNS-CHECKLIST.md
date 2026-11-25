# DNS + environment checklist (launch)

Everything still needed to finish the launch, in the order to do it, so it can be done in
**one sitting**. Have these open in separate tabs before you start:

1. **Whogohost**: client area, then Domains, then `verityhomes.ng`, then **Manage DNS**. The
   DNS for the domain lives here (not at Vercel).
2. **Resend**: resend.com, then **Domains**.
3. **Clerk**: dashboard.clerk.com, the Verity application.
4. **Hostinger**: hPanel, then **Emails**, then `verityhomes.ng`, then **DNS settings /
   Authentication**.
5. **Google Search Console**: search.google.com/search-console.
6. **Vercel**: the project, then **Settings → Environment Variables**.

Already done (do not change): the website records (`www` and the root, which point at Vercel)
and the Hostinger **MX** records (`mx1.hostinger.com` / `mx2.hostinger.com`).

> **Name field at Whogohost.** Most Whogohost DNS screens want only the part before the domain
> (type `send`, not `send.verityhomes.ng`). Use `@` (or leave it empty) for the root. If a record
> doesn't verify after an hour, check whether the panel added `.verityhomes.ng` twice.
>
> **TTL.** Use **3600** (1 hour) unless the screen only offers "Auto". DNS changes can take from a
> few minutes to a few hours to show up; the "Verify" buttons below can be pressed again later.
>
> **One SPF record only.** A domain must have exactly ONE TXT record starting with `v=spf1`. Never
> add a second one: edit the existing one.

---

## 1. Resend (website enquiry emails), domain `verityhomes.ng`

The website sends the enquiry notification emails through Resend from
`website@verityhomes.ng`.

**In Resend:** Domains, then **Add domain**, then enter `verityhomes.ng`, choose the region
offered by default, then **Add**. Resend then shows the records below. **Copy the values from
that screen exactly**: the DKIM key is unique to Verity.

| Type | Name (at Whogohost) | Value | Priority | TTL | Why |
| --- | --- | --- | --- | --- | --- |
| MX | `send` | copy from Resend (looks like `feedback-smtp.<region>.amazonses.com`) | 10 | 3600 | Bounces and complaints for website emails come back to Resend |
| TXT | `send` | copy from Resend (`v=spf1 include:amazonses.com ~all`) | — | 3600 | Allows Resend to send for the `send.` sub-domain (this is NOT the root SPF; see section 3) |
| TXT | `resend._domainkey` | copy from Resend (a long `p=MIG…` key) | — | 3600 | DKIM signature, so Gmail/Outlook trust the emails |

Then press **Verify DNS records** in Resend. When it says **Verified**, go on to section 6.

Resend uses the `send.` sub-domain for its SPF and bounce records, so the **root** SPF record
(section 3) does **not** need anything from Resend. If Resend's screen ever asks you to add
`include:amazonses.com` to the root, merge it into the one root record as shown in section 3.

---

## 2. Clerk production (admin sign-in) for `www.verityhomes.ng`

The admin currently signs in through Clerk's **Development** instance (test keys). For launch,
create the **Production** instance:

1. Clerk dashboard, then the Verity application, then the instance switcher (top) → **Create
   production instance**. Choose to **clone the development settings**.
2. Domain: enter `verityhomes.ng`. (Clerk uses sub-domains of the root, e.g.
   `clerk.verityhomes.ng`; the website itself stays on `www.verityhomes.ng`.)
3. Clerk then lists **DNS records** (Configure, then **Domains**). Add each one at Whogohost:

| Type | Name (at Whogohost) | Value | TTL | Why |
| --- | --- | --- | --- | --- |
| CNAME | `clerk` | copy from Clerk (`frontend-api.clerk.services`) | 3600 | Clerk's sign-in API on our domain |
| CNAME | `accounts` | copy from Clerk (`accounts.clerk.services`) | 3600 | Clerk's hosted sign-in pages |
| CNAME | `clkmail` | copy from Clerk (`mail.<id>.clerk.services`) | 3600 | Clerk's own emails (verification codes) |
| CNAME | `clk._domainkey` | copy from Clerk (`dkim1.<id>.clerk.services`) | 3600 | DKIM for Clerk's emails |
| CNAME | `clk2._domainkey` | copy from Clerk (`dkim2.<id>.clerk.services`) | 3600 | DKIM for Clerk's emails |

   Use the exact names and values Clerk shows; the `<id>` parts are unique to Verity. Press
   **Verify configuration**. SSL certificates for the Clerk sub-domains are issued automatically
   once DNS is verified (this can take up to an hour or so).

4. **Session token** (needed for the admin check): Configure, then **Sessions**, then
   **Customize session token**, then make sure it contains:

   ```json
   { "metadata": "{{user.public_metadata}}" }
   ```

   (The development instance already has this; check it was cloned.)

5. **Re-create the admin user** in the production instance (users are not copied):
   Users, then **Create user**, then Esther's email (and a password, or let her set one). Open the
   user, then **Metadata**, then **Public**, then set:

   ```json
   { "role": "admin" }
   ```

   Repeat for anyone else who should manage the site. A signed-in user without this role sees
   "You don't have access".

6. **API keys**: in the production instance, API keys, then copy the **Publishable key**
   (`pk_live_…`) and the **Secret key** (`sk_live_…`) for section 6. Don't paste them anywhere
   else.

---

## 3. Hostinger mailbox (`info@` and other @verityhomes.ng addresses)

The mailbox is already verified and the MX records already point at Hostinger. Still needed:
**SPF, DKIM and DMARC**, so emails from the Hostinger mailbox don't land in spam.

### SPF (edit the ONE existing `v=spf1` record)

Look at the TXT records for the root (`@`). If there is already one starting with `v=spf1`,
**edit it** instead of adding another. The final, merged value should be:

```
v=spf1 include:_spf.mail.hostinger.com ~all
```

- `include:_spf.mail.hostinger.com`: Hostinger's mail servers may send for `@verityhomes.ng`.
- Resend is **not** included here: it uses the `send.` sub-domain (section 1). Only if Resend's
  screen explicitly asks for a root SPF entry, the merged record becomes
  `v=spf1 include:_spf.mail.hostinger.com include:amazonses.com ~all` (still ONE record).
- Check the exact Hostinger value in hPanel (Emails, then DNS settings): if it shows a different
  include, use Hostinger's.

| Type | Name | Value | TTL | Why |
| --- | --- | --- | --- | --- |
| TXT | `@` | `v=spf1 include:_spf.mail.hostinger.com ~all` | 3600 | Which servers may send email as @verityhomes.ng |

### DKIM (Hostinger)

In hPanel (Emails, then DNS settings / Authentication), Hostinger shows its DKIM records.
They are usually three CNAMEs:

| Type | Name | Value | TTL | Why |
| --- | --- | --- | --- | --- |
| CNAME | `hostingermail-a._domainkey` | copy from hPanel (`hostingermail-a.dkim.mail.hostinger.com`) | 3600 | Signs emails sent from the mailbox |
| CNAME | `hostingermail-b._domainkey` | copy from hPanel (`hostingermail-b.dkim.mail.hostinger.com`) | 3600 | (second key) |
| CNAME | `hostingermail-c._domainkey` | copy from hPanel (`hostingermail-c.dkim.mail.hostinger.com`) | 3600 | (third key) |

Use whatever hPanel lists if it differs from the above.

### DMARC (start in "monitor only" mode)

| Type | Name | Value | TTL | Why |
| --- | --- | --- | --- | --- |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@verityhomes.ng` | 3600 | Tells Gmail/Outlook how to treat failures; `p=none` only reports, it never blocks mail |

- `rua=` is where the daily reports go: use a real Verity mailbox (the example uses
  `info@verityhomes.ng`; **check it exists**. The site settings currently show
  `into@verityhomes.ng`, which looks like a typo for `info@`).
- After 2–4 weeks of reports showing everything passes, change `p=none` to `p=quarantine`.
- If a `_dmarc` record already exists, edit it rather than adding another.

---

## 4. Google Search Console (domain property)

1. Search Console, then **Add property**, then **Domain**, then enter `verityhomes.ng`, then
   **Continue**.
2. Google shows a TXT record. Add it at Whogohost:

| Type | Name | Value | TTL | Why |
| --- | --- | --- | --- | --- |
| TXT | `@` | copy from Search Console (`google-site-verification=…`) | 3600 | Proves to Google that Verity owns the domain (covers www and every page) |

3. Press **Verify** (wait and retry if it fails at first).
4. Then **Sitemaps**, then submit `https://www.verityhomes.ng/sitemap.xml`.

This TXT record is separate from SPF: it's fine to have several TXT records on `@`, just not two
`v=spf1` ones. With DNS verification you don't need `NEXT_PUBLIC_GSC_VERIFICATION`.

(Optional) **Bing Webmaster Tools**: bing.com/webmasters, then **Import from Google Search
Console** (fastest), or add the site and use the meta-tag method with
`NEXT_PUBLIC_BING_VERIFICATION` (section 6).

---

## 5. Check the records

After an hour, check each name with a public lookup tool (e.g. dnschecker.org → type + name):
`send.verityhomes.ng` (MX, TXT), `resend._domainkey.verityhomes.ng` (TXT),
`clerk.verityhomes.ng` (CNAME), `verityhomes.ng` (TXT: exactly one `v=spf1`),
`_dmarc.verityhomes.ng` (TXT).

---

## 6. Vercel: Production environment variables

Vercel, then the project, then **Settings → Environment Variables**. For each variable choose
the **Production** environment only (unless noted). Names only below; never paste the values
into chats or documents. After changing variables, **redeploy** (Deployments, then the latest,
then **Redeploy**) so the site uses them.

| Variable | Set to | When |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk production **Publishable key** (`pk_live_…`) | After section 2 |
| `CLERK_SECRET_KEY` | Clerk production **Secret key** (`sk_live_…`) | After section 2 |
| `ENQUIRY_FROM` | `Verity Homes <website@verityhomes.ng>` | After Resend says **Verified** |
| `ENQUIRY_NOTIFY_TO` | the mailbox that should receive enquiry emails (e.g. `info@verityhomes.ng`) | Now |
| `RESEND_API_KEY` | already set; only replace if you create a new key | — |
| `DIRECT_URL` | already set (needed: database updates run during each deploy) | Don't remove |
| `NEXT_PUBLIC_GA_ID` | GA4 measurement ID (`G-…`) from Google Analytics, Admin, then Data streams | When you have it |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel ID (digits) from Meta Events Manager | When you run Meta ads |
| `NEXT_PUBLIC_GSC_VERIFICATION` | only if NOT verifying Google by DNS (section 4): the `content` value of Google's HTML tag | Optional |
| `NEXT_PUBLIC_BING_VERIFICATION` | Bing's `msvalidate.01` content value | Optional |

Notes:

- Setting `NEXT_PUBLIC_GA_ID` or `NEXT_PUBLIC_META_PIXEL_ID` turns on the cookie banner.
  Nothing is tracked until a visitor clicks **Accept**.
- After switching Clerk to production, sign in at `https://www.verityhomes.ng/admin` with the
  re-created admin user to check access.
- Leave the **Preview** environment on the Clerk development keys, so preview deployments never
  touch the production sign-in.
