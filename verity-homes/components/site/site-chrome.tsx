import { getSiteSettings } from "@/lib/db/queries/settings";
import { whatsappLink } from "@/lib/whatsapp";
import { Footer } from "./footer";
import { Header } from "./header";
import { Preloader } from "./preloader";
import { BackToTop, ScrollProgress } from "./scroll-ui";
import { WhatsAppFloat } from "./whatsapp-float";

const WHATSAPP_GREETING = "Hello Verity Homes and Properties, I would like to make an enquiry.";

/**
 * Header, footer and floating buttons around a public page. Shared by app/(site)/layout.tsx
 * and app/not-found.tsx (which sits outside the (site) group).
 */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const wa = whatsappLink(settings.whatsapp, WHATSAPP_GREETING);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <ScrollProgress />
      <Preloader />
      {/* No WhatsApp number yet: the button goes to the contact form instead. */}
      <Header whatsappHref={wa ?? "/contact#message"} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
      <WhatsAppFloat href={wa} />
      <BackToTop />
    </>
  );
}
