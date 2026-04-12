'use client';
import { useState, useEffect, useCallback } from 'react';

/* ── Theme constants ──────────────────────────────────────────────────────── */
const S = {
  sidebar: '#0a1128',
  bg:      '#070d1b',
  card:    '#0d1631',
  border:  '#1e2d4a',
  blue:    '#3b82f6',
  cyan:    '#22d3ee',
  muted:   '#475569',
  text:    '#e2e8f0',
};

const INDUSTRIES = [
  { id: 'factory',      label: 'Factory',      icon: '🏭' },
  { id: 'hotel',        label: 'Hotel',        icon: '🏨' },
  { id: 'school',       label: 'School',       icon: '🏫' },
  { id: 'retail',       label: 'Retail',       icon: '🛍️' },
  { id: 'gym',          label: 'Gym',          icon: '🏋️' },
  { id: 'hospital',     label: 'Hospital',     icon: '🏥' },
  { id: 'construction', label: 'Construction', icon: '🏗️' },
  { id: 'warehouse',    label: 'Warehouse',    icon: '📦' },
  { id: 'restaurant',   label: 'Restaurant',   icon: '🍽️' },
  { id: 'security',     label: 'Security',     icon: '🛡️' },
];

const DVR_BRANDS = [
  { id: 'hikvision', label: 'Hikvision', path: 'Menu → Configuration → Network → Advanced → FTP' },
  { id: 'dahua',     label: 'Dahua',     path: 'Main Menu → Setting → Network → FTP' },
  { id: 'cpplus',    label: 'CP Plus',   path: 'Main Menu → Setting → Network → FTP' },
  { id: 'other',     label: 'Other',     path: 'Look under Network/Upload/FTP settings in your DVR admin' },
];

const DVR_BRANDS_EMAIL = [
  { id: 'hikvision', label: 'Hikvision', path: 'Configuration → Network → Advanced → Email → Set sender and test' },
  { id: 'dahua',     label: 'Dahua',     path: 'Main Menu → Setting → Network → Email → Enable SMTP' },
  { id: 'cpplus',    label: 'CP Plus',   path: 'Main Menu → Setting → Network → Email → Enable and test' },
  { id: 'other',     label: 'Other',     path: 'Look under Network/Email/SMTP settings in your DVR admin' },
];

const DVR_BRANDS_HTTP = [
  { id: 'hikvision', label: 'Hikvision', path: 'Configuration → Event → Linkage → HTTP Listening → Add server URL' },
  { id: 'dahua',     label: 'Dahua',     path: 'Setting → Event → Video Detection → HTTP Upload → Set target URL' },
  { id: 'cpplus',    label: 'CP Plus',   path: 'Setting → Network → HTTP → Paste URL (enable HTTP upload)' },
  { id: 'other',     label: 'Other',     path: 'Look for "HTTP Push", "HTTP Alert" or "HTTP Listening" in your DVR' },
];

/* ── Small Spinner ────────────────────────────────────────────────────────── */
function Spinner({ size = 16 }) {
  return (
    <div
      className="border-2 border-t-transparent rounded-full animate-spin inline-block"
      style={{ width: size, height: size, borderColor: S.cyan, borderTopColor: 'transparent' }}
    />
  );
}

/* ── Progress Bar ─────────────────────────────────────────────────────────── */
function ProgressBar({ step }) {
  const labels = ['Site Info', 'Connect Cameras', "You're All Set"];
  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-8">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold tracking-wide" style={{ color: S.cyan }}>
          Step {step} of 3
        </span>
        <span className="text-xs uppercase tracking-wider" style={{ color: S.muted }}>
          {labels[step - 1]}
        </span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: S.border }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${(step / 3) * 100}%`,
            background: `linear-gradient(90deg, ${S.blue}, ${S.cyan})`,
          }}
        />
      </div>
      <div className="flex justify-between mt-2">
        {labels.map((l, i) => (
          <div key={l} className="flex-1 text-center">
            <div
              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
              style={{
                background: i + 1 <= step ? S.cyan : S.border,
                color: i + 1 <= step ? '#0a1128' : S.muted,
              }}
            >
              {i + 1 < step ? '✓' : i + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Step 1: Site Info ────────────────────────────────────────────────────── */
function StepSiteInfo({ state, setState, onContinue, saving }) {
  const canContinue = state.industry && state.site_name.trim().length > 0;
  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Tell us about your site</h1>
      <p className="text-sm mb-8" style={{ color: S.muted }}>
        We'll use this to tailor StaffLenz to your operation.
      </p>

      <label className="block text-xs uppercase tracking-wider mb-3" style={{ color: S.muted }}>
        Industry
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {INDUSTRIES.map((ind) => {
          const active = state.industry === ind.id;
          return (
            <button
              key={ind.id}
              type="button"
              onClick={() => setState({ ...state, industry: ind.id })}
              className="rounded-2xl p-4 text-center border transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: active ? `${S.blue}22` : S.card,
                borderColor: active ? S.cyan : S.border,
                boxShadow: active ? `0 0 0 1px ${S.cyan}, 0 8px 24px ${S.blue}22` : 'none',
              }}
            >
              <div className="text-3xl mb-2">{ind.icon}</div>
              <div className="text-sm font-medium text-white">{ind.label}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: S.muted }}>
            Site name
          </label>
          <input
            type="text"
            value={state.site_name}
            onChange={(e) => setState({ ...state, site_name: e.target.value })}
            placeholder="e.g. Main Factory"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none border focus:ring-2"
            style={{ background: S.card, borderColor: S.border }}
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: S.muted }}>
            Site address
          </label>
          <input
            type="text"
            value={state.address}
            onChange={(e) => setState({ ...state, address: e.target.value })}
            placeholder="Street, city, state"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none border"
            style={{ background: S.card, borderColor: S.border }}
          />
        </div>
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs uppercase tracking-wider" style={{ color: S.muted }}>
            Number of cameras
          </label>
          <span
            className="px-3 py-1 rounded-full text-sm font-bold"
            style={{ background: `${S.cyan}22`, color: S.cyan }}
          >
            {state.num_cameras}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="32"
          value={state.num_cameras}
          onChange={(e) => setState({ ...state, num_cameras: Number(e.target.value) })}
          className="w-full accent-cyan-400"
          style={{ accentColor: S.cyan }}
        />
        <div className="flex justify-between text-[10px] mt-1" style={{ color: S.muted }}>
          <span>1</span><span>8</span><span>16</span><span>24</span><span>32</span>
        </div>
      </div>

      <button
        onClick={onContinue}
        disabled={!canContinue || saving}
        className="w-full py-4 rounded-2xl text-base font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01]"
        style={{ background: `linear-gradient(90deg, ${S.blue}, ${S.cyan})` }}
      >
        {saving ? <Spinner /> : 'Continue →'}
      </button>
    </div>
  );
}

/* ── Step 2: Connect Cameras ──────────────────────────────────────────────── */
function StepConnectCameras({ state, setState, onContinue, saving }) {
  const [ftp, setFtp] = useState(state.ftp_credentials || null);
  const [email, setEmail] = useState(state.email_credentials || null);
  const [webhook, setWebhook] = useState(state.webhook_credentials || null);
  const [showPass, setShowPass] = useState(false);
  const [showEmailPass, setShowEmailPass] = useState(false);
  const [copyStatus, setCopyStatus] = useState(null);
  const [emailCopyStatus, setEmailCopyStatus] = useState(null);
  const [httpCopyStatus, setHttpCopyStatus] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [emailGenLoading, setEmailGenLoading] = useState(false);
  const [httpGenLoading, setHttpGenLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [dvrBrand, setDvrBrand] = useState(state.dvr_brand || 'hikvision');
  const [emailDvrBrand, setEmailDvrBrand] = useState(state.email_dvr_brand || 'hikvision');
  const [httpDvrBrand, setHttpDvrBrand] = useState(state.http_dvr_brand || 'hikvision');
  const [dvrSenderEmail, setDvrSenderEmail] = useState(state.dvr_sender_email || '');

  const method = state.connection_method;

  async function ensureFtpCreds() {
    if (ftp) return ftp;
    setGenLoading(true);
    try {
      const r = await fetch('/api/onboarding/generate-ftp', { method: 'POST' });
      const j = await r.json();
      if (r.ok) {
        setFtp(j);
        setState((prev) => ({ ...prev, ftp_credentials: j }));
        return j;
      }
    } finally {
      setGenLoading(false);
    }
    return null;
  }

  async function ensureEmailCreds() {
    if (email) return email;
    setEmailGenLoading(true);
    try {
      const r = await fetch('/api/onboarding/generate-email', { method: 'POST' });
      const j = await r.json();
      if (r.ok) {
        setEmail(j);
        setState((prev) => ({ ...prev, email_credentials: j }));
        return j;
      }
    } finally {
      setEmailGenLoading(false);
    }
    return null;
  }

  async function ensureWebhookCreds() {
    if (webhook) return webhook;
    setHttpGenLoading(true);
    try {
      const r = await fetch('/api/onboarding/generate-webhook', { method: 'POST' });
      const j = await r.json();
      if (r.ok) {
        setWebhook(j);
        setState((prev) => ({ ...prev, webhook_credentials: j }));
        return j;
      }
    } finally {
      setHttpGenLoading(false);
    }
    return null;
  }

  async function selectMethod(m) {
    setState({ ...state, connection_method: m });
    if (m === 'ftp') await ensureFtpCreds();
    if (m === 'email') await ensureEmailCreds();
    if (m === 'http') await ensureWebhookCreds();
  }

  function copyHttpUrl() {
    if (!webhook?.webhook_url) return;
    navigator.clipboard?.writeText(webhook.webhook_url);
    setHttpCopyStatus('Copied!');
    setTimeout(() => setHttpCopyStatus(null), 2000);
  }

  function copyEmailAll() {
    if (!email) return;
    const text = `SMTP Server: ${email.smtp_host}\nSMTP Port: ${email.smtp_port}\nUsername: ${email.smtp_username}\nPassword: ${email.smtp_password}\nUse SSL/TLS: Yes\nSend to: ${email.recipient_email}\nFrom address: (any — e.g. dvr@yourdomain.com)`;
    navigator.clipboard?.writeText(text);
    setEmailCopyStatus('Copied!');
    setTimeout(() => setEmailCopyStatus(null), 2000);
  }

  function copyAll() {
    if (!ftp) return;
    const text = `FTP Server: ${ftp.ftp_host}\nPort: ${ftp.ftp_port}\nUsername: ${ftp.ftp_username}\nPassword: ${ftp.ftp_password}\nDirectory: ${ftp.ftp_directory}`;
    navigator.clipboard?.writeText(text);
    setCopyStatus('Copied!');
    setTimeout(() => setCopyStatus(null), 2000);
  }

  async function testConnection() {
    setTestLoading(true);
    setTestResult(null);
    try {
      const r = await fetch('/api/onboarding/test-ftp', { method: 'POST' });
      const j = await r.json();
      setTestResult(j);
      setState((prev) => ({ ...prev, test_result: j }));
    } catch {
      setTestResult({ connected: false, message: 'Test failed' });
    } finally {
      setTestLoading(false);
    }
  }

  const CardShell = ({ children, active, onClick, recommended }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl p-5 text-left border transition-all duration-200 hover:scale-[1.005]"
      style={{
        background: active ? `${S.blue}1a` : S.card,
        borderColor: active ? S.cyan : S.border,
        boxShadow: active ? `0 0 0 1px ${S.cyan}, 0 12px 32px ${S.blue}22` : 'none',
      }}
    >
      {recommended && (
        <span
          className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-2"
          style={{ background: `${S.cyan}22`, color: S.cyan }}
        >
          Recommended
        </span>
      )}
      {children}
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Connect your cameras</h1>
      <p className="text-sm mb-8" style={{ color: S.muted }}>
        Choose how StaffLenz should receive camera feeds. You can change this later.
      </p>

      <div className="space-y-3 mb-6">
        {/* Card A: Email (easiest — no DVR network config) */}
        <CardShell active={method === 'email'} recommended onClick={() => selectMethod('email')}>
          <div className="flex items-start gap-3">
            <div className="text-3xl">📧</div>
            <div className="flex-1">
              <div className="text-base font-semibold text-white mb-1">
                DVR sends snapshots by email
              </div>
              <div className="text-sm" style={{ color: S.muted }}>
                Simplest setup. No file server needed. Works through any network.
              </div>
            </div>
          </div>

          {method === 'email' && (
            <div className="mt-5 space-y-4" onClick={(e) => e.stopPropagation()}>
              {emailGenLoading && (
                <div className="flex items-center gap-2 text-sm" style={{ color: S.muted }}>
                  <Spinner /> Generating mailbox...
                </div>
              )}

              {email && (
                <>
                  <div className="rounded-xl p-4 border space-y-2 text-sm font-mono" style={{ background: S.bg, borderColor: S.border }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: S.cyan }}>
                      Enter these into your DVR's Email/SMTP settings
                    </div>
                    <Row label="SMTP Server" value={email.smtp_host} />
                    <Row label="SMTP Port" value={String(email.smtp_port)} />
                    <Row label="Username" value={email.smtp_username} />
                    <Row
                      label="Password"
                      value={showEmailPass ? email.smtp_password : '•'.repeat(email.smtp_password?.length || 16)}
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowEmailPass(!showEmailPass)}
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ color: S.cyan, background: `${S.cyan}15` }}
                        >
                          {showEmailPass ? 'Hide' : 'Show'}
                        </button>
                      }
                    />
                    <Row label="SSL/TLS" value="Enabled" />
                    <Row label="Send To" value={email.recipient_email} />
                    <div className="pt-2 flex items-center justify-between border-t" style={{ borderColor: S.border }}>
                      <button
                        type="button"
                        onClick={copyEmailAll}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: S.cyan, color: '#0a1128' }}
                      >
                        Copy all
                      </button>
                      {emailCopyStatus && (
                        <span className="text-xs" style={{ color: S.cyan }}>{emailCopyStatus}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: S.muted }}>
                      DVR sender email (what address your DVR sends from)
                    </label>
                    <input
                      type="email"
                      value={dvrSenderEmail}
                      onChange={(e) => {
                        setDvrSenderEmail(e.target.value);
                        setState((p) => ({ ...p, dvr_sender_email: e.target.value }));
                      }}
                      placeholder="e.g. dvr@yourdomain.com"
                      className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none border"
                      style={{ background: S.bg, borderColor: S.border }}
                    />
                    <div className="text-[11px] mt-1" style={{ color: S.muted }}>
                      Helps us match incoming emails to your site. You can enter any address your DVR is configured to send from.
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider mb-2" style={{ color: S.muted }}>
                      Your DVR brand
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      {DVR_BRANDS_EMAIL.map((b) => {
                        const on = emailDvrBrand === b.id;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => { setEmailDvrBrand(b.id); setState((p) => ({ ...p, email_dvr_brand: b.id })); }}
                            className="px-3 py-2 rounded-lg text-xs font-medium border transition-all"
                            style={{
                              background: on ? `${S.cyan}20` : 'transparent',
                              borderColor: on ? S.cyan : S.border,
                              color: on ? S.cyan : S.text,
                            }}
                          >
                            {b.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="rounded-lg p-3 text-xs" style={{ background: S.bg, color: S.muted }}>
                      <span className="font-semibold" style={{ color: S.text }}>
                        {DVR_BRANDS_EMAIL.find((b) => b.id === emailDvrBrand)?.label}:
                      </span>{' '}
                      {DVR_BRANDS_EMAIL.find((b) => b.id === emailDvrBrand)?.path}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardShell>

        {/* Card: HTTP Push — DVR posts snapshots directly to our URL */}
        <CardShell active={method === 'http'} onClick={() => selectMethod('http')}>
          <div className="flex items-start gap-3">
            <div className="text-3xl">⚡</div>
            <div className="flex-1">
              <div className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                HTTP Push (instant)
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                  fastest
                </span>
              </div>
              <div className="text-sm" style={{ color: S.muted }}>
                Your DVR posts snapshots straight to StaffLenz. No mailbox, no polling delay. Best for Hikvision &amp; Dahua.
              </div>
            </div>
          </div>

          {method === 'http' && (
            <div className="mt-5 space-y-4" onClick={(e) => e.stopPropagation()}>
              {httpGenLoading && (
                <div className="flex items-center gap-2 text-sm" style={{ color: S.muted }}>
                  <Spinner /> Generating webhook URL...
                </div>
              )}

              {webhook && (
                <>
                  <div className="rounded-xl p-4 border space-y-2 text-sm" style={{ background: S.bg, borderColor: S.border }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: S.cyan }}>
                      Paste this URL into your DVR's HTTP Push / HTTP Listening setting
                    </div>
                    <div
                      className="font-mono text-xs break-all rounded-lg p-3 border select-all"
                      style={{ background: '#0b1224', borderColor: S.border, color: S.text }}
                    >
                      {webhook.webhook_url}
                    </div>
                    <div className="text-[10px]" style={{ color: S.muted }}>
                      Method: <span style={{ color: S.text, fontWeight: 600 }}>POST</span>
                      {' · '}
                      Content: <span style={{ color: S.text, fontWeight: 600 }}>multipart/form-data</span> or <span style={{ color: S.text, fontWeight: 600 }}>image/jpeg</span>
                    </div>
                    <div className="pt-2 flex items-center justify-between border-t" style={{ borderColor: S.border }}>
                      <button
                        type="button"
                        onClick={copyHttpUrl}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: S.cyan, color: '#0a1128' }}
                      >
                        Copy URL
                      </button>
                      {httpCopyStatus && (
                        <span className="text-xs" style={{ color: S.cyan }}>{httpCopyStatus}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider mb-2" style={{ color: S.muted }}>
                      Your DVR brand
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      {DVR_BRANDS_HTTP.map((b) => {
                        const on = httpDvrBrand === b.id;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => { setHttpDvrBrand(b.id); setState((p) => ({ ...p, http_dvr_brand: b.id })); }}
                            className="px-3 py-2 rounded-lg text-xs font-medium border transition-all"
                            style={{
                              background: on ? `${S.cyan}20` : 'transparent',
                              borderColor: on ? S.cyan : S.border,
                              color: on ? S.cyan : S.text,
                            }}
                          >
                            {b.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="rounded-lg p-3 text-xs" style={{ background: S.bg, color: S.muted }}>
                      <span className="font-semibold" style={{ color: S.text }}>
                        {DVR_BRANDS_HTTP.find((b) => b.id === httpDvrBrand)?.label}:
                      </span>{' '}
                      {DVR_BRANDS_HTTP.find((b) => b.id === httpDvrBrand)?.path}
                    </div>
                  </div>

                  <div className="rounded-lg p-3 text-xs" style={{ background: '#1e293b', color: '#cbd5e1' }}>
                    <div className="font-semibold mb-1" style={{ color: '#22d3ee' }}>Tip</div>
                    Enable <b>Motion Detection</b> on your DVR and set the HTTP push as the alarm action. Snapshots will only fire when someone moves — keeping Claude cost low.
                  </div>
                </>
              )}
            </div>
          )}
        </CardShell>

        {/* Card B: FTP Push */}
        <CardShell active={method === 'ftp'} onClick={() => selectMethod('ftp')}>
          <div className="flex items-start gap-3">
            <div className="text-3xl">📡</div>
            <div className="flex-1">
              <div className="text-base font-semibold text-white mb-1">
                Your DVR pushes snapshots to our cloud
              </div>
              <div className="text-sm" style={{ color: S.muted }}>
                No devices needed. Works with any camera brand.
              </div>
            </div>
          </div>

          {method === 'ftp' && (
            <div className="mt-5 space-y-4" onClick={(e) => e.stopPropagation()}>
              {genLoading && (
                <div className="flex items-center gap-2 text-sm" style={{ color: S.muted }}>
                  <Spinner /> Generating credentials...
                </div>
              )}

              {ftp && (
                <div className="rounded-xl p-4 border space-y-2 text-sm font-mono" style={{ background: S.bg, borderColor: S.border }}>
                  <Row label="FTP Server" value={ftp.ftp_host} />
                  <Row label="Port" value={String(ftp.ftp_port)} />
                  <Row label="Username" value={ftp.ftp_username} />
                  <Row
                    label="Password"
                    value={showPass ? ftp.ftp_password : '•'.repeat(ftp.ftp_password?.length || 16)}
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ color: S.cyan, background: `${S.cyan}15` }}
                      >
                        {showPass ? 'Hide' : 'Show'}
                      </button>
                    }
                  />
                  <Row label="Directory" value={ftp.ftp_directory} />
                  <div className="pt-2 flex items-center justify-between border-t" style={{ borderColor: S.border }}>
                    <button
                      type="button"
                      onClick={copyAll}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{ background: S.cyan, color: '#0a1128' }}
                    >
                      Copy all
                    </button>
                    {copyStatus && (
                      <span className="text-xs" style={{ color: S.cyan }}>{copyStatus}</span>
                    )}
                  </div>
                </div>
              )}

              {/* DVR brand selector */}
              <div>
                <div className="text-xs uppercase tracking-wider mb-2" style={{ color: S.muted }}>
                  Your DVR brand
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {DVR_BRANDS.map((b) => {
                    const on = dvrBrand === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { setDvrBrand(b.id); setState((p) => ({ ...p, dvr_brand: b.id })); }}
                        className="px-3 py-2 rounded-lg text-xs font-medium border transition-all"
                        style={{
                          background: on ? `${S.cyan}20` : 'transparent',
                          borderColor: on ? S.cyan : S.border,
                          color: on ? S.cyan : S.text,
                        }}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-lg p-3 text-xs" style={{ background: S.bg, color: S.muted }}>
                  <span className="font-semibold" style={{ color: S.text }}>
                    {DVR_BRANDS.find((b) => b.id === dvrBrand)?.label}:
                  </span>{' '}
                  {DVR_BRANDS.find((b) => b.id === dvrBrand)?.path}
                </div>
              </div>

              {/* Test button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={testLoading}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: S.blue }}
                >
                  {testLoading ? <Spinner /> : 'Test Connection'}
                </button>
                {testResult && (
                  <span className="text-xs" style={{ color: testResult.connected ? '#22c55e' : '#facc15' }}>
                    {testResult.connected
                      ? `✓ Connected — ${testResult.files_received} files received`
                      : testResult.message}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardShell>

        {/* Card B: Hik-Connect */}
        <CardShell active={method === 'hikconnect'} onClick={() => selectMethod('hikconnect')}>
          <div className="flex items-start gap-3">
            <div className="text-3xl">☁️</div>
            <div className="flex-1">
              <div className="text-base font-semibold text-white mb-1">
                Use your existing Hik-Connect account
              </div>
              <div className="text-sm" style={{ color: S.muted }}>
                If your DVR is already connected to Hik-Connect.
              </div>
            </div>
          </div>
          {method === 'hikconnect' && (
            <div className="mt-5" onClick={(e) => e.stopPropagation()}>
              <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: S.muted }}>
                Device serial number
              </label>
              <input
                type="text"
                value={state.hikconnect_serial || ''}
                onChange={(e) => setState({ ...state, hikconnect_serial: e.target.value })}
                placeholder="e.g. DS-7608NI-K2-1234567890"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none border"
                style={{ background: S.bg, borderColor: S.border }}
              />
              <div className="text-xs mt-2" style={{ color: '#facc15' }}>
                Note: Requires Hikvision API approval.
              </div>
            </div>
          )}
        </CardShell>

        {/* Card: White-glove — we set it up for you */}
        <CardShell active={method === 'whiteglove'} onClick={() => selectMethod('whiteglove')}>
          <div className="flex items-start gap-3">
            <div className="text-3xl">🧑‍💻</div>
            <div className="flex-1">
              <div className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                Let our team set it up for you
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: '#22c55e22', color: '#22c55e' }}>
                  $99 one-time
                </span>
              </div>
              <div className="text-sm" style={{ color: S.muted }}>
                30-minute remote session via TeamViewer/AnyDesk. We configure everything — you never touch a setting.
              </div>
            </div>
          </div>

          {method === 'whiteglove' && (
            <div className="mt-5 rounded-xl p-4 border" style={{ background: S.bg, borderColor: S.border }} onClick={(e) => e.stopPropagation()}>
              <div className="text-xs uppercase tracking-wider mb-2" style={{ color: S.cyan }}>What happens next</div>
              <ol className="space-y-2 text-sm" style={{ color: S.text }}>
                <li className="flex gap-2"><span className="font-bold" style={{ color: S.cyan }}>1.</span> You click Continue — we get a notification</li>
                <li className="flex gap-2"><span className="font-bold" style={{ color: S.cyan }}>2.</span> Our team calls you within 24 hours to schedule a 30-min slot</li>
                <li className="flex gap-2"><span className="font-bold" style={{ color: S.cyan }}>3.</span> We remote into your DVR via TeamViewer and configure everything</li>
                <li className="flex gap-2"><span className="font-bold" style={{ color: S.cyan }}>4.</span> You see the live dashboard working before we hang up</li>
              </ol>
              <div className="mt-4 text-xs" style={{ color: S.muted }}>
                Billed once after the setup session is complete. Refunded if we can't get your cameras online.
              </div>
            </div>
          )}
        </CardShell>

        {/* Card C: Skip */}
        <CardShell active={method === 'skip'} onClick={() => selectMethod('skip')}>
          <div className="flex items-start gap-3">
            <div className="text-3xl">⏭️</div>
            <div className="flex-1">
              <div className="text-base font-semibold text-white mb-1">Set up cameras later</div>
              <div className="text-sm" style={{ color: S.muted }}>
                Start exploring the dashboard, connect cameras anytime.
              </div>
            </div>
          </div>
        </CardShell>
      </div>

      <button
        onClick={onContinue}
        disabled={saving}
        className="w-full py-4 rounded-2xl text-base font-semibold text-white transition-all duration-200 disabled:opacity-40 hover:scale-[1.01]"
        style={{ background: `linear-gradient(90deg, ${S.blue}, ${S.cyan})` }}
      >
        {saving ? <Spinner /> : 'Continue →'}
      </button>
    </div>
  );
}

function Row({ label, value, suffix }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wider" style={{ color: S.muted }}>{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-white truncate">{value}</span>
        {suffix}
      </div>
    </div>
  );
}

/* ── Quick Worker Add (used inside StepComplete) ──────────────────────────── */
function QuickAddWorker({ onAdded }) {
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState([]);
  const [err, setErr] = useState(null);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append('full_name', name.trim());
      if (dept) fd.append('department', dept);
      fd.append('shift', 'flexible');
      if (photo) fd.append('photo_0', photo);
      const r = await fetch('/api/workers', { method: 'POST', body: fd });
      const j = await r.json();
      if (r.ok) {
        setAdded((prev) => [...prev, name.trim()]);
        setName(''); setDept(''); setPhoto(null);
        onAdded?.();
      } else {
        setErr(j.error || 'Failed to add worker');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl p-5 border" style={{ background: S.card, borderColor: S.border }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-bold text-white">Add your first worker</div>
          <div className="text-xs" style={{ color: S.muted }}>Upload a clear front-facing photo for face matching. Skip if you prefer to add later.</div>
        </div>
        {added.length > 0 && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#22c55e22', color: '#22c55e' }}>
            {added.length} added
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none border"
          style={{ background: S.bg, borderColor: S.border }}
        />
        <input
          type="text"
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          placeholder="Role / department (optional)"
          className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none border"
          style={{ background: S.bg, borderColor: S.border }}
        />
      </div>
      <label className="flex items-center gap-3 rounded-xl px-4 py-2.5 border cursor-pointer mb-3" style={{ background: S.bg, borderColor: S.border }}>
        <span className="text-sm" style={{ color: photo ? S.text : S.muted }}>
          {photo ? `📷 ${photo.name}` : '📷 Choose photo (JPG/PNG)'}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setPhoto(e.target.files?.[0] || null)}
        />
      </label>
      {err && <div className="text-xs mb-2" style={{ color: '#f87171' }}>{err}</div>}
      <button
        onClick={handleAdd}
        disabled={!name.trim() || saving}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
        style={{ background: S.blue }}
      >
        {saving ? <Spinner /> : (added.length === 0 ? 'Add Worker →' : 'Add Another Worker →')}
      </button>
    </div>
  );
}

/* ── Quick Zone Add (used inside StepComplete) ────────────────────────────── */
function QuickAddZone({ onAdded }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState([]);
  const [err, setErr] = useState(null);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true); setErr(null);
    try {
      const r = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), location_label: location || null, zone_type: 'general' }),
      });
      const j = await r.json();
      if (r.ok) {
        setAdded((prev) => [...prev, name.trim()]);
        setName(''); setLocation('');
        onAdded?.();
      } else {
        setErr(j.error || 'Failed to add zone');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl p-5 border" style={{ background: S.card, borderColor: S.border }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-bold text-white">Add your first zone</div>
          <div className="text-xs" style={{ color: S.muted }}>Zones tell the AI where to look (e.g. &quot;Weights Floor&quot;, &quot;Reception&quot;).</div>
        </div>
        {added.length > 0 && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#22c55e22', color: '#22c55e' }}>
            {added.length} added
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Zone name"
          className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none border"
          style={{ background: S.bg, borderColor: S.border }}
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location label (optional)"
          className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none border"
          style={{ background: S.bg, borderColor: S.border }}
        />
      </div>
      {err && <div className="text-xs mb-2" style={{ color: '#f87171' }}>{err}</div>}
      <button
        onClick={handleAdd}
        disabled={!name.trim() || saving}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
        style={{ background: S.blue }}
      >
        {saving ? <Spinner /> : (added.length === 0 ? 'Add Zone →' : 'Add Another Zone →')}
      </button>
    </div>
  );
}

/* ── Step 3: All Set ──────────────────────────────────────────────────────── */
function StepComplete({ state, onFinish, finishing }) {
  const [workersAdded, setWorkersAdded] = useState(0);
  const [zonesAdded, setZonesAdded] = useState(0);
  const industry = INDUSTRIES.find((i) => i.id === state.industry);
  const methodLabel = {
    email: 'Email (SMTP)',
    http: 'HTTP Push (instant)',
    ftp: 'FTP Push',
    hikconnect: 'Hik-Connect Cloud',
    whiteglove: 'White-Glove — team will contact you',
    skip: 'Skipped — set up later',
  }[state.connection_method] || 'Not set';
  const connectionOk = state.test_result?.connected;

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8">
      <div className="text-center mb-8">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
          style={{ background: '#22c55e22', border: '2px solid #22c55e' }}
        >
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">You're live!</h1>
        <p className="text-sm max-w-md mx-auto" style={{ color: S.muted }}>
          Your monitoring is active. Cameras will start appearing as soon as your DVR pushes its first frames.
        </p>
      </div>

      {/* Summary */}
      <div
        className="rounded-2xl p-5 border mb-6 space-y-3"
        style={{ background: S.card, borderColor: S.border }}
      >
        <SummaryRow label="Site" value={state.site_name || '—'} />
        <SummaryRow
          label="Industry"
          value={
            <span className="inline-flex items-center gap-2">
              <span>{industry?.icon}</span>
              <span>{industry?.label || '—'}</span>
            </span>
          }
        />
        <SummaryRow
          label="Connection"
          value={
            <span className="inline-flex items-center gap-2">
              <span>{methodLabel}</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: connectionOk ? '#22c55e22' : '#facc1522',
                  color: connectionOk ? '#22c55e' : '#facc15',
                }}
              >
                {connectionOk ? '✓ OK' : 'pending'}
              </span>
            </span>
          }
        />
        <SummaryRow label="Number of cameras" value={state.num_cameras} />
      </div>

      {/* Checklist */}
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider mb-3" style={{ color: S.muted }}>
          Setup checklist
        </div>
        <ul className="space-y-2">
          <ChecklistItem done label="Site connected" hint="" />
          <ChecklistItem done={workersAdded > 0} label={workersAdded > 0 ? `${workersAdded} worker${workersAdded > 1 ? 's' : ''} added` : 'Add workers'} hint="Upload photos for face matching" />
          <ChecklistItem done={zonesAdded > 0} label={zonesAdded > 0 ? `${zonesAdded} zone${zonesAdded > 1 ? 's' : ''} added` : 'Add zones'} hint="Define areas the AI should watch" />
          <ChecklistItem label="Test alerts" hint="From the dashboard — after first frame arrives" />
        </ul>
      </div>

      {/* Inline quick-add — so clients don't land on empty dashboard */}
      <div className="space-y-4 mb-6">
        <QuickAddWorker onAdded={() => setWorkersAdded((n) => n + 1)} />
        <QuickAddZone onAdded={() => setZonesAdded((n) => n + 1)} />
      </div>

      <button
        onClick={onFinish}
        disabled={finishing}
        className="w-full py-4 rounded-2xl text-base font-semibold text-white transition-all duration-200 disabled:opacity-40 hover:scale-[1.01]"
        style={{ background: `linear-gradient(90deg, ${S.blue}, ${S.cyan})` }}
      >
        {finishing ? <Spinner /> : 'Go to Dashboard →'}
      </button>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wider" style={{ color: S.muted }}>{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}

function ChecklistItem({ done, label, hint }) {
  return (
    <li className="flex items-center gap-3 rounded-xl px-3 py-2.5 border" style={{ background: S.card, borderColor: S.border }}>
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: done ? '#22c55e' : 'transparent',
          border: `2px solid ${done ? '#22c55e' : S.border}`,
        }}
      >
        {done && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white">{label}</div>
        {hint && <div className="text-xs" style={{ color: S.muted }}>{hint}</div>}
      </div>
    </li>
  );
}

/* ── Main Wizard Page ─────────────────────────────────────────────────────── */
export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [state, setState] = useState({
    industry: '',
    site_name: '',
    address: '',
    num_cameras: 4,
    connection_method: null,
    ftp_credentials: null,
    email_credentials: null,
    webhook_credentials: null,
    dvr_brand: 'hikvision',
    email_dvr_brand: 'hikvision',
    http_dvr_brand: 'hikvision',
    dvr_sender_email: '',
    hikconnect_serial: '',
    test_result: null,
  });

  // Load status on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/onboarding/status');
        if (r.status === 401) { window.location.href = '/login'; return; }
        const j = await r.json();
        if (r.ok) {
          if (j.completed) { window.location.href = '/factory'; return; }
          if (j.site) {
            setState((prev) => ({
              ...prev,
              industry: j.site.industry || prev.industry,
              site_name: j.site.site_name || prev.site_name,
              address: j.site.address || prev.address,
              num_cameras: j.site.num_cameras || prev.num_cameras,
              connection_method: j.site.connection_method || prev.connection_method,
              ftp_credentials: j.ftp_credentials || prev.ftp_credentials,
            }));
          }
          setStep(Math.min(Math.max(j.current_step || 1, 1), 3));
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const saveStep = useCallback(async (stepNum, data) => {
    setSaving(true);
    try {
      const r = await fetch('/api/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: stepNum, data }),
      });
      const j = await r.json();
      return r.ok ? j : null;
    } catch { return null; }
    finally { setSaving(false); }
  }, []);

  async function handleStep1Continue() {
    const res = await saveStep(1, {
      industry: state.industry,
      site_name: state.site_name,
      address: state.address,
      num_cameras: state.num_cameras,
    });
    if (res) setStep(2);
  }

  async function handleStep2Continue() {
    const res = await saveStep(2, {
      connection_method: state.connection_method || 'skip',
      ftp_username: state.ftp_credentials?.ftp_username,
      ftp_password: state.ftp_credentials?.ftp_password,
      ftp_directory: state.ftp_credentials?.ftp_directory,
      smtp_username: state.email_credentials?.smtp_username,
      smtp_password: state.email_credentials?.smtp_password,
      recipient_email: state.email_credentials?.recipient_email,
      dvr_sender_email: state.dvr_sender_email,
      hikconnect_serial: state.hikconnect_serial,
    });
    if (res) setStep(3);
  }

  async function handleFinish() {
    setFinishing(true);
    await saveStep(3, {});
    // Redirect to the industry dashboard
    const target = state.industry && INDUSTRIES.find((i) => i.id === state.industry)
      ? `/${state.industry}`
      : '/factory';
    window.location.href = target;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: S.bg }}>
        <div className="text-center">
          <Spinner size={32} />
          <div className="text-sm mt-3" style={{ color: S.muted }}>Loading onboarding…</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: `radial-gradient(ellipse at top, ${S.sidebar} 0%, ${S.bg} 60%)`,
        fontFamily: 'Inter, "Plus Jakarta Sans", sans-serif',
      }}
    >
      {/* Header */}
      <div className="w-full border-b" style={{ borderColor: S.border, background: `${S.sidebar}cc`, backdropFilter: 'blur(8px)' }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
              style={{ background: `linear-gradient(135deg, ${S.blue}, ${S.cyan})` }}
            >
              SL
            </div>
            <div className="text-sm font-semibold text-white tracking-wide">StaffLenz Setup</div>
          </div>
          <a href="/factory" className="text-xs" style={{ color: S.muted }}>Skip setup →</a>
        </div>
      </div>

      <ProgressBar step={step} />

      <div className="transition-opacity duration-300">
        {step === 1 && (
          <StepSiteInfo state={state} setState={setState} onContinue={handleStep1Continue} saving={saving} />
        )}
        {step === 2 && (
          <StepConnectCameras state={state} setState={setState} onContinue={handleStep2Continue} saving={saving} />
        )}
        {step === 3 && (
          <StepComplete state={state} onFinish={handleFinish} finishing={finishing} />
        )}
      </div>

      {/* Back link */}
      {step > 1 && step < 3 && (
        <div className="max-w-3xl mx-auto px-4 pb-10 text-center">
          <button
            onClick={() => setStep(step - 1)}
            className="text-xs"
            style={{ color: S.muted }}
          >
            ← Back to previous step
          </button>
        </div>
      )}
    </div>
  );
}
