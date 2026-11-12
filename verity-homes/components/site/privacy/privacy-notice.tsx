// DRAFT privacy notice (Nigeria Data Protection Act 2023), written from what this site's code
// actually does. Owner/legal review is Open question 39. Bracketed [..] text marks facts the
// owner must supply; do not fill them in without the owner.
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { prefetchFor } from "@/lib/nav";
import styles from "./privacy.module.css";

/** Change this whenever the notice text changes. */
export const PRIVACY_LAST_UPDATED = new Date("2026-11-12T12:00:00+01:00");

export type PrivacyNoticeProps = {
  companyName: string;
  rcNumber: string;
  /** The public office line from settings (the area, or the full address only if allowed). */
  officeDisplay: string;
  /** Contact for privacy requests (SiteSettings.email); a placeholder shows when unset. */
  email: string | null;
};

function Placeholder({ children }: { children: React.ReactNode }) {
  return <span className="ph">[{children}]</span>;
}

export function PrivacyNotice({ companyName, rcNumber, officeDisplay, email }: PrivacyNoticeProps) {
  const contact = email ? (
    <a href={`mailto:${email}`}>{email}</a>
  ) : (
    <Placeholder>privacy contact email — owner to add in site settings</Placeholder>
  );

  return (
    <>
      <p className={styles.banner} role="note" data-testid="privacy-draft-banner">
        <strong>Draft</strong> — to be reviewed by Verity Homes and Properties before launch.
      </p>
      <div className="prose">
        <p className={styles.updated}>
          Last updated: <time dateTime="2026-11-12">{formatDate(PRIVACY_LAST_UPDATED)}</time>
        </p>

        <p>
          This notice explains what personal information this website collects, why, who handles it
          for us, and the rights you have under the Nigeria Data Protection Act 2023.
        </p>

        <h2>Who we are</h2>
        <p>
          This website is run by {companyName} (RC {rcNumber}), a company registered with the
          Corporate Affairs Commission and based in {officeDisplay}. In this notice,
          &ldquo;we&rdquo; and &ldquo;us&rdquo; mean {companyName}.
        </p>

        <h2>What we collect</h2>
        <h3>When you send us an enquiry</h3>
        <p>Our enquiry forms (on the home, property, invest and contact pages) ask for:</p>
        <ul>
          <li>your name and phone number;</li>
          <li>your email address, if you choose to give it;</li>
          <li>
            your message and what you are interested in (for example buying, renting or investing);
          </li>
          <li>the property or investment plan you are asking about, if any;</li>
          <li>the amount you are thinking of investing, if you enter one;</li>
          <li>whether you would like to arrange an inspection.</li>
        </ul>
        <h3>When you sign up for new listings</h3>
        <p>Your email address.</p>
        <h3>To stop spam</h3>
        <p>
          When you send an enquiry we keep a scrambled, one-way code made from your internet (IP)
          address, so we can limit how many enquiries come from one connection. We do not store your
          IP address itself.
        </p>
        <h3>Saved properties</h3>
        <p>
          When you tap the heart on a property, it is saved only in your own browser&apos;s storage
          on your device. It is not sent to us, and you can remove it at any time by clearing this
          site&apos;s data in your browser.
        </p>
        <h3>Technical information</h3>
        <p>
          Like any website, our hosting provider handles technical information such as your IP
          address and browser type in order to deliver the pages to you. This website does not use
          advertising or analytics cookies. Pages with a map load it from Google Maps, and Google
          may set its own cookies when the map loads.
        </p>

        <h2>Why we use it</h2>
        <ul>
          <li>
            To reply to your enquiry and talk to you about the property, plan or service you asked
            about — this is a step you ask us to take before any agreement.
          </li>
          <li>To arrange an inspection when you ask for one.</li>
          <li>
            To email you the new listings you signed up for — based on your consent, which you can
            withdraw at any time.
          </li>
          <li>To protect our forms from spam and abuse — our legitimate interest.</li>
        </ul>
        <p>We do not sell your personal information.</p>

        <h2>Who handles it for us</h2>
        <p>We use these service providers to run the website. They process data on our behalf:</p>
        <ul>
          <li>
            <strong>Neon</strong> — database hosting, where enquiries and sign-ups are stored.
          </li>
          <li>
            <strong>Vercel</strong> — website hosting.
          </li>
          <li>
            <strong>Resend</strong> — email delivery: the details of each enquiry are emailed to our
            team.
          </li>
          <li>
            <strong>Google Maps</strong> — the maps shown on property and contact pages.
          </li>
        </ul>
        <p>
          If you choose to message us on WhatsApp, that conversation is handled by WhatsApp under
          its own terms. These providers may store or process data outside Nigeria.{" "}
          <Placeholder>
            where the data is stored and the safeguards for transfers — owner to confirm
          </Placeholder>
        </p>

        <h2>How long we keep it</h2>
        <p>
          We keep enquiries and sign-ups for{" "}
          <Placeholder>retention period — owner to confirm</Placeholder>, then delete them. Saved
          properties stay in your browser until you clear them.
        </p>

        <h2>Your rights</h2>
        <p>Under the Nigeria Data Protection Act 2023 you can ask us to:</p>
        <ul>
          <li>give you a copy of the personal information we hold about you (access);</li>
          <li>correct information that is wrong or incomplete (correction);</li>
          <li>delete your information (deletion);</li>
          <li>stop using your information, including for new-listing emails (objection);</li>
          <li>
            withdraw your consent at any time — this does not affect anything we did before you
            withdrew it.
          </li>
        </ul>
        <p>
          To make a request, email {contact}, or send us a message through our{" "}
          <Link href="/contact#message" prefetch={prefetchFor("/contact#message")}>
            contact page
          </Link>
          . We may need to confirm who you are before acting on a request. We will reply within{" "}
          <Placeholder>response time — owner to confirm</Placeholder>.
        </p>
        <p>
          If you are not happy with how we handle your information, you can complain to the Nigeria
          Data Protection Commission (NDPC).
        </p>

        <h2>Changes to this notice</h2>
        <p>
          If we change how we use personal information, we will update this page and the &ldquo;Last
          updated&rdquo; date above.
        </p>

        <h2>Contact</h2>
        <p>
          Privacy questions and requests: {contact}. {companyName}, RC {rcNumber}, {officeDisplay}.
        </p>
      </div>
    </>
  );
}
