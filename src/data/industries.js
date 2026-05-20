// ═══════════════════════════════════════════════════════════════════════════════
// StaffLenz industry configs.
// One entry per vertical — drives:
//   - marketing landing page at /industries/<slug>
//   - default zones / alert rules / report templates (industry_packs in DB)
//   - signup flow pre-selection
//   - dashboard routing (dashboard_slug)
//
// To add a new industry: add an entry here, add a row to industry_packs in
// supabase, update the clients.industry CHECK constraint, done.
// ═══════════════════════════════════════════════════════════════════════════════

export const INDUSTRIES = [
  // ─── 1. Gym ─────────────────────────────────────────────────────────────
  {
    slug: 'gym',
    name: 'Gym & Fitness',
    icon: '🏋️',
    accent: '#22c55e',
    accentDark: '#16a34a',
    dashboard_slug: 'retail', // maps to existing /retail dashboard until we split
    db_industry: 'retail',
    hero: {
      headline: 'Prove your trainers were on the floor.',
      subheadline:
        'Never miss a walk-in at reception. Settle every trainer dispute with data. AI monitors your gym while you run it.',
      cta_text: 'Start 14-day free trial',
      cta_plan: 'standard',
    },
    pains: [
      'Trainers at reception chatting while members wait for help on the floor',
      'Walk-ins leave because reception is empty at the wrong moment',
      'Trainer pay disputes over class attendance — no source of truth',
      'Locker and equipment theft with no footage trail',
    ],
    roi_scenarios: [
      {
        label: 'Recover lost walk-ins',
        problem: 'Missing 2 walk-ins/day because reception was empty',
        cost: '₹60,000/month in lost memberships',
        solution: 'WhatsApp alert the second reception goes unattended >3 min',
        net_value: '₹45,000/month recovered',
      },
      {
        label: 'Settle trainer pay disputes',
        problem: 'Trainer claims 15 classes, your records show 11',
        cost: '₹10,000/month in overpaid wages + trainer friction',
        solution: 'Auto-count class attendance against booked sessions',
        net_value: '₹8,000/month + zero disputes',
      },
      {
        label: 'Catch locker theft fast',
        problem: 'Member complains about stolen wallet, you have nothing',
        cost: '1 bad review = 5–10 lost signups',
        solution: '7-day forensic archive + motion alert on locker zone',
        net_value: 'Membership retention + insurance claim evidence',
      },
    ],
    features: [
      { title: 'Trainer-on-floor tracking', desc: 'Know how much time each trainer actually spends on the gym floor vs elsewhere, per shift.' },
      { title: 'Reception coverage alerts', desc: 'WhatsApp alert within 15 seconds if nobody is at reception during operating hours.' },
      { title: 'Class attendance auto-count', desc: 'AI counts heads in class and matches to booked sessions — no manual roll call.' },
      { title: 'Peak-hour footfall heatmap', desc: 'See exactly when your gym is busiest so you can schedule trainers to match.' },
      { title: 'Locker zone monitoring', desc: '3-second capture with motion alerts for theft response and insurance evidence.' },
      { title: 'Member-safe reports', desc: 'Aggregate compliance % only — no individual member tracking, GDPR-friendly.' },
    ],
    recommended_plan: 'standard',
    upsell_plan: 'pro',
    typical_size: '80–400 members · 5–15 trainers',
    buyers: 'Gym Owner · Franchise Operator',
    meta_description:
      'AI-powered workforce monitoring built for gyms. Trainer accountability, reception coverage, class attendance, and locker theft prevention.',
  },

  // ─── 2. Factory ─────────────────────────────────────────────────────────
  {
    slug: 'factory',
    name: 'Factory & Manufacturing',
    icon: '🏭',
    accent: '#f59e0b',
    accentDark: '#d97706',
    dashboard_slug: 'factory',
    db_industry: 'factory',
    hero: {
      headline: 'Zero PPE incidents. Zero ghost workers on your invoice.',
      subheadline:
        'AI-verified safety compliance and contractor attendance — built for the Factories Act and your insurer.',
      cta_text: 'Start 14-day free trial',
      cta_plan: 'pro',
    },
    pains: [
      'Workers skipping PPE when you\'re not looking — one accident = lakhs in liability',
      'Contractors billing 50 workers when only 42 show up',
      'Unauthorized zone entry near high-voltage / chemicals / moving machinery',
      'Compliance audits that require photo evidence you don\'t have',
    ],
    roi_scenarios: [
      {
        label: 'Eliminate ghost workers',
        problem: 'Contractor invoices 50 daily workers, AI counts 42',
        cost: '₹2.4 lakh/month in ghost labour',
        solution: 'Daily muster reconciliation with photo evidence',
        net_value: 'Pays for itself in 4 days',
      },
      {
        label: 'Prevent one accident',
        problem: 'Missed helmet = head injury = ₹5–20 lakh liability + regulatory shutdown',
        cost: 'One incident/year on average',
        solution: 'PPE violation alert in 10 seconds — corrective action before risk',
        net_value: 'Liability avoided + lower insurance premium',
      },
      {
        label: 'Pass EHS audit',
        problem: 'Factories Act inspection — no evidence of daily safety checks',
        cost: '₹50k–₹2L fines + operations notice',
        solution: 'Auto-generated daily EHS report with video evidence',
        net_value: 'Clean audit record + reduced regulator risk',
      },
    ],
    features: [
      { title: 'Per-zone PPE rules', desc: 'Define zones as helmet-only, full-PPE, chemical-suit, etc. AI flags violations in real time.' },
      { title: 'Contractor muster audit', desc: 'Daily count of contractor staff on floor vs what they invoiced — catches ghost workers.' },
      { title: 'Danger zone alerts', desc: 'Unauthorized entry near high-voltage, chemical storage, or moving machinery.' },
      { title: 'EHS daily report', desc: 'Auto-generated Factories Act-ready report with incident photos and compliance %.' },
      { title: '90-day incident archive', desc: 'Insurance-grade video retention for any claim or investigation.' },
      { title: 'Shift-wise compliance', desc: 'Compare morning/afternoon/night shift safety performance side-by-side.' },
    ],
    recommended_plan: 'pro',
    upsell_plan: 'scale',
    typical_size: '50–200 workers · 1–3 shifts',
    buyers: 'Plant Manager · EHS Officer · Works Director',
    meta_description:
      'AI-verified PPE compliance, contractor audit, and zone safety for factories. Factories Act-ready reports.',
  },

  // ─── 3. Construction ────────────────────────────────────────────────────
  {
    slug: 'construction',
    name: 'Construction Sites',
    icon: '🏗️',
    accent: '#eab308',
    accentDark: '#ca8a04',
    dashboard_slug: 'construction',
    db_industry: 'factory',
    hero: {
      headline: 'PPE proof for your insurer. Muster audit against your contractor\'s bill.',
      subheadline:
        'Real-time site safety, ghost-worker detection, and after-hours theft alerts — deployed in 20 minutes per site.',
      cta_text: 'Start 14-day free trial',
      cta_plan: 'pro',
    },
    pains: [
      'PPE lapses your insurer will use to deny claims',
      'Labour contractor invoices inflated by 20–30% with ghost workers',
      'Rebar, copper, and equipment disappearing after hours',
      'Workers entering crane zones, wet-concrete areas, confined spaces unsafely',
    ],
    roi_scenarios: [
      {
        label: 'Insurance claim acceptance',
        problem: 'Accident happens, insurer asks for PPE evidence, you have none',
        cost: '₹5–50 lakh claim denied',
        solution: 'Time-stamped PPE evidence at the moment of any incident',
        net_value: 'Claim accepted + premium stays flat',
      },
      {
        label: 'Stop rebar theft',
        problem: 'Rebar stock short by 2 tonnes after weekend',
        cost: '₹1.5–3 lakh per theft event',
        solution: 'After-hours motion + WhatsApp alert, police-ready video',
        net_value: 'Theft deterred after first alert',
      },
      {
        label: 'Slash ghost workers',
        problem: 'Contractor bills 80 workers, only 62 detected on site',
        cost: '₹4–6 lakh/month inflated labour',
        solution: 'Daily count with photo evidence attached to invoice approval',
        net_value: '₹3–4 lakh/month saved',
      },
    ],
    features: [
      { title: 'Site-entry PPE check', desc: 'AI scans workers at gate for helmet, vest, boots — no-PPE = no-entry alert.' },
      { title: 'Contractor muster reconciliation', desc: 'Hourly count matched against contractor invoice line items.' },
      { title: 'Danger-zone rules per phase', desc: 'Crane lift zones, wet concrete, excavation edges — flagged automatically.' },
      { title: 'After-hours intrusion', desc: 'WhatsApp + voice call on motion detected 7pm–6am.' },
      { title: 'Multi-site dashboard', desc: 'Project director sees PPE compliance + headcount across all sites in one view.' },
      { title: 'Weekly safety report', desc: 'Client-ready PDF for project owner/insurer showing compliance %.' },
    ],
    recommended_plan: 'pro',
    upsell_plan: 'scale',
    typical_size: '20–300 workers · 1–10 active sites',
    buyers: 'Project Manager · Safety Officer · Contractor Director',
    meta_description:
      'AI-verified PPE, ghost-worker detection, and after-hours security for construction sites. Insurance-grade evidence.',
  },

  // ─── 4. Retail ──────────────────────────────────────────────────────────
  {
    slug: 'retail',
    name: 'Retail & Stores',
    icon: '🛍️',
    accent: '#f43f5e',
    accentDark: '#e11d48',
    dashboard_slug: 'retail',
    db_industry: 'retail',
    hero: {
      headline: 'Cut shrinkage 40%. Catch theft in 10 seconds.',
      subheadline:
        'Real-time loss prevention with 3-second capture, stockroom access logs, and after-hours alerts.',
      cta_text: 'Start 14-day free trial',
      cta_plan: 'pro',
    },
    pains: [
      'Shrinkage eating 1–3% of your monthly revenue',
      'Stockroom access with no log — who went in, when, why',
      'Cash counter abandoned while staff on break',
      'After-hours break-ins you only discover in the morning',
    ],
    roi_scenarios: [
      {
        label: 'Cut shrinkage in half',
        problem: 'Monthly shrinkage ₹60,000–₹1.5 lakh',
        cost: '1–3% of revenue gone',
        solution: '3-sec capture + motion bursts + staff-identity matched stockroom log',
        net_value: '40–60% shrinkage reduction',
      },
      {
        label: 'After-hours break-in caught',
        problem: 'Store broken into Saturday night, discovered Monday',
        cost: '₹2–10 lakh inventory + damage',
        solution: 'Motion alert → WhatsApp + voice call to owner within 15 seconds',
        net_value: 'Police on scene before attacker leaves',
      },
      {
        label: 'Insurance claim evidence',
        problem: 'Insurance asks for pre-incident inventory footage',
        cost: 'Claims often reduced 30–50% without evidence',
        solution: '7-day forensic archive with incident auto-tagging',
        net_value: 'Full claim paid',
      },
    ],
    features: [
      { title: '3-second capture', desc: 'Fine-grained temporal resolution — theft events of 5–10 seconds are fully captured.' },
      { title: 'Stockroom access log', desc: 'Every entry matched to staff identity with timestamped photo.' },
      { title: 'Cash counter abandonment', desc: 'Alert if counter unattended >3 min during business hours.' },
      { title: 'After-hours intrusion', desc: 'Motion outside business hours triggers instant multi-channel alert.' },
      { title: 'Checkout queue monitoring', desc: 'Long queue at any counter fires a "need more staff" alert to manager.' },
      { title: 'Weekly loss-prevention report', desc: 'Incident clips + stockroom summary + staff-hour audit.' },
    ],
    recommended_plan: 'pro',
    upsell_plan: 'scale',
    typical_size: '1–5 stores · 5–30 staff',
    buyers: 'Store Owner · Area Manager · Loss Prevention Head',
    meta_description:
      'AI-powered loss prevention for retail. Cut shrinkage 40%, catch theft in seconds, audit every stockroom entry.',
  },

  // ─── 5. Warehouse ───────────────────────────────────────────────────────
  {
    slug: 'warehouse',
    name: 'Warehouse & Logistics',
    icon: '📦',
    accent: '#6366f1',
    accentDark: '#4f46e5',
    dashboard_slug: 'warehouse',
    db_industry: 'factory',
    hero: {
      headline: 'SLA-grade dispatch proof. Cold-chain audit trail. Loading-dock theft flagged in real time.',
      subheadline:
        '24/7 AI monitoring built for 3PL operators and distribution centres.',
      cta_text: 'Start 14-day free trial',
      cta_plan: 'scale',
    },
    pains: [
      'Pickers in the wrong zone slow dispatches below client SLA',
      'Cold-chain breaches without audit evidence = ₹5–20 lakh risk',
      'Loading-dock shrinkage nobody can pin down',
      '24/7 operations make human supervision impossible',
    ],
    roi_scenarios: [
      {
        label: 'SLA breach avoidance',
        problem: 'One SLA breach → ₹50k penalty + renewal at risk',
        cost: '₹50k–₹2L per marquee client incident',
        solution: 'Real-time zone-picker adherence + bay coverage tracking',
        net_value: 'Zero SLA incidents with proof to show clients',
      },
      {
        label: 'Cold-chain compliance',
        problem: 'FSSAI/Pharma audit asks for access + temperature log',
        cost: '₹5–20 lakh for a failed audit',
        solution: 'Access log + temperature correlation + auto-export',
        net_value: 'Audit-ready evidence on demand',
      },
      {
        label: 'Loading-dock theft',
        problem: 'Pallets short by 4–6 items/week, no idea where',
        cost: '₹30k–₹2 lakh/month in missing inventory',
        solution: 'Shift-change and dock-door motion tracking with staff matching',
        net_value: 'Theft pattern caught within 2 weeks',
      },
    ],
    features: [
      { title: 'Zone-picker verification', desc: 'Right picker in right bay — alerts on cross-zone assignment errors.' },
      { title: 'Cold storage access log', desc: 'Every door-open event with staff identity and dwell time.' },
      { title: 'Loading-dock motion alerts', desc: 'Shift-change and dock-door activity matched to scheduled pickups.' },
      { title: '24/7 coverage', desc: '3-sec capture + 1-min analysis running around the clock.' },
      { title: '30-day forensic archive', desc: 'Audit and insurance-grade video retention.' },
      { title: 'Bay-level utilisation', desc: 'Which bays are overused, under-staffed, or bottlenecking ops.' },
    ],
    recommended_plan: 'scale',
    upsell_plan: 'enterprise',
    typical_size: '15k–200k sq ft · 20–100 staff · multi-shift',
    buyers: 'Warehouse Manager · Operations Director · 3PL Account Manager',
    meta_description:
      '24/7 AI monitoring for warehouses: SLA dispatch proof, cold-chain compliance, loading-dock theft prevention.',
  },

  // ─── 6. Hotel ───────────────────────────────────────────────────────────
  {
    slug: 'hotel',
    name: 'Hotels & Hospitality',
    icon: '🏨',
    accent: '#8b5cf6',
    accentDark: '#7c3aed',
    dashboard_slug: 'hotel',
    db_industry: 'hotel',
    hero: {
      headline: 'Know instantly when a guest walks up to an empty reception.',
      subheadline:
        'Staff coverage, uniform compliance, and guest-service quality — measured continuously.',
      cta_text: 'Start 14-day free trial',
      cta_plan: 'standard',
    },
    pains: [
      'Guests waiting at reception while staff is off-desk',
      'F&B station unstaffed for 4 minutes during dinner rush',
      'Uniform + grooming standards dropped during night shift',
      'Banquet coverage during weddings with no real-time visibility',
    ],
    roi_scenarios: [
      {
        label: 'Reception uptime = repeat bookings',
        problem: 'Empty reception for 6 minutes = 1 negative TripAdvisor review',
        cost: '₹2–5 lakh in lost future bookings',
        solution: 'Coverage alert within 15 seconds — staff back at post',
        net_value: '4.8+ star review maintained',
      },
      {
        label: 'Banquet coverage during events',
        problem: 'Wedding client complains about service gaps',
        cost: 'Lost ₹5–15 lakh in repeat banquet bookings',
        solution: 'Real-time cover-ratio alerts at banquet stations',
        net_value: 'Banquet referrals + repeat business',
      },
      {
        label: 'Uniform + grooming audit',
        problem: 'Brand-standard lapses at night shift nobody sees',
        cost: 'Brand audit failures for franchised properties',
        solution: 'Per-shift uniform compliance scoring',
        net_value: 'Brand audit pass + franchise compliance',
      },
    ],
    features: [
      { title: 'Coverage zones by service type', desc: 'Reception, concierge, F&B, banquet — each with its own coverage rules.' },
      { title: 'Staff:guest ratio alerts', desc: 'Spike in lobby guests + low staff = alert to duty manager.' },
      { title: 'Uniform + grooming checks', desc: 'AI scans for brand-standard adherence at each service touchpoint.' },
      { title: 'Break-overlap prevention', desc: 'Alert when all staff at one station are on break simultaneously.' },
      { title: 'Daily service report', desc: 'Coverage % per zone per hour, shared with GM and ownership.' },
      { title: 'Multi-property rollup', desc: 'Chain dashboard comparing every property on the same KPIs.' },
    ],
    recommended_plan: 'standard',
    upsell_plan: 'pro',
    typical_size: '20–100 rooms · 25–80 staff',
    buyers: 'General Manager · Operations Head · Regional Director',
    meta_description:
      'AI-verified coverage, uniform compliance, and service quality for hotels. Real-time reception and F&B monitoring.',
  },

  // ─── 7. Restaurant ──────────────────────────────────────────────────────
  {
    slug: 'restaurant',
    name: 'Restaurants & F&B',
    icon: '🍽️',
    accent: '#f97316',
    accentDark: '#ea580c',
    dashboard_slug: 'restaurant',
    db_industry: 'retail',
    hero: {
      headline: 'FSSAI-ready hygiene proof. Cover ratio every rush. Station coverage always.',
      subheadline:
        'AI-verified kitchen hygiene and dining-room service — for single outlets and chains.',
      cta_text: 'Start 14-day free trial',
      cta_plan: 'standard',
    },
    pains: [
      'Hairnet/glove lapses your FSSAI inspector would notice',
      'Grill unstaffed for 3 min during dinner rush = 2-star review',
      'Hand-wash frequency doesn\'t meet FSSAI norms, no evidence either way',
      'Chain-wide brand standards drift and you find out too late',
    ],
    roi_scenarios: [
      {
        label: 'FSSAI audit pass',
        problem: 'Failed audit = 15-day closure',
        cost: '₹5–15 lakh lost revenue + reputation damage',
        solution: 'Continuous hygiene compliance log + instant corrective alerts',
        net_value: 'Audit pass + licence retained',
      },
      {
        label: 'Dinner rush coverage',
        problem: 'Grill unstaffed, 8 angry Zomato reviews in one week',
        cost: '2-week footfall dip + online rating hit',
        solution: 'Station coverage alerts during 12–3pm and 7–11pm',
        net_value: 'Ratings maintained, rush revenue protected',
      },
      {
        label: 'Chain brand compliance',
        problem: 'Franchisee outlet drops brand standards after month 6',
        cost: 'Brand dilution + customer disappointment',
        solution: 'Chain dashboard with daily outlet-level compliance %',
        net_value: 'Early correction before brand damage',
      },
    ],
    features: [
      { title: 'Kitchen hygiene compliance', desc: 'Hairnet, gloves, apron per zone — AI flags violations in real time.' },
      { title: 'Hand-wash station tracking', desc: 'Proof of FSSAI-mandated hand-wash frequency per hour.' },
      { title: 'Station coverage during service', desc: 'Alert when prep/grill/counter stations unstaffed during service windows.' },
      { title: 'Cover-ratio monitoring', desc: 'Covers-to-staff ratio tracked through lunch and dinner rushes.' },
      { title: 'FSSAI audit log export', desc: 'One-click PDF for food inspector — hygiene + compliance evidence.' },
      { title: 'Franchise benchmarking', desc: 'Multi-outlet dashboard with brand-standard scores per location.' },
    ],
    recommended_plan: 'standard',
    upsell_plan: 'pro',
    typical_size: '30–200 seats · 8–40 staff',
    buyers: 'Owner · Chain COO · Franchise Ops Head',
    meta_description:
      'FSSAI-ready AI monitoring for restaurants. Kitchen hygiene, station coverage, and chain-wide brand compliance.',
  },

  // ─── 8. Hospital ────────────────────────────────────────────────────────
  {
    slug: 'hospital',
    name: 'Hospitals & Clinics',
    icon: '🏥',
    accent: '#06b6d4',
    accentDark: '#0891b2',
    dashboard_slug: 'hospital',
    db_industry: 'school',
    hero: {
      headline: 'NABH-ready proof: nurse ratios, PPE, restricted-zone access — auto-audited 24/7.',
      subheadline:
        'Continuous accreditation evidence and clinical safety monitoring.',
      cta_text: 'Start 14-day free trial',
      cta_plan: 'pro',
    },
    pains: [
      'Nurse-to-patient ratios are mandated — no way to verify continuously',
      'PPE in ICU/OT critical, lapses lead to infection + lawsuits',
      'Pharmacy + records rooms accessed without audit trail',
      'NABH audits need video evidence you can\'t produce',
    ],
    roi_scenarios: [
      {
        label: 'Pass NABH audit on first try',
        problem: 'Failed audit = 6-month corrective programme + re-audit cost',
        cost: '₹2–5 lakh in remediation + reputation damage',
        solution: 'Continuous compliance log with pre-signed audit PDFs',
        net_value: 'Accreditation renewed on time',
      },
      {
        label: 'Infection control',
        problem: 'PPE lapse in ICU = preventable infection',
        cost: '₹5–25 lakh liability + regulator risk',
        solution: 'Per-ward PPE rules with real-time violation alerts',
        net_value: 'Compliance rate >99% verified',
      },
      {
        label: 'Restricted-area access',
        problem: 'Pharmacy break-in, no entry log',
        cost: 'Controlled substance loss + DEA notice',
        solution: 'Identity-matched access log for every entry',
        net_value: 'Audit trail + faster investigations',
      },
    ],
    features: [
      { title: 'Nurse:patient ratio per ward', desc: 'Continuous ratio monitoring with alerts when below NABH minimum.' },
      { title: 'Per-ward PPE rules', desc: 'ICU = full PPE, general = mask-only, custom per ward type.' },
      { title: 'Restricted-zone access log', desc: 'Pharmacy, records, pathology — every entry identity-matched.' },
      { title: 'Shift handover verification', desc: 'Proof both shifts overlapped during handover window.' },
      { title: 'Hand-hygiene tracking', desc: 'Entry-point hand-wash frequency per staff per shift.' },
      { title: 'Accreditation-ready export', desc: 'Quarterly PDF formatted for NABH/JCI audit submission.' },
    ],
    recommended_plan: 'pro',
    upsell_plan: 'scale',
    typical_size: '25–300 beds · 50–500 staff',
    buyers: 'Hospital Administrator · Medical Superintendent · Compliance Officer',
    meta_description:
      'NABH-ready AI compliance for hospitals. Nurse ratios, PPE, restricted access, and audit-ready exports.',
  },

  // ─── 9. School ──────────────────────────────────────────────────────────
  {
    slug: 'school',
    name: 'Schools & Education',
    icon: '🏫',
    accent: '#10b981',
    accentDark: '#059669',
    dashboard_slug: 'school',
    db_industry: 'school',
    hero: {
      headline: 'Prove every classroom, gate, and exam hall had an adult on duty.',
      subheadline:
        'Child-safety compliance and invigilation evidence — built for trustees and principals.',
      cta_text: 'Start 14-day free trial',
      cta_plan: 'standard',
    },
    pains: [
      'Unattended classroom = safety risk + parent complaints',
      'Gate duty missed = child safety incident waiting to happen',
      'Exam invigilation evidence board asks for = you don\'t have',
      'Canteen / playground supervision gaps',
    ],
    roi_scenarios: [
      {
        label: 'Child-safety liability',
        problem: 'Unattended classroom incident → parent lawsuit',
        cost: '₹10 lakh–₹1 cr in settlement + regulatory notice',
        solution: 'Real-time unattended-classroom alerts during class hours',
        net_value: 'Liability defence + incident prevention',
      },
      {
        label: 'Exam board compliance',
        problem: 'CBSE/ICSE asks for invigilation evidence during exam week',
        cost: 'Failed compliance = exam centre status revoked',
        solution: 'Exam-hall coverage log with invigilator identity + time',
        net_value: 'Centre status maintained',
      },
      {
        label: 'Parent communication',
        problem: 'Parents ask about supervision during school trip / event',
        cost: 'Trust lost, withdrawals follow',
        solution: 'Parent-safe aggregate compliance dashboard',
        net_value: 'Parent confidence maintained',
      },
    ],
    features: [
      { title: 'Time-bound coverage rules', desc: 'Gate duty 8–9am, exam hall 10–12, lunch supervision 1–2 — per-period monitoring.' },
      { title: 'Unattended classroom alerts', desc: 'WhatsApp the moment a classroom is empty of adults during class hours.' },
      { title: 'Exam invigilation proof', desc: 'Time-stamped evidence for every exam window, exportable for boards.' },
      { title: 'Gate + playground supervision', desc: 'Entry/exit supervision tracking with duty-roster reconciliation.' },
      { title: 'Canteen oversight', desc: 'Adult presence during lunch hours for bullying/safety.' },
      { title: 'Parent-safe dashboards', desc: 'Aggregated compliance %, no individual student tracking — FERPA/DPDP friendly.' },
    ],
    recommended_plan: 'standard',
    upsell_plan: 'pro',
    typical_size: '300–2,000 students · 20–150 staff',
    buyers: 'Principal · Administrator · Trustee/Director',
    meta_description:
      'AI child-safety and supervision proof for schools. Unattended-classroom alerts, exam invigilation, gate duty tracking.',
  },

  // ─── 10. Security Services ──────────────────────────────────────────────
  {
    slug: 'security',
    name: 'Security Services',
    icon: '🔒',
    accent: '#64748b',
    accentDark: '#475569',
    dashboard_slug: 'security',
    db_industry: 'factory',
    hero: {
      headline: 'White-label proof for your clients: your guards were exactly where you said they\'d be.',
      subheadline:
        'Post-adherence, patrol verification, and SLA reports — branded as your own.',
      cta_text: 'Start 14-day free trial',
      cta_plan: 'scale',
    },
    pains: [
      'Guard left post for 40 minutes, client finds out before you do',
      'Patrol route adherence claims you can\'t back up',
      'Client SLA reports require data you don\'t have',
      'Response-time claims disputed by clients',
    ],
    roi_scenarios: [
      {
        label: 'Client retention',
        problem: 'Client doesn\'t renew because they can\'t verify your SLA claims',
        cost: 'Annual contract ₹5–50 lakh lost',
        solution: 'Weekly branded SLA PDF with post-adherence % per site',
        net_value: 'Higher retention + premium pricing',
      },
      {
        label: 'Post abandonment caught internally',
        problem: 'Guard abandons post, client catches it first',
        cost: 'Immediate contract termination',
        solution: 'Real-time post-abandonment alert to your ops team',
        net_value: 'Correct internally before client sees',
      },
      {
        label: 'Response-time disputes',
        problem: 'Client says "your guard took 8 min to respond", you say 3',
        cost: 'Penalty or contract-renewal risk',
        solution: 'Timestamped response-time log per incident',
        net_value: 'Dispute resolution with data',
      },
    ],
    features: [
      { title: 'Named-post tracking', desc: 'Gate 1, Reception Pedestal, Back Dock — track adherence per named post.' },
      { title: 'Post-abandonment alerts', desc: 'Guard away from post >3 min fires an internal ops alert.' },
      { title: 'Patrol route verification', desc: 'Random-interval presence checks along patrol path.' },
      { title: 'Branded client SLA reports', desc: 'Weekly PDF per client with your logo, post-adherence KPI, and incidents.' },
      { title: 'Response-time tracking', desc: 'From alarm trigger to guard arrival at scene.' },
      { title: 'Multi-client ops dashboard', desc: 'One control room view for all sites across all clients.' },
    ],
    recommended_plan: 'scale',
    upsell_plan: 'enterprise',
    typical_size: '10–100 client sites · 50–500 guards',
    buyers: 'Security Company Owner · Operations Director',
    meta_description:
      'White-label AI for security companies: post-adherence, patrol verification, branded client SLA reports.',
  },

  // ─── 11. Home Security ──────────────────────────────────────────────
  {
    slug: 'home',
    name: 'Home Security',
    icon: '🏠',
    accent: '#3b82f6',
    accentDark: '#2563eb',
    dashboard_slug: 'home',
    db_industry: 'home',
    hero: {
      headline: 'Know who\'s at your gate before they ring the bell.',
      subheadline:
        'AI-powered home security that works with your existing CCTV. Know when the maid came, when the kids got home, and if anyone was at your gate at 3 AM — all on WhatsApp.',
      cta_text: 'Book a Demo',
      cta_plan: 'home',
    },
    pains: [
      'Your CCTV records 24/7 but nobody watches the footage until after something goes wrong',
      'You don\'t know if the maid came today, what time she left, or if she let someone in while you were at work',
      'Your elderly parent lives alone and you worry about falls or medical emergencies with no way to know',
      'Packages and deliveries disappear from your gate and you only check the DVR when it\'s too late',
    ],
    roi_scenarios: [
      {
        label: 'Replace the security guard',
        problem: 'Monthly security guard who sleeps on duty',
        cost: '₹15,000–25,000/month for a human guard',
        solution: 'AI watches all cameras 24/7, sends WhatsApp alerts in 15 seconds, never sleeps',
        net_value: 'Save ₹13,000–23,000/month — AI guard at 1/10th the cost',
      },
      {
        label: 'Stop maid overpayment',
        problem: 'Maid charges for 26 days, actually came 22 days',
        cost: '₹2,000–4,000/month in overpaid wages',
        solution: 'Auto-tracked arrival/departure with daily WhatsApp summary',
        net_value: 'StaffLenz pays for itself from maid accountability alone',
      },
      {
        label: 'One burglary prevented',
        problem: 'Unknown person at your gate at 2 AM — CCTV recorded it but nobody saw',
        cost: '₹2–20 lakh in stolen goods + damage + trauma',
        solution: 'Instant WhatsApp alert with photo the moment an unknown person appears',
        net_value: 'One prevented incident saves 10+ years of subscription',
      },
    ],
    features: [
      { title: 'Unknown person alert', desc: 'AI knows your family and staff by face. Anyone else at the gate triggers an instant WhatsApp with their photo.' },
      { title: 'Maid & staff attendance', desc: 'Auto-tracked clock-in, clock-out, and duration for every domestic worker. Daily summary on WhatsApp at 10 PM.' },
      { title: 'Overnight all-clear', desc: 'Green badge in the morning if nothing happened overnight. Red alert with footage if something did.' },
      { title: 'Elderly wellness check', desc: 'If no movement detected in the living room for 2+ hours during daytime, you get an alert to check on your parent.' },
      { title: 'Daily "who came today" summary', desc: 'Every evening: who visited, when the maid came, when the kids got home, any packages delivered.' },
      { title: '3-day evidence archive', desc: 'Every frame saved for 3 days. If something happens, you have police-ready footage with timestamps.' },
    ],
    recommended_plan: 'home',
    upsell_plan: 'pro',
    typical_size: '2–4 cameras · 1–3 domestic staff',
    buyers: 'Homeowner · Family · NRI with property in India',
    meta_description:
      'AI home security using your existing CCTV. Intruder alerts, maid attendance tracking, elderly wellness, and daily summaries on WhatsApp.',
  },
];

// ─── Lookup helpers ──────────────────────────────────────────────────────
export function getIndustry(slug) {
  return INDUSTRIES.find((i) => i.slug === slug) || null;
}

export function allIndustrySlugs() {
  return INDUSTRIES.map((i) => i.slug);
}
