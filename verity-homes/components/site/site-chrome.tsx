import { getSiteSettings } from "@/lib/db/queries/settings";
import { Analytics } from "./analytics";
import { LeadSourceCapture } from "./lead-source-capture";
import { Footer } from "./footer";
import { Header } from "./header";
import { Preloader } from "./preloader";
import { BackToTop, ScrollProgress } from "./scroll-ui";
import { WhatsAppFloat } from "./whatsapp-float";

/**
 * Header, footer and floating buttons around a public page. Shared by app/(site)/layout.tsx
 * and app/not-found.tsx (which sits outside the (site) group).
 */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <ScrollProgress />
      <Preloader />
      {/* WhatsApp buttons name the current page (PageWhatsAppLink); with no number set the
          header button goes to the contact form and the float is hidden. */}
      <Header whatsappNumber={settings.whatsapp} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
      <WhatsAppFloat number={settings.whatsapp} />
      <BackToTop />
      {/* Cookie banner + GA4/Meta Pixel; nothing renders until an ID is set in the env. */}
      <Analytics />
      <LeadSourceCapture />
    </>
  );
}
