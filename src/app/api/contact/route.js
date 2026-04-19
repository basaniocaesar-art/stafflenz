import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { sendEmail, emailDemoRequestConfirmation, emailDemoRequestInternal } from '@/lib/email';

const attempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxAttempts = 3;
  const key = `contact:${ip}`;
  const entry = attempts.get(key) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count++;
  attempts.set(key, entry);
  return true;
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, email, phone, company, industry, message, affiliate_code, affiliate_click_id } = body;
  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email required' }, { status: 400 });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const db = getAdminClient();
  const { error } = await db.from('leads').insert({
    name: name.slice(0, 200),
    email: email.toLowerCase().trim().slice(0, 200),
    phone: phone?.slice(0, 20) || null,
    company: company?.slice(0, 200) || null,
    industry: industry || null,
    message: message?.slice(0, 2000) || null,
    ip_address: ip,
    affiliate_code: affiliate_code?.toUpperCase().trim().slice(0, 50) || null,
  });

  if (error) {
    console.error('Lead insert error:', error.message);
  }

  // Send emails (non-blocking — don't await, don't let failure affect response)
  sendEmail({
    to: email,
    subject: "We've received your demo request — LenzAI",
    html: emailDemoRequestConfirmation({ name, industry: industry || 'your industry' }),
  }).catch(() => {});

  sendEmail({
    to: process.env.INTERNAL_NOTIFY_EMAIL || 'team@lenzai.org',
    subject: `🔔 New Demo Request — ${name} (${industry || 'Unknown'})`,
    html: emailDemoRequestInternal({ name, email, company, industry, phone, message, affiliate_code }),
  }).catch(() => {});

  // Record affiliate conversion if code present
  if (affiliate_code) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/affiliate/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: affiliate_code,
          lead_email: email,
          lead_name: name,
          conversion_type: 'lead',
          click_id: affiliate_click_id || null,
        }),
      });
    } catch (e) {
      console.error('Affiliate conversion error:', e.message);
    }
  }

  return NextResponse.json({ success: true, message: 'Thank you! We will contact you within 24 hours.' });
}
