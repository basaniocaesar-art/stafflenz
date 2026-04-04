// Server-only module — no 'use client'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stafflenz.com';

// ---------------------------------------------------------------------------
// Core send function
// ---------------------------------------------------------------------------

async function sendEmail({ to, subject, html, replyTo }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY is not set — skipping email send');
    return { skipped: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'StaffLenz <noreply@stafflenz.com>',
        to,
        subject,
        html,
        reply_to: replyTo,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[email] Resend API error ${res.status}:`, text);
      return { error: true };
    }

    return await res.json();
  } catch (err) {
    console.error('[email] Fetch error:', err);
    return { error: true };
  }
}

// ---------------------------------------------------------------------------
// Shared layout helpers
// ---------------------------------------------------------------------------

function baseLayout(bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:12px 12px 0 0;padding:28px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="display:inline-block;background:#fff;border-radius:8px;width:36px;height:36px;text-align:center;line-height:36px;font-weight:900;font-size:15px;color:#2563eb;font-family:Arial,sans-serif;">SL</div>
                  </td>
                  <td style="vertical-align:middle;padding-left:12px;">
                    <span style="color:#fff;font-weight:700;font-size:20px;letter-spacing:-0.3px;">StaffLenz</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#fff;padding:40px 32px;border-radius:0;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; 2026 StaffLenz &middot; AI-Powered Workforce Intelligence</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(text, href) {
  return `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:8px;margin:8px 0;">${text}</a>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />`;
}

function infoRow(label, value) {
  return `<tr>
    <td style="padding:10px 14px;font-size:13px;color:#64748b;font-weight:600;white-space:nowrap;background:#f8fafc;border-bottom:1px solid #e2e8f0;">${label}</td>
    <td style="padding:10px 14px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${value || '—'}</td>
  </tr>`;
}

function infoTable(rows) {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:20px 0;">
    ${rows}
  </table>`;
}

function highlightBox(content) {
  return `<div style="background:linear-gradient(135deg,#eff6ff,#f5f3ff);border:1px solid #c7d2fe;border-radius:10px;padding:24px;margin:24px 0;text-align:center;">
    ${content}
  </div>`;
}

function codeBox(value) {
  return `<div style="background:#1e293b;color:#e2e8f0;font-family:'Courier New',Courier,monospace;font-size:14px;padding:14px 18px;border-radius:8px;margin:12px 0;word-break:break-all;">${value}</div>`;
}

function bulletList(items) {
  const lis = items.map(item => `<li style="margin-bottom:10px;color:#475569;font-size:15px;">${item}</li>`).join('');
  return `<ol style="padding-left:20px;margin:16px 0;">${lis}</ol>`;
}

// ---------------------------------------------------------------------------
// Template functions
// ---------------------------------------------------------------------------

function emailDemoRequestConfirmation({ name, industry }) {
  const body = `
    <p style="font-size:16px;color:#1e293b;margin:0 0 20px;">Hi ${name},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Thanks for reaching out! We've received your demo request for the <strong>${industry}</strong> industry.</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">Our team will review your details and get back to you within <strong>24 hours</strong>.</p>

    <p style="font-size:15px;font-weight:700;color:#1e293b;margin:0 0 12px;">What happens next:</p>
    ${bulletList([
      'We\'ll review your setup requirements and camera infrastructure.',
      'Schedule a 30-minute discovery call at a time that works for you.',
      'You\'ll see StaffLenz live on your cameras with real AI insights.',
    ])}

    ${divider()}
    <p style="text-align:center;margin:28px 0;">
      ${ctaButton('View StaffLenz Platform &rarr;', APP_URL)}
    </p>
    ${divider()}

    <p style="font-size:14px;color:#94a3b8;margin:0;">If you have any immediate questions, reply to this email.</p>
  `;
  return baseLayout(body);
}

function emailDemoRequestInternal({ name, email, company, industry, phone, message, affiliate_code }) {
  const rows = [
    infoRow('Name', name),
    infoRow('Email', `<a href="mailto:${email}" style="color:#2563eb;">${email}</a>`),
    infoRow('Company', company),
    infoRow('Industry', industry),
    infoRow('Phone', phone),
    infoRow('Message', message ? `<span style="white-space:pre-wrap;">${message}</span>` : null),
    ...(affiliate_code ? [infoRow('Affiliate Code', `<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${affiliate_code}</code>`)] : []),
  ].join('');

  const body = `
    <p style="font-size:18px;font-weight:700;color:#1e293b;margin:0 0 6px;">New Demo Request</p>
    <p style="font-size:14px;color:#94a3b8;margin:0 0 24px;">A new lead has submitted the contact form.</p>

    ${infoTable(rows)}

    <p style="text-align:center;margin:32px 0;">
      ${ctaButton('View in Admin &rarr;', `${APP_URL}/admin`)}
    </p>
  `;
  return baseLayout(body);
}

function emailPartnerApplicationReceived({ full_name, partner_type, email }) {
  const body = `
    <p style="font-size:16px;color:#1e293b;margin:0 0 20px;">Hi ${full_name},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Your <strong>${partner_type}</strong> partner application has been received.</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">Our partnerships team reviews applications within <strong>24 hours</strong>.</p>

    <p style="font-size:15px;font-weight:700;color:#1e293b;margin:0 0 12px;">What you can expect next:</p>
    ${bulletList([
      'Our team will review your application and partner profile.',
      'You\'ll receive an email within 24 hours with our decision.',
      'If approved, you\'ll get instant access to your affiliate dashboard and referral link.',
    ])}

    ${divider()}
    <p style="text-align:center;margin:28px 0;">
      ${ctaButton('View Partner Program &rarr;', `${APP_URL}/partners`)}
    </p>
    ${divider()}

    <p style="font-size:14px;color:#94a3b8;margin:0;">Questions? Reply to this email anytime.</p>
  `;
  return baseLayout(body);
}

function emailPartnerApplicationApproved({ full_name, partner_type, affiliate_code, commission_rate }) {
  const referralLink = `${APP_URL}/?ref=${affiliate_code}`;

  const body = `
    <p style="font-size:16px;color:#1e293b;margin:0 0 8px;">Hi ${full_name}, <strong>Congratulations!</strong> 🎉</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">Your <strong>${partner_type}</strong> application has been approved. Welcome to the StaffLenz Partner Program!</p>

    ${highlightBox(`
      <p style="margin:0 0 6px;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Your Affiliate Code</p>
      <p style="margin:0 0 16px;font-size:32px;font-weight:900;color:#2563eb;font-family:'Courier New',Courier,monospace;letter-spacing:4px;">${affiliate_code}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Commission Rate</p>
      <p style="margin:0 0 16px;font-size:28px;font-weight:900;color:#7c3aed;">${commission_rate}% recurring</p>
      <p style="margin:0 0 6px;font-size:13px;color:#64748b;font-weight:600;">Your referral link:</p>
      <p style="margin:0;font-size:13px;font-family:'Courier New',Courier,monospace;color:#1e293b;word-break:break-all;">${referralLink}</p>
    `)}

    <p style="font-size:15px;font-weight:700;color:#1e293b;margin:24px 0 12px;">Next steps:</p>
    ${bulletList([
      'Log in to your affiliate dashboard to see your stats.',
      'Copy your referral link and start sharing with your network.',
      'Start referring clients and watch your commissions grow.',
    ])}

    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">You'll earn <strong>${commission_rate}% recurring commission</strong> on every active referral.</p>

    ${divider()}
    <p style="text-align:center;margin:28px 0;">
      ${ctaButton('Access Your Dashboard &rarr;', `${APP_URL}/affiliate/login`)}
    </p>
  `;
  return baseLayout(body);
}

function emailPartnerApplicationRejected({ full_name }) {
  const body = `
    <p style="font-size:16px;color:#1e293b;margin:0 0 20px;">Hi ${full_name},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Thank you for your interest in the StaffLenz Partner Program.</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">After reviewing your application, we're unable to move forward at this time.</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">This may be because the program is currently full in your region or the profile doesn't match our current needs.</p>

    ${divider()}

    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">We'd love to stay in touch — we regularly open new partner slots and are always expanding into new regions.</p>

    <p style="text-align:center;margin:28px 0;">
      ${ctaButton('Stay Updated &rarr;', `${APP_URL}/blog`)}
    </p>

    ${divider()}

    <p style="font-size:14px;color:#94a3b8;margin:0;">You're welcome to reapply in 90 days.</p>
  `;
  return baseLayout(body);
}

function emailAffiliateWelcome({ name, code, commission_rate, partner_type }) {
  const referralLink = `${APP_URL}/?ref=${code}`;

  const body = `
    <p style="font-size:16px;color:#1e293b;margin:0 0 8px;">Hi ${name}, <strong>you're all set!</strong></p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">Your affiliate account is active. Here are your details:</p>

    ${highlightBox(`
      <table cellpadding="0" cellspacing="0" style="width:100%;text-align:left;">
        <tr>
          <td style="padding:8px 12px;font-size:13px;color:#64748b;font-weight:600;">Affiliate Code</td>
          <td style="padding:8px 12px;font-size:20px;font-weight:900;color:#2563eb;font-family:'Courier New',Courier,monospace;letter-spacing:3px;">${code}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-size:13px;color:#64748b;font-weight:600;">Commission Rate</td>
          <td style="padding:8px 12px;font-size:17px;font-weight:700;color:#7c3aed;">${commission_rate}% recurring</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-size:13px;color:#64748b;font-weight:600;">Partner Type</td>
          <td style="padding:8px 12px;font-size:14px;color:#1e293b;">${partner_type}</td>
        </tr>
      </table>
    `)}

    <p style="font-size:14px;font-weight:600;color:#1e293b;margin:20px 0 6px;">Your referral link:</p>
    ${codeBox(referralLink)}

    <p style="font-size:15px;font-weight:700;color:#1e293b;margin:24px 0 12px;">Tips for success:</p>
    ${bulletList([
      'Share your referral link in your professional network, newsletter, or social media.',
      'Use our co-branded materials available in your dashboard to increase conversions.',
      'Track your clicks, referrals, and commissions in real time from your dashboard.',
    ])}

    ${divider()}
    <p style="text-align:center;margin:28px 0;">
      ${ctaButton('Go to Your Dashboard &rarr;', `${APP_URL}/affiliate/login`)}
    </p>
    ${divider()}

    <p style="font-size:14px;color:#94a3b8;margin:0;">Every client you refer earns you <strong>${commission_rate}% recurring commission</strong>.</p>
  `;
  return baseLayout(body);
}

function emailCommissionPaid({ name, amount, conversion_count, period }) {
  const body = `
    <p style="font-size:16px;color:#1e293b;margin:0 0 8px;">Hi ${name}, <strong>great news!</strong> 💰</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">Your commission payment of <strong>$${amount}</strong> has been processed.</p>

    ${highlightBox(`
      <p style="margin:0 0 4px;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Payment Amount</p>
      <p style="margin:0 0 20px;font-size:36px;font-weight:900;color:#2563eb;">$${amount}</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;text-align:left;">
        <tr>
          <td style="padding:6px 12px;font-size:13px;color:#64748b;font-weight:600;">Period</td>
          <td style="padding:6px 12px;font-size:14px;color:#1e293b;font-weight:600;">${period}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px;font-size:13px;color:#64748b;font-weight:600;">Conversions</td>
          <td style="padding:6px 12px;font-size:14px;color:#1e293b;font-weight:600;">${conversion_count} client${conversion_count !== 1 ? 's' : ''}</td>
        </tr>
      </table>
    `)}

    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">Payment will arrive in your account within <strong>2–3 business days</strong>.</p>

    ${divider()}
    <p style="text-align:center;margin:28px 0;">
      ${ctaButton('View in Dashboard &rarr;', `${APP_URL}/affiliate/login`)}
    </p>
  `;
  return baseLayout(body);
}

function emailClientWelcome({ admin_name, company_name, industry, admin_email, login_url }) {
  const body = `
    <p style="font-size:16px;color:#1e293b;margin:0 0 20px;">Hi ${admin_name},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;"><strong>${company_name}</strong>'s StaffLenz account has been set up for the <strong>${industry}</strong> industry.</p>

    ${highlightBox(`
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#1e293b;">Your Login Credentials</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;text-align:left;">
        <tr>
          <td style="padding:8px 12px;font-size:13px;color:#64748b;font-weight:600;">Email</td>
          <td style="padding:8px 12px;font-size:14px;color:#1e293b;">${admin_email}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-size:13px;color:#64748b;font-weight:600;">Password</td>
          <td style="padding:8px 12px;font-size:14px;color:#475569;font-style:italic;">As set by your administrator</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-size:13px;color:#64748b;font-weight:600;">Login URL</td>
          <td style="padding:8px 12px;font-size:14px;"><a href="${login_url}" style="color:#2563eb;">${login_url}</a></td>
        </tr>
      </table>
    `)}

    <p style="font-size:15px;font-weight:700;color:#1e293b;margin:24px 0 12px;">Getting started:</p>
    ${bulletList([
      'Log in and explore your dashboard — your analytics are ready to go.',
      'Connect your first camera to begin capturing AI-powered workforce insights.',
      'Set up your WhatsApp alert number to receive real-time notifications.',
    ])}

    ${divider()}
    <p style="text-align:center;margin:28px 0;">
      ${ctaButton('Log In Now &rarr;', login_url)}
    </p>
    ${divider()}

    <p style="font-size:14px;color:#94a3b8;margin:0;">Your dedicated support contact: <a href="mailto:support@stafflenz.com" style="color:#2563eb;">support@stafflenz.com</a></p>
  `;
  return baseLayout(body);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  sendEmail,
  emailDemoRequestConfirmation,
  emailDemoRequestInternal,
  emailPartnerApplicationReceived,
  emailPartnerApplicationApproved,
  emailPartnerApplicationRejected,
  emailAffiliateWelcome,
  emailCommissionPaid,
  emailClientWelcome,
};
