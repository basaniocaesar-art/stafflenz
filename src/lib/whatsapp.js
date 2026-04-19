// WhatsApp alerts via Twilio
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

export async function sendWhatsApp(to, message) {
  if (!TWILIO_SID || !TWILIO_TOKEN) {
    console.warn('Twilio credentials not set — WhatsApp not sent');
    return { ok: false, error: 'Twilio not configured' };
  }

  // Ensure number is in whatsapp: format
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: FROM,
        To: toFormatted,
        Body: message,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    console.error('Twilio error:', data);
    return { ok: false, error: data.message };
  }
  return { ok: true, sid: data.sid };
}

// Pre-built alert templates
export function alertMessage(type, details) {
  const { zone, camera, time, name, violation } = details;
  const t = time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const templates = {
    ppe_violation: `🚨 *PPE VIOLATION DETECTED*\n\n${violation || 'Missing safety equipment'}\nZone: ${zone}\nCamera: ${camera}\nTime: ${t}\n\nPlease take immediate action.`,
    staff_absent: `⚠️ *ZONE UNATTENDED*\n\n${zone} has been empty for too long.\nCamera: ${camera}\nTime: ${t}\n\nPlease send staff immediately.`,
    attendance: `✅ *ATTENDANCE ALERT*\n\n${name} detected at ${zone}\nCamera: ${camera}\nTime: ${t}`,
    breach: `🔴 *SECURITY BREACH*\n\nUnauthorised access detected.\nZone: ${zone}\nCamera: ${camera}\nTime: ${t}\n\nPlease investigate immediately.`,
    custom: `📢 *LENZAI ALERT*\n\n${violation}\nZone: ${zone || 'N/A'}\nTime: ${t}`,
  };

  return templates[type] || templates.custom;
}
