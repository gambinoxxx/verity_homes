// Sends the enquiry notification. Never throws: returns false on any failure so the caller
// (which has already saved the enquiry) can keep emailSentAt = null.
import "server-only";
import { emailEnv, env } from "@/lib/env";
import { resend } from "./client";
import { buildEnquiryEmail, type EnquiryEmailData } from "./enquiry-template";

export type { EnquiryEmailData };

export async function sendEnquiryEmail(data: EnquiryEmailData): Promise<boolean> {
  try {
    const { ENQUIRY_FROM, ENQUIRY_NOTIFY_TO } = emailEnv();
    const { subject, html, text } = buildEnquiryEmail(data, env.NEXT_PUBLIC_SITE_URL);
    const { error } = await resend().emails.send({
      from: ENQUIRY_FROM,
      to: [ENQUIRY_NOTIFY_TO],
      ...(data.email ? { replyTo: data.email } : {}),
      subject,
      html,
      text,
    });
    if (error) {
      console.error(`Enquiry ${data.id}: email not sent (${error.name}: ${error.message})`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(
      `Enquiry ${data.id}: email not sent (${e instanceof Error ? e.message : "unknown error"})`,
    );
    return false;
  }
}
