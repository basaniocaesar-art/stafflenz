'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

// Dual-gateway checkout page.
// - Indian billing_country → Razorpay (INR, embedded widget)
// - Everyone else → Stripe (USD, hosted checkout redirect)
// User can override the auto-detected currency with the toggle at the top.

const PLANS_INR = [
  { key: 'starter',    name: 'Starter',    price: 5000,  features: ['15 workers', '4 cameras',  'Email alerts'] },
  { key: 'standard',   name: 'Standard',   price: 8000,  features: ['50 workers', '8 cameras',  'WhatsApp alerts', 'Worker photos'] },
  { key: 'pro',        name: 'Pro',        price: 14000, features: ['150 workers', '16 cameras', 'Zones + PPE', 'Priority support'] },
  { key: 'enterprise', name: 'Enterprise', price: 22000, features: ['Unlimited workers', '64 cameras', 'Custom rules', 'Dedicated manager'] },
];

const PLANS_USD = [
  { key: 'starter',    name: 'Starter',    price: 79,  features: ['15 workers', '4 cameras',  'Email alerts'] },
  { key: 'standard',   name: 'Standard',   price: 149, features: ['50 workers', '8 cameras',  'WhatsApp alerts', 'Worker photos'] },
  { key: 'pro',        name: 'Pro',        price: 299, features: ['150 workers', '16 cameras', 'Zones + PPE', 'Priority support'] },
  { key: 'enterprise', name: 'Enterprise', price: 499, features: ['Unlimited workers', '64 cameras', 'Custom rules', 'Dedicated manager'] },
];

function formatINR(n) { return '₹' + n.toLocaleString('en-IN'); }
function formatUSD(n) { return '$' + n.toLocaleString('en-US'); }

export default function CheckoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);
  const [busyPlan, setBusyPlan] = useState(null);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [currency, setCurrency] = useState('INR'); // 'INR' | 'USD'

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
      // Auto-pick currency from client's billing_country or stored
      // billing_currency. Default to INR.
      const storedCurrency = data.client?.billing_currency;
      const country = data.client?.billing_country;
      if (storedCurrency) {
        setCurrency(storedCurrency);
      } else if (country && country !== 'IN') {
        setCurrency('USD');
      } else {
        setCurrency('INR');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setChecking(false);
    }
  }

  async function startRazorpay(planKey) {
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
        setError('Razorpay widget not loaded yet — retry in a moment');
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
        handler: () => router.push('/billing?welcome=1&provider=razorpay'),
        modal: { ondismiss: () => setBusyPlan(null) },
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

  async function startStripe(planKey) {
    setError(null);
    setBusyPlan(planKey);
    try {
      const res = await fetch('/api/billing/stripe/create-checkout', {
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
      // Stripe Checkout is a hosted page — just redirect there.
      window.location.href = data.checkout_url;
    } catch (e) {
      setError(e.message);
      setBusyPlan(null);
    }
  }

  function startCheckout(planKey) {
    if (currency === 'USD') return startStripe(planKey);
    return startRazorpay(planKey);
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  }

  const client = status?.client;
  const trialEnds = client?.trial_ends_at ? new Date(client.trial_ends_at) : null;
  const daysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds - new Date()) / (1000 * 60 * 60 * 24))) : null;
  const plans = currency === 'USD' ? PLANS_USD : PLANS_INR;
  const fmt = currency === 'USD' ? formatUSD : formatINR;

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayReady(true)}
      />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-900">Choose your plan</h1>
            {daysLeft !== null && daysLeft > 0 && (
              <p className="mt-3 text-gray-600">
                Your free trial ends in <span className="font-semibold text-indigo-600">{daysLeft} days</span>. Start paying now or later — trial runs either way.
              </p>
            )}
          </div>

          {/* Currency toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-lg bg-white shadow-sm border border-gray-200 p-1">
              <button
                onClick={() => setCurrency('INR')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition ${
                  currency === 'INR' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ₹ INR · India
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition ${
                  currency === 'USD' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                $ USD · International
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 max-w-2xl mx-auto p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((p) => (
              <div key={p.key} className="bg-white rounded-2xl shadow-lg p-6 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-gray-900">{fmt(p.price)}</span>
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
                  disabled={busyPlan !== null || (currency === 'INR' && !razorpayReady)}
                  onClick={() => startCheckout(p.key)}
                  className={`mt-6 w-full py-3 rounded-lg font-semibold transition ${
                    client?.plan === p.key
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  } disabled:opacity-50`}
                >
                  {busyPlan === p.key
                    ? 'Opening checkout…'
                    : client?.plan === p.key
                      ? 'Subscribe'
                      : 'Choose plan'}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            {currency === 'INR'
              ? 'Payments by Razorpay · cards, UPI, netbanking, wallets'
              : 'Payments by Stripe · cards, Apple Pay, Google Pay'}
          </div>

          <div className="mt-4 text-center">
            <a href="/billing" className="text-indigo-600 hover:underline text-sm">
              Skip for now → go to my dashboard
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
