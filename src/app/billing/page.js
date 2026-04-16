'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Client billing portal — shows current plan, subscription status, next
// renewal, and payment history. Cancel button ends subscription at cycle end.

const STATUS_COPY = {
  trialing:   { label: 'Free trial',     color: 'bg-blue-100 text-blue-800' },
  active:     { label: 'Active',         color: 'bg-green-100 text-green-800' },
  past_due:   { label: 'Payment failed', color: 'bg-yellow-100 text-yellow-800' },
  cancelled:  { label: 'Cancelled',      color: 'bg-gray-100 text-gray-800' },
  incomplete: { label: 'Incomplete',     color: 'bg-orange-100 text-orange-800' },
  none:       { label: 'No plan',        color: 'bg-gray-100 text-gray-600' },
};

export default function BillingPortal() {
  const router = useRouter();
  const search = useSearchParams();
  const showWelcome = search.get('welcome') === '1';
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/status');
      if (res.status === 401) { router.push('/login?next=/billing'); return; }
      const data = await res.json();
      setState(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function cancelSub() {
    if (!confirm('Cancel subscription at the end of the current billing period?')) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Cancel failed'); return; }
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCancelling(false);
    }
  }

  async function openStripePortal() {
    setError(null);
    try {
      const res = await fetch('/api/billing/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not open portal'); return; }
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;

  const client = state?.client;
  const plan = state?.plan;
  const payments = state?.payments || [];
  const status = client?.subscription_status || 'none';
  const copy = STATUS_COPY[status] || STATUS_COPY.none;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
          <a href="/dashboard" className="text-sm text-indigo-600 hover:underline">← back to dashboard</a>
        </div>

        {showWelcome && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
            🎉 Welcome! Your subscription is being confirmed — it can take a minute for the confirmation to arrive.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>
        )}

        {/* Current plan card */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-500">Current plan</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 capitalize">{client?.plan || '—'}</div>
              {plan && (
                <div className="mt-1 text-gray-600">
                  ₹{plan.price_inr.toLocaleString('en-IN')}/month · up to {plan.max_workers} workers · {plan.max_cameras} cameras
                </div>
              )}
            </div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${copy.color}`}>
              {copy.label}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {client?.trial_ends_at && status === 'trialing' && (
              <Field label="Trial ends" value={new Date(client.trial_ends_at).toLocaleDateString()} />
            )}
            {client?.current_period_end && (
              <Field label="Next renewal" value={new Date(client.current_period_end).toLocaleDateString()} />
            )}
            {client?.billing_email && <Field label="Billing email" value={client.billing_email} />}
          </div>

          {client?.payment_provider === 'stripe' && (
            <div className="mt-4 text-xs text-gray-500">
              Billed in USD via Stripe · managed through the Stripe customer portal
            </div>
          )}

          <div className="mt-6 flex gap-3 flex-wrap">
            {(status === 'trialing' || status === 'cancelled' || status === 'none' || status === 'incomplete') && (
              <a href="/signup/checkout" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold">
                {status === 'cancelled' ? 'Reactivate' : 'Choose a plan'}
              </a>
            )}
            {status === 'active' && client?.payment_provider === 'stripe' && (
              <button
                onClick={openStripePortal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
              >
                Manage in Stripe Portal
              </button>
            )}
            {status === 'active' && client?.payment_provider !== 'stripe' && (
              <button
                onClick={cancelSub}
                disabled={cancelling}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-semibold disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Cancel subscription'}
              </button>
            )}
            {status === 'past_due' && (
              <a href="/signup/checkout" className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold">
                Update payment
              </a>
            )}
          </div>
        </div>

        {/* Payment history */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment history</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500">No payments yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {payments.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-gray-900">
                      ₹{((p.amount_inr || 0) / 100).toLocaleString('en-IN')} {p.currency || 'INR'}
                    </div>
                    <div className="text-gray-500">
                      {p.description || p.method || 'Payment'} ·
                      {' '}{new Date(p.paid_at || p.created_at).toLocaleString()}
                    </div>
                    {p.error_description && (
                      <div className="text-red-600 text-xs mt-1">{p.error_description}</div>
                    )}
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className="text-gray-900 font-medium">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    captured:   'bg-green-100 text-green-800',
    authorized: 'bg-blue-100 text-blue-800',
    failed:     'bg-red-100 text-red-800',
    refunded:   'bg-gray-100 text-gray-800',
    created:    'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
