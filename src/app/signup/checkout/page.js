'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

// Checkout handoff. After signup we land here; user picks (or confirms) a
// plan, we ask the server for a subscription_id, then open the Razorpay
// Checkout widget. Payment success redirects to /billing.

const PLANS = [
  { key: 'starter',    name: 'Starter',    price: 5000,  features: ['15 workers', '4 cameras',  'Email alerts'] },
  { key: 'standard',   name: 'Standard',   price: 8000,  features: ['50 workers', '8 cameras',  'WhatsApp alerts', 'Worker photos'] },
  { key: 'pro',        name: 'Pro',        price: 14000, features: ['150 workers', '16 cameras', 'Zones + PPE', 'Priority support'] },
  { key: 'enterprise', name: 'Enterprise', price: 22000, features: ['Unlimited workers', '64 cameras', 'Custom rules', 'Dedicated manager'] },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);
  const [busyPlan, setBusyPlan] = useState(null);
  const [razorpayReady, setRazorpayReady] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setChecking(true);
    try {
      const res = await fetch('/api/billing/status');
      if (res.status === 401) {
        router.push('/login?next=/signup/checkout');
        return;
      }
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setChecking(false);
    }
  }

  async function startCheckout(planKey) {
    setError(null);
    setBusyPlan(planKey);
    try {
      const res = await fetch('/api/billing/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not start checkout');
        setBusyPlan(null);
        return;
      }

      if (!window.Razorpay) {
        setError('Razorpay widget not loaded yet — please retry in a moment');
        setBusyPlan(null);
        return;
      }

      const rzp = new window.Razorpay({
        key: data.razorpay_key_id,
        subscription_id: data.subscription_id,
        name: 'StaffLenz',
        description: `${data.plan} plan — ₹${data.amount_inr.toLocaleString('en-IN')}/month`,
        prefill: {
          name: data.customer?.name,
          email: data.customer?.email,
          contact: data.customer?.contact,
        },
        theme: { color: '#4f46e5' },
        handler: function () {
          // Webhook will confirm the payment asynchronously. Optimistically
          // redirect to the billing page; it'll poll /api/billing/status.
          router.push('/billing?welcome=1');
        },
        modal: {
          ondismiss: function () { setBusyPlan(null); },
        },
      });
      rzp.on('payment.failed', (r) => {
        setError(`Payment failed: ${r.error?.description || 'unknown error'}`);
        setBusyPlan(null);
      });
      rzp.open();
    } catch (e) {
      setError(e.message);
      setBusyPlan(null);
    }
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  }

  const client = status?.client;
  const trialEnds = client?.trial_ends_at ? new Date(client.trial_ends_at) : null;
  const daysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds - new Date()) / (1000 * 60 * 60 * 24))) : null;

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayReady(true)}
      />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900">Choose your plan</h1>
            {daysLeft !== null && daysLeft > 0 && (
              <p className="mt-3 text-gray-600">
                Your free trial ends in <span className="font-semibold text-indigo-600">{daysLeft} days</span>. You can start paying now or later — trial runs either way.
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 max-w-2xl mx-auto p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((p) => (
              <div key={p.key} className="bg-white rounded-2xl shadow-lg p-6 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-gray-900">₹{p.price.toLocaleString('en-IN')}</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-700 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-green-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={busyPlan !== null || !razorpayReady}
                  onClick={() => startCheckout(p.key)}
                  className={`mt-6 w-full py-3 rounded-lg font-semibold transition ${
                    client?.plan === p.key
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  } disabled:opacity-50`}
                >
                  {busyPlan === p.key ? 'Opening checkout…' : client?.plan === p.key ? 'Subscribe' : 'Choose plan'}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a href="/billing" className="text-indigo-600 hover:underline text-sm">
              Skip for now → go to my dashboard
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
