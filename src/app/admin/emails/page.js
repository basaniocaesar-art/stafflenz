'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  emailDemoRequestConfirmation,
  emailDemoRequestInternal,
  emailPartnerApplicationReceived,
  emailPartnerApplicationApproved,
  emailPartnerApplicationRejected,
  emailAffiliateWelcome,
  emailCommissionPaid,
  emailClientWelcome,
} from '@/lib/email';

// ---------------------------------------------------------------------------
// Sample data for previews
// ---------------------------------------------------------------------------

const PREVIEWS = {
  demo_confirmation: emailDemoRequestConfirmation({ name: 'Sarah Johnson', industry: 'Hotel' }),
  lead_internal: emailDemoRequestInternal({
    name: 'Sarah Johnson',
    email: 'sarah@grandhotel.com',
    company: 'Grand Hotel Group',
    industry: 'Hotel',
    phone: '+1 555 0123',
    message: 'We have 3 properties and want to monitor all of them.',
    affiliate_code: 'JOHN2024',
  }),
  partner_received: emailPartnerApplicationReceived({
    full_name: 'James Wilson',
    partner_type: 'Reseller',
    email: 'james@techcorp.com',
  }),
  partner_approved: emailPartnerApplicationApproved({
    full_name: 'James Wilson',
    partner_type: 'Reseller Partner',
    affiliate_code: 'JAMES24',
    commission_rate: 35,
  }),
  partner_rejected: emailPartnerApplicationRejected({ full_name: 'James Wilson' }),
  affiliate_welcome: emailAffiliateWelcome({
    name: 'James Wilson',
    code: 'JAMES24',
    commission_rate: 35,
    partner_type: 'Reseller',
  }),
  commission_paid: emailCommissionPaid({
    name: 'James Wilson',
    amount: '847.50',
    conversion_count: 5,
    period: 'March 2026',
  }),
  client_welcome: emailClientWelcome({
    admin_name: 'Sarah Johnson',
    company_name: 'Grand Hotel Group',
    industry: 'Hotel',
    admin_email: 'sarah@grandhotel.com',
    login_url: 'https://stafflenz.com/login',
  }),
};

// ---------------------------------------------------------------------------
// Template metadata
// ---------------------------------------------------------------------------

const TEMPLATES = [
  {
    key: 'demo_confirmation',
    icon: '📧',
    name: 'Demo Request Confirmation',
    trigger: 'Sent when someone submits the contact form',
    recipient: 'Lead',
    recipientColor: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'lead_internal',
    icon: '🔔',
    name: 'New Lead Internal',
    trigger: 'Sent to team when demo request arrives',
    recipient: 'Internal team',
    recipientColor: 'bg-purple-100 text-purple-700',
  },
  {
    key: 'partner_received',
    icon: '📋',
    name: 'Partner Application Received',
    trigger: 'Sent when partner applies',
    recipient: 'Applicant',
    recipientColor: 'bg-yellow-100 text-yellow-700',
  },
  {
    key: 'partner_approved',
    icon: '✅',
    name: 'Partner Approved',
    trigger: 'Sent when admin approves application',
    recipient: 'Partner',
    recipientColor: 'bg-green-100 text-green-700',
  },
  {
    key: 'partner_rejected',
    icon: '❌',
    name: 'Partner Rejected',
    trigger: 'Sent when admin rejects application',
    recipient: 'Partner',
    recipientColor: 'bg-red-100 text-red-700',
  },
  {
    key: 'affiliate_welcome',
    icon: '🤝',
    name: 'Affiliate Welcome',
    trigger: 'Sent when affiliate account is created',
    recipient: 'Affiliate',
    recipientColor: 'bg-indigo-100 text-indigo-700',
  },
  {
    key: 'commission_paid',
    icon: '💰',
    name: 'Commission Paid',
    trigger: 'Sent when commission is marked as paid',
    recipient: 'Affiliate',
    recipientColor: 'bg-emerald-100 text-emerald-700',
  },
  {
    key: 'client_welcome',
    icon: '🏢',
    name: 'Client Welcome',
    trigger: 'Sent when new client is onboarded',
    recipient: 'Client Admin',
    recipientColor: 'bg-orange-100 text-orange-700',
  },
];

// ---------------------------------------------------------------------------
// Preview modal
// ---------------------------------------------------------------------------

function PreviewModal({ template, onClose }) {
  if (!template) return null;

  const html = PREVIEWS[template.key] || '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{template.icon}</span>
            <h2 className="text-lg font-bold text-gray-900">{template.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
            aria-label="Close preview"
          >
            ✕
          </button>
        </div>

        {/* Modal body — rendered email preview */}
        <div className="p-6">
          <div
            style={{
              maxWidth: 600,
              margin: '0 auto',
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
              borderRadius: 12,
              overflow: 'auto',
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template card
// ---------------------------------------------------------------------------

function TemplateCard({ template, onPreview }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <span className="text-3xl flex-shrink-0">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base leading-snug">{template.name}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{template.trigger}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${template.recipientColor}`}
        >
          To: {template.recipient}
        </span>
        <button
          onClick={() => onPreview(template)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
        >
          Preview
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EmailTemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState(null);

  useEffect(() => {
    fetch('/api/admin')
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/login');
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Checking access...</div>
      </div>
    );
  }

  return (
    <>
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Admin
            </a>
            <span className="text-gray-300">/</span>
            <h1 className="text-base font-bold text-gray-900">Email Templates</h1>
          </div>
          <p className="text-sm text-gray-400 hidden sm:block">
            Templates are sent automatically at key events.
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Email Templates</h2>
            <p className="text-gray-500 mt-1 text-sm">
              {TEMPLATES.length} templates &mdash; all sent automatically via Resend.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TEMPLATES.map((template) => (
              <TemplateCard
                key={template.key}
                template={template}
                onPreview={setActiveTemplate}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Preview modal */}
      {activeTemplate && (
        <PreviewModal
          template={activeTemplate}
          onClose={() => setActiveTemplate(null)}
        />
      )}
    </>
  );
}
