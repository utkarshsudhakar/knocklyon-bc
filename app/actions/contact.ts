"use server";

// Email delivery via Resend (https://resend.com — free tier: 100 emails/day)
//
// Setup (one-time):
//   1. Create a free account at resend.com
//   2. Go to API Keys → Create API Key → copy it
//   3. Add to .env.local:
//        RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
//        CONTACT_EMAIL=your-club-email@example.com
//        CONTACT_FROM=KBC Website <noreply@yourdomain.com>
//            (if you don't have a verified domain yet, use: onboarding@resend.dev)
//
// If env vars are missing the form will still appear to work locally
// (submissions are logged to the console instead).

export type ContactState = {
  status: "idle" | "success" | "error";
  error?: string;
};

export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName  = (formData.get("lastName")  as string)?.trim();
  const email     = (formData.get("email")      as string)?.trim();
  const mobile    = (formData.get("mobile")     as string)?.trim();
  const biNumber  = (formData.get("biNumber")   as string)?.trim();
  const message   = (formData.get("message")    as string)?.trim();

  // Basic server-side validation
  if (!firstName || !lastName || !email || !message) {
    return { status: "error", error: "Please fill in all required fields." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", error: "Please enter a valid email address." };
  }

  const apiKey    = process.env.RESEND_API_KEY;
  const toEmail   = process.env.CONTACT_EMAIL;
  const fromEmail = process.env.CONTACT_FROM ?? "onboarding@resend.dev";

  if (!apiKey || !toEmail) {
    // Env vars not set yet — log to console in dev so nothing is silently lost
    console.log("[Contact form submission — configure RESEND_API_KEY to email this]", {
      firstName, lastName, email, mobile, biNumber, message,
    });
    return { status: "success" };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: email,
      subject: `New enquiry from ${firstName} ${lastName}`,
      html: `
        <table style="font-family:sans-serif;font-size:14px;color:#1c1917;max-width:560px;width:100%">
          <tr><td style="padding:24px 0 8px">
            <h2 style="margin:0;font-size:18px;color:#1B5E35">
              New enquiry — Knocklyon Badminton Club
            </h2>
          </td></tr>
          <tr><td style="padding:4px 0"><strong>Name:</strong> ${firstName} ${lastName}</td></tr>
          <tr><td style="padding:4px 0"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></td></tr>
          ${mobile   ? `<tr><td style="padding:4px 0"><strong>Mobile:</strong> ${mobile}</td></tr>` : ""}
          ${biNumber ? `<tr><td style="padding:4px 0"><strong>BI Number:</strong> ${biNumber}</td></tr>` : ""}
          <tr><td style="padding:16px 0 4px"><strong>Message:</strong></td></tr>
          <tr><td style="padding:0 0 0 12px;border-left:3px solid #1B5E35;white-space:pre-line">
            ${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </td></tr>
        </table>
      `,
    });

    return { status: "success" };
  } catch (err) {
    console.error("[Contact form] Resend error:", err);
    return { status: "error", error: "Something went wrong. Please try again or email us directly." };
  }
}
