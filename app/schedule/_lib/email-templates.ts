// Email templates for the scheduling portal.
//
// Built for maximum compatibility across Gmail / Outlook / Apple Mail / mobile
// clients. All rules are INLINE — no <style> block, no external CSS.

const FOREST = "#1B5E35";
const FOREST_DARK = "#14492A";
const FOREST_TINT = "#e8f1eb";
const ZINC_900 = "#18181b";
const ZINC_700 = "#3f3f46";
const ZINC_500 = "#71717a";
const ZINC_300 = "#d4d4d8";
const ZINC_100 = "#f4f4f5";
const WHITE = "#ffffff";

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDateLong(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTimeFriendly(hhmm: string | null | undefined): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":");
  const hn = parseInt(h, 10);
  if (!Number.isFinite(hn)) return hhmm;
  const period = hn >= 12 ? "pm" : "am";
  const h12 = hn % 12 === 0 ? 12 : hn % 12;
  return m === "00" ? `${h12}${period}` : `${h12}:${m}${period}`;
}

function divisionSuffix(division: string | null | undefined): string {
  return division ? ` (${division})` : "";
}

/** Bulletproof button — table-cell with `bgcolor` so Outlook renders it. */
function button(label: string, href: string): string {
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate">
      <tr>
        <td align="center" bgcolor="${FOREST}" style="background-color:${FOREST};border-radius:8px;mso-padding-alt:14px 28px">
          <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT_STACK};font-size:15px;font-weight:600;line-height:1;color:${WHITE};text-decoration:none;border-radius:8px">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

type Audience = "secretary" | "captain";

function footerLine(audience: Audience): string {
  if (audience === "captain") {
    return `You&rsquo;re receiving this because you&rsquo;re marked as your team&rsquo;s captain in our records.<br>If that&rsquo;s not you, please let us know by replying to this email.`;
  }
  return `You&rsquo;re receiving this because you&rsquo;re marked as your club&rsquo;s match secretary in our records.<br>If that&rsquo;s not you, please let us know by replying to this email.`;
}

/** Outer shell. bodyInner is trusted HTML. */
function shell({
  preheader,
  bodyInner,
  audience = "secretary",
}: {
  preheader: string;
  bodyInner: string;
  audience?: Audience;
}): string {
  const logoUrl = process.env.EMAIL_LOGO_URL ?? "";
  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Knocklyon Badminton Club</title>
<!--[if mso]>
<style type="text/css">
  table, td, p, a, span { font-family: Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body bgcolor="${ZINC_100}" style="margin:0;padding:0;background-color:${ZINC_100};font-family:${FONT_STACK};color:${ZINC_900};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Preheader (invisible; shown in inbox previews) -->
<div style="display:none;font-size:1px;color:${ZINC_100};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">
${escapeHtml(preheader)}
</div>

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${ZINC_100}" style="background-color:${ZINC_100}">
  <tr>
    <td align="center" style="padding:32px 12px">

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:${WHITE};border-radius:12px;border-collapse:separate" bgcolor="${WHITE}">

        <!-- Brand header -->
        <tr>
          <td bgcolor="${FOREST}" style="background-color:${FOREST};padding:24px 32px;border-radius:12px 12px 0 0" align="center">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  ${logoUrl
                    ? `<img src="${logoUrl}" width="64" height="80" alt="Knocklyon Badminton Club" style="display:block;border:0;outline:none;text-decoration:none;height:80px;width:64px;margin:0 auto 10px auto">`
                    : ""}
                  <div style="font-family:${FONT_STACK};font-size:12px;letter-spacing:1.6px;color:${WHITE};font-weight:700;text-transform:uppercase;line-height:1">
                    Knocklyon Badminton Club
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px 32px;font-family:${FONT_STACK};color:${ZINC_900}">
${bodyInner}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#fafafa" style="background-color:#fafafa;border-top:1px solid ${ZINC_300};padding:20px 32px;border-radius:0 0 12px 12px">
            <p style="margin:0;font-family:${FONT_STACK};font-size:12px;color:${ZINC_500};line-height:1.5">
              Knocklyon Badminton Club<br>
              <a href="mailto:info@knocklyonbc.ie" style="color:${FOREST};text-decoration:none">info@knocklyonbc.ie</a>
              &nbsp;&middot;&nbsp;
              <a href="https://knocklyonbc.ie" style="color:${FOREST};text-decoration:none">knocklyonbc.ie</a>
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:16px 0 0;font-family:${FONT_STACK};font-size:11px;color:${ZINC_500};text-align:center;line-height:1.5">
        ${footerLine(audience)}
      </p>

    </td>
  </tr>
</table>

</body>
</html>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 12px 0;font-family:${FONT_STACK};font-size:22px;line-height:1.3;font-weight:700;color:${ZINC_900}">${escapeHtml(text)}</h1>`;
}

function kicker(text: string): string {
  return `<p style="margin:0 0 6px 0;font-family:${FONT_STACK};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${FOREST};font-weight:700">${escapeHtml(text)}</p>`;
}

function p(html: string, mb = 16): string {
  return `<p style="margin:0 0 ${mb}px 0;font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:${ZINC_700}">${html}</p>`;
}

// ── INVITE EMAIL ────────────────────────────────────────────────────────────

export function inviteEmailHtml({
  clubName,
  knocklyonLabel,
  opponentLabel,
  division,
  link,
}: {
  clubName: string;
  knocklyonLabel: string;
  opponentLabel: string;
  division: string | null;
  link: string;
}): string {
  const knocklyonEsc = escapeHtml(knocklyonLabel);
  const opponentEsc = escapeHtml(opponentLabel);
  const clubEsc = escapeHtml(clubName);
  const divSuffix = divisionSuffix(division);
  const divSuffixEsc = escapeHtml(divSuffix);
  const headline = `${knocklyonLabel} vs ${opponentLabel}${divSuffix}`;

  const body = `
    ${kicker("Fixture invitation")}
    ${h1(headline)}
    ${p(`Hi ${clubEsc} secretary,`)}
    ${p(`Knocklyon Badminton Club would like to schedule your two league fixtures this season, <strong>${knocklyonEsc} vs ${opponentEsc}${divSuffixEsc}</strong>. One match at Knocklyon, one at your venue.`)}
    ${p(`Open your personal scheduling portal below. It takes a couple of minutes.`)}

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:12px 0 28px 0">
      <tr>
        <td>${button("Open scheduling portal", link)}</td>
      </tr>
    </table>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${FOREST_TINT}" style="background-color:${FOREST_TINT};border-radius:8px;margin-bottom:24px">
      <tr>
        <td style="padding:18px 20px">
          <p style="margin:0 0 12px 0;font-family:${FONT_STACK};font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${FOREST_DARK};font-weight:700">
            What you&rsquo;ll do
          </p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td valign="top" width="28" style="padding-top:2px;font-family:${FONT_STACK};font-size:14px;font-weight:700;color:${FOREST}">1.</td>
              <td style="font-family:${FONT_STACK};font-size:14px;line-height:1.55;color:${ZINC_700};padding-bottom:10px">
                Pick a date for your visit to Knocklyon from the calendar.
              </td>
            </tr>
            <tr>
              <td valign="top" width="28" style="padding-top:2px;font-family:${FONT_STACK};font-size:14px;font-weight:700;color:${FOREST}">2.</td>
              <td style="font-family:${FONT_STACK};font-size:14px;line-height:1.55;color:${ZINC_700}">
                Suggest two dates and times when you can host Knocklyon at your venue.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${p(`<strong>Your link is unique to ${clubEsc}.</strong> Please don&rsquo;t forward it publicly. If the button doesn&rsquo;t open, paste this URL into your browser:`, 6)}
    <p style="margin:0 0 24px 0;font-family:${FONT_STACK};font-size:12px;line-height:1.5;color:${ZINC_500};word-break:break-all">
      <a href="${link}" style="color:${FOREST};text-decoration:underline">${link}</a>
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#fef9c3" style="background-color:#fef9c3;border-radius:8px;margin-bottom:20px">
      <tr>
        <td style="padding:12px 16px;font-family:${FONT_STACK};font-size:13px;line-height:1.55;color:#713f12">
          <strong>Multiple teams?</strong> If your club has more than one team playing Knocklyon this season, you&rsquo;ll receive a separate invite for each team. Please schedule them all.
        </td>
      </tr>
    </table>

    ${p(`Any questions, just reply to this email and it will come straight to the Knocklyon secretary.`)}

    <p style="margin:28px 0 0 0;font-family:${FONT_STACK};font-size:15px;line-height:1.5;color:${ZINC_700}">
      Kind regards,<br>
      <strong style="color:${ZINC_900}">Knocklyon Badminton Club</strong>
    </p>
  `;

  return shell({
    preheader: `Schedule your two league fixtures for ${headline}.`,
    bodyInner: body,
  });
}

// ── CAPTAIN INVITE ──────────────────────────────────────────────────────────

export function captainInviteEmailHtml({
  captainName,
  teamLabel,
  link,
}: {
  captainName: string | null;
  teamLabel: string; // "Knocklyon M1 (Div 5)"
  link: string;
}): string {
  const teamEsc = escapeHtml(teamLabel);
  const greeting = captainName ? `Hi ${escapeHtml(captainName)},` : "Hi Captain,";

  const body = `
    ${kicker("Home dates needed")}
    ${h1(`Share ${teamEsc}'s home dates`)}
    ${p(greeting)}
    ${p(`As captain of <strong>${teamEsc}</strong>, please share the dates your team can host at Knocklyon this season. Opposing clubs will book their fixtures from the dates you provide.`)}
    ${p(`Open your personal captain portal below. It takes a minute.`)}

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:12px 0 24px 0">
      <tr>
        <td>${button("Open captain portal", link)}</td>
      </tr>
    </table>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${FOREST_TINT}" style="background-color:${FOREST_TINT};border-radius:8px;margin-bottom:20px">
      <tr>
        <td style="padding:16px 20px">
          <p style="margin:0 0 8px 0;font-family:${FONT_STACK};font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${FOREST_DARK};font-weight:700">
            Available hosting days
          </p>
          <p style="margin:0 0 6px 0;font-family:${FONT_STACK};font-size:14px;line-height:1.55;color:${ZINC_700}">
            <strong>Monday</strong> (preferred)
          </p>
          <p style="margin:0 0 6px 0;font-family:${FONT_STACK};font-size:14px;line-height:1.55;color:${ZINC_700}">
            <strong>Tuesday</strong> &amp; <strong>Thursday</strong> (club night, use only if needed)
          </p>
        </td>
      </tr>
    </table>

    ${p(`Please add all the dates when you can play. Matches start at 8:00 PM by default. Once opposing clubs start booking, your dates will fill up on a first-come, first-served basis.`)}

    <p style="margin:0 0 24px 0;font-family:${FONT_STACK};font-size:12px;line-height:1.5;color:${ZINC_500};word-break:break-all">
      <a href="${link}" style="color:${FOREST};text-decoration:underline">${link}</a>
    </p>

    ${p(`Any questions, just reply to this email.`)}

    <p style="margin:28px 0 0 0;font-family:${FONT_STACK};font-size:15px;line-height:1.5;color:${ZINC_700}">
      Thanks,<br>
      <strong style="color:${ZINC_900}">Knocklyon Badminton Club</strong>
    </p>
  `;

  return shell({
    preheader: `Share ${teamLabel}'s home dates for the season.`,
    bodyInner: body,
    audience: "captain",
  });
}

// ── CONFIRMATION EMAIL (both fixtures done) ─────────────────────────────────

export function confirmationEmailHtml({
  clubName,
  knocklyonLabel,
  opponentLabel,
  division,
  homeDate,
  homeTime,
  homeVenue,
  homeVenueMapLink,
  homeGoogleCalLink,
  awayDate,
  awayTime,
  awayVenue,
  awayVenueMapLink,
  awayGoogleCalLink,
}: {
  clubName: string;
  knocklyonLabel: string;
  opponentLabel: string;
  division: string | null;
  homeDate: string;
  homeTime: string | null;
  homeVenue: string;
  homeVenueMapLink: string;
  homeGoogleCalLink: string;
  awayDate: string;
  awayTime: string | null;
  awayVenue: string;
  awayVenueMapLink: string;
  awayGoogleCalLink: string;
}): string {
  const clubEsc = escapeHtml(clubName);
  const divSuffix = divisionSuffix(division);
  const headline = `${knocklyonLabel} vs ${opponentLabel}${divSuffix}`;

  function fixtureCard({
    kickerText,
    matchLabel,
    date,
    time,
    venue,
    mapLink,
    googleCalLink,
  }: {
    kickerText: string;
    matchLabel: string;
    date: string;
    time: string | null;
    venue: string;
    mapLink: string;
    googleCalLink: string;
  }): string {
    const dateStr = escapeHtml(formatDateLong(date));
    const timeStr = time
      ? `<span style="color:${ZINC_700}"> &middot; ${escapeHtml(formatTimeFriendly(time))}</span>`
      : "";
    const venueStr = venue
      ? escapeHtml(venue)
      : `<span style="color:${ZINC_500}">To be confirmed</span>`;
    const mapStr = mapLink
      ? `<br><a href="${mapLink}" style="font-family:${FONT_STACK};font-size:13px;color:${FOREST};text-decoration:none">Open in Google Maps &rarr;</a>`
      : "";
    const calStr = googleCalLink
      ? `
        <tr>
          <td colspan="2" style="padding-top:12px">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td bgcolor="${WHITE}" style="background-color:${WHITE};border:1px solid ${FOREST};border-radius:6px">
                  <a href="${googleCalLink}" target="_blank" style="display:inline-block;padding:8px 14px;font-family:${FONT_STACK};font-size:13px;font-weight:600;color:${FOREST};text-decoration:none;line-height:1">
                    📅 Add to Google Calendar
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
      : "";

    return `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;border-collapse:separate">
        <tr>
          <td width="4" bgcolor="${FOREST}" style="background-color:${FOREST};border-radius:8px 0 0 8px"></td>
          <td style="border:1px solid ${ZINC_300};border-left:0;border-radius:0 8px 8px 0;padding:16px 20px;background:${WHITE}">
            <p style="margin:0 0 4px 0;font-family:${FONT_STACK};font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${FOREST_DARK};font-weight:700">
              ${escapeHtml(kickerText)}
            </p>
            <p style="margin:0 0 14px 0;font-family:${FONT_STACK};font-size:16px;font-weight:600;line-height:1.35;color:${ZINC_900}">
              ${escapeHtml(matchLabel)}
            </p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td valign="top" width="72" style="font-family:${FONT_STACK};font-size:13px;color:${ZINC_500};padding:2px 0">Date</td>
                <td style="font-family:${FONT_STACK};font-size:14px;line-height:1.5;color:${ZINC_900};padding:2px 0">
                  ${dateStr}${timeStr}
                </td>
              </tr>
              <tr>
                <td valign="top" width="72" style="font-family:${FONT_STACK};font-size:13px;color:${ZINC_500};padding:2px 0">Venue</td>
                <td style="font-family:${FONT_STACK};font-size:14px;line-height:1.5;color:${ZINC_900};padding:2px 0">
                  ${venueStr}${mapStr}
                </td>
              </tr>
              ${calStr}
            </table>
          </td>
        </tr>
      </table>
    `;
  }

  const body = `
    ${kicker("✓ Fixtures confirmed")}
    ${h1(headline)}
    ${p(`Hi ${clubEsc} secretary,`)}
    ${p(`Both of your league fixtures against Knocklyon are now confirmed. Full details are below. Please share these with your team.`, 20)}

    ${fixtureCard({
      kickerText: "Home for Knocklyon (at Knocklyon)",
      matchLabel: `${knocklyonLabel} vs ${opponentLabel}`,
      date: homeDate,
      time: homeTime,
      venue: homeVenue,
      mapLink: homeVenueMapLink,
      googleCalLink: homeGoogleCalLink,
    })}

    ${fixtureCard({
      kickerText: "Away for Knocklyon (at your venue)",
      matchLabel: `${opponentLabel} vs ${knocklyonLabel}`,
      date: awayDate,
      time: awayTime,
      venue: awayVenue,
      mapLink: awayVenueMapLink,
      googleCalLink: awayGoogleCalLink,
    })}

    ${p(`Both fixtures are also attached as a <strong>calendar file</strong>. Apple Mail, Outlook, and Gmail will offer an "Add to calendar" prompt for the attachment. Google Cal users can also use the buttons above.`, 8)}
    ${p(`If anything needs to change, just reply and we&rsquo;ll sort it.`, 24)}

    <p style="margin:28px 0 0 0;font-family:${FONT_STACK};font-size:15px;line-height:1.5;color:${ZINC_700}">
      Best of luck for the season,<br>
      <strong style="color:${ZINC_900}">Knocklyon Badminton Club</strong>
    </p>
  `;

  return shell({
    preheader: `Both fixtures confirmed for ${headline}.`,
    bodyInner: body,
  });
}
