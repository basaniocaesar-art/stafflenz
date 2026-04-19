// ═══════════════════════════════════════════════════════════════════════════════
// LenzAI Dynamic Prompt Builder
// Generates per-client Claude analysis prompts based on industry, zones, rules
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Industry-specific prompt additions ──────────────────────────────────────
const INDUSTRY_PROMPTS = {
  factory: `FACTORY-SPECIFIC ANALYSIS:
- Pay special attention to PPE compliance on all workers.
- Check each production line has minimum required workers.
- Alert immediately if anyone enters restricted machinery zones.
- Verify contractor workers are wearing contractor-specific identification.
- Check for idle workers — same position across multiple frames.
- Monitor for unsafe practices near heavy machinery.`,

  hotel: `HOTEL-SPECIFIC ANALYSIS:
- Track all room door activity — note which rooms have entries and exits.
- Time housekeeping in each room — alert if over maximum minutes.
- Identify any unknown persons in staff-only corridors.
- Check reception desk is always staffed during operating hours.
- Monitor lobby and entrance for suspicious loitering.
- Track room service delivery times.`,

  school: `SCHOOL-SPECIFIC ANALYSIS:
- Verify teacher presence in each classroom during period times.
- Check canteen supervision during lunch hours.
- Alert if any student is in restricted areas like labs without supervision.
- Monitor gate duty presence at arrival and departure times.
- Check playground supervision during break times.
- Alert if classrooms are empty during scheduled periods.`,

  retail: `RETAIL-SPECIFIC ANALYSIS:
- Check all sections have staff coverage.
- Monitor billing counters — alert if unmanned during open hours.
- Track stockroom access — log all entries.
- Alert if section empty during peak hours.
- Monitor for shoplifting indicators (suspicious loitering, concealment).
- Check customer service desk is staffed.`,

  gym: `GYM/FITNESS-SPECIFIC ANALYSIS:
BEHAVIOUR MONITORING (PRIORITY):
- Is each worker ACTIVELY working or just standing around/sitting idle?
- Is anyone on their PHONE during shift hours? Flag immediately.
- Are workers at their ASSIGNED ZONE or hanging around reception/chatting?
- Compare worker positions across frames — if same idle position, flag as idle.
- Status must be: "working" (actively helping members/cleaning/supervising), "idle" (standing/sitting doing nothing), "on_phone" (looking at phone), "chatting" (talking to other staff instead of working), "on_break" (in break area).

ZONE COVERAGE:
- Reception desk must be staffed at all times during operating hours.
- At least one trainer/instructor must be on the gym floor at all times.
- Pool area requires supervision when members are present.
- Alert if gym floor has members but no staff visible.
- Check equipment room access — staff only areas.`,

  hospital: `HOSPITAL-SPECIFIC ANALYSIS:
- Verify PPE compliance per ward type (ICU requires full PPE).
- Count nurses visible per ward and compare to minimum nurse-patient ratio.
- Alert immediately if ICU or critical zone coverage drops below minimum.
- Monitor restricted zones — alert if anyone enters without proper PPE.
- Check handwashing stations are being used.
- Track visitor presence in restricted wards.`,

  construction: `CONSTRUCTION-SPECIFIC ANALYSIS:
- Check PPE strictly — helmet and safety vest mandatory for ALL personnel.
- Alert if anyone near edge or height without harness visible.
- Monitor danger zones — alert immediately if anyone enters without clearance.
- Check site security presence after working hours.
- Monitor scaffolding areas for overloading.
- Verify all workers have visible site ID badges.`,

  warehouse: `WAREHOUSE-SPECIFIC ANALYSIS:
- Monitor forklift zones — no pedestrians allowed.
- Check PPE compliance — safety boots and hi-vis vest required.
- Alert if emergency exits are blocked.
- Track loading dock activity — log vehicle arrivals.
- Monitor cold storage access — ensure doors are closed.
- Check stacking heights comply with safety limits.`,

  restaurant: `RESTAURANT-SPECIFIC ANALYSIS:
- Verify kitchen staff are wearing proper hygiene gear (hair nets, gloves, aprons).
- Check food prep areas for cleanliness compliance.
- Monitor dining area staffing during service hours.
- Alert if kitchen emergency exits are blocked.
- Track hygiene handwashing compliance.
- Check cold storage temperature displays if visible.`,

  security: `SECURITY-SPECIFIC ANALYSIS:
- Verify guard presence at all assigned posts.
- Monitor for unauthorized persons in restricted areas.
- Check gate/entry point is always manned.
- Alert if guard post is unattended for more than 5 minutes.
- Track visitor movements through secured zones.
- Monitor perimeter areas for breaches.`,

  home: `HOME SECURITY ANALYSIS:
- Identify all persons visible. Match against registered family members and domestic staff.
- Any person NOT matching a known face at the gate/entrance = flag as UNKNOWN VISITOR with high priority.
- Track domestic staff (maid, cook, driver): note arrival time, departure time, and zones visited.
- After-hours (23:00-06:00): ANY human motion is a potential intrusion — flag immediately as security alert.
- Check for packages/deliveries left at gate or entrance area.
- Monitor for elderly person inactivity: if living room or common area shows no person for 2+ hours during daytime (07:00-22:00), flag as welfare check.
- Note vehicles entering or leaving parking/garage area.
- Do NOT flag known family members moving around their own home during normal hours — this is routine, not an alert.
- Status for known persons: "at_home", "arrived", "left".
- Status for unknown persons: "at_gate", "on_property", "left_property", "loitering".
- Status for domestic staff: "arrived", "working", "idle", "left".`,
};

// ─── Industry-specific output fields ─────────────────────────────────────────
const INDUSTRY_OUTPUT_FIELDS = {
  factory: `"production_lines": [{"line": "name", "workers": 0, "status": "ok|understaffed"}],
    "ppe_compliance_rate": 0,
    "idle_workers": [{"name": "name", "zone": "zone", "idle_since": "X minutes"}]`,

  hotel: `"room_activity": [{"room": "number", "event": "entry|exit|loitering", "person": "name or unknown", "duration_minutes": 0}],
    "housekeeping_status": [{"room": "number", "housekeeper": "name", "minutes_elapsed": 0, "status": "ok|overdue"}],
    "corridor_status": "clear|active|alert"`,

  school: `"classroom_coverage": [{"room": "name", "teacher_present": true, "student_count": 0}],
    "supervision_gaps": ["unsupervised areas"],
    "gate_duty_status": "present|missing"`,

  retail: `"section_coverage": [{"section": "name", "staff_count": 0, "status": "ok|unmanned"}],
    "billing_counter_status": "staffed|unstaffed",
    "stockroom_access_log": [{"person": "name or unknown", "time": "time"}]`,

  gym: `"reception_staffed": true,
    "trainer_on_floor": true,
    "pool_supervised": true,
    "idle_workers": [{"name": "worker name", "zone": "where they are", "behaviour": "idle|on_phone|chatting", "duration_estimate": "how long"}],
    "workers_out_of_zone": [{"name": "worker name", "assigned_zone": "where they should be", "actual_zone": "where they are"}]`,

  hospital: `"ward_coverage": [{"ward": "name", "nurses_visible": 0, "minimum_required": 0, "ppe_compliant": true}],
    "ppe_violations_by_zone": [{"zone": "name", "violations": 0}],
    "restricted_zone_breaches": [{"zone": "name", "person": "name or unknown"}]`,

  construction: `"ppe_compliance_rate": 0,
    "height_work_detected": false,
    "danger_zone_breaches": [{"zone": "name", "person": "name or unknown"}],
    "site_security_status": "secure|breach"`,

  warehouse: `"forklift_zone_status": "clear|pedestrian_detected",
    "loading_dock_activity": [{"dock": "name", "status": "active|idle"}],
    "emergency_exits_clear": true`,

  restaurant: `"kitchen_hygiene_compliance": true,
    "dining_staff_count": 0,
    "food_prep_area_status": "compliant|violation",
    "handwashing_compliance": true`,

  security: `"guard_posts": [{"post": "name", "guard_present": true, "last_seen": "time"}],
    "unauthorized_persons": [{"location": "name", "description": "details"}],
    "perimeter_status": "secure|breach"`,
};

// ─── Shift name from time ────────────────────────────────────────────────────
function getShiftName(config) {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const shiftStart = config?.shift_start || '06:00';
  const shiftEnd = config?.shift_end || '22:00';

  if (currentTime >= shiftStart && currentTime < shiftEnd) {
    if (hours < 14) return 'morning';
    return 'afternoon';
  }
  return 'night';
}

// ─── Main prompt builder ─────────────────────────────────────────────────────
export function buildAnalysisPrompt(client, config, zones, workers, frameCount) {
  const clientName = client?.name || 'Unknown Client';
  const industry = config?.industry || client?.industry || 'general';
  const siteName = client?.site_name || config?.site_name || 'site';
  const shift = getShiftName(config);

  // Worker list
  const configWorkers = config?.workers || [];
  const dbWorkers = workers || [];
  const allWorkers = dbWorkers.length > 0 ? dbWorkers : configWorkers;

  const workerList = allWorkers.length > 0
    ? allWorkers.map(w => `- ${w.full_name || w.name} (${w.department || w.role || 'staff'}, ${w.shift || 'all'} shift)`).join('\n')
    : 'No workers registered — flag all persons as unidentified';

  // Zone list with rules
  const configZones = config?.zones || [];
  const dbZones = zones || [];
  const allZones = dbZones.length > 0 ? dbZones : configZones;

  const zoneList = allZones.map(z => {
    const name = z.name;
    const minStaff = z.min_workers ?? z.min_staff ?? 0;
    const maxStaff = z.max_workers ?? z.max_staff ?? 'unlimited';
    const restricted = z.restricted ? ' [RESTRICTED ZONE]' : '';
    const ppe = (z.ppe_requirements || z.ppe_required || []);
    const ppeStr = ppe.length > 0 ? `PPE required: ${ppe.join(', ')}` : 'No specific PPE required';
    const rules = (z.rules || []);
    const rulesStr = rules.length > 0 ? `Rules: ${rules.join('; ')}` : '';

    return `- ${name}${restricted} (${z.zone_type || 'general'}): staffing ${minStaff}-${maxStaff}. ${ppeStr}. ${rulesStr}`.trim();
  }).join('\n') || 'No zones configured';

  // PPE requirements (site-wide)
  const sitePPE = config?.ppe_requirements || [];
  const ppeSection = sitePPE.length > 0
    ? `SITE-WIDE PPE REQUIREMENTS:\nAll personnel must wear: ${sitePPE.join(', ')}`
    : '';

  // Alert rules
  const alertRules = config?.alert_rules || [];
  const alertSection = alertRules.length > 0
    ? `CUSTOM ALERT RULES:\n${alertRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
    : '';

  // Industry-specific prompt
  const industryPrompt = INDUSTRY_PROMPTS[industry] || INDUSTRY_PROMPTS.factory;

  // Industry-specific output fields
  const industryFields = INDUSTRY_OUTPUT_FIELDS[industry] || '';

  // Frame comparison instructions
  const frameInstructions = frameCount > 1
    ? `You are provided ${frameCount} frames from oldest to newest. Compare them to detect:
- Movement patterns (who moved where)
- Idle workers (same position across frames)
- New arrivals or departures
- Changes in zone occupancy`
    : 'You are provided a single frame. Analyze everything visible.';

  // Build the full prompt
  return `You are LenzAI AI — a workplace safety and compliance monitoring system for ${clientName} (${industry}), site: ${siteName}.

CURRENT TIME: ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
CURRENT SHIFT: ${shift.toUpperCase()}
OPERATING HOURS: ${config?.shift_start || '06:00'} — ${config?.shift_end || '22:00'}

REGISTERED WORKERS ON SHIFT:
${workerList}

SITE ZONES AND RULES:
${zoneList}

${ppeSection}

${alertSection}

${industryPrompt}

${frameInstructions}

INSTRUCTIONS:
1. Identify ALL persons visible in every camera view
2. Match faces to registered worker reference photos provided above
3. Flag any unregistered/unknown persons
4. Check PPE compliance per zone requirements
5. Check zone staffing against min/max requirements
6. Check for behavioural violations (phone use, sleeping, running, blocked exits)
7. Assess each worker's activity status (working, idle, on break)
8. Apply all custom alert rules listed above

SEVERITY LEVELS:
- HIGH: Safety risk, restricted zone breach, missing critical PPE, understaffed critical zone
- MEDIUM: Non-critical PPE missing, idle worker, minor rule violation
- LOW: Informational, slight deviation from rules

Return ONLY valid JSON — no markdown, no explanation, no code fences. Use exactly this structure:

{
  "timestamp": "${new Date().toISOString()}",
  "overall_status": "normal | warning | critical",
  "people_count": 0,
  "shift": "${shift}",
  "zones": [
    {
      "zone": "zone name",
      "count": 0,
      "minimum_required": 0,
      "status": "ok | understaffed | overstaffed | restricted_breach",
      "workers_identified": ["names"]
    }
  ],
  "detected_workers": [
    {
      "worker_id": "uuid or null",
      "worker_name": "name or Unknown Person",
      "zone": "zone name",
      "status": "working | idle | on_break | absent",
      "ppe_compliant": true,
      "ppe_violations": ["missing items"],
      "confidence": 0.85
    }
  ],
  "violations": [
    {
      "type": "PPE | Zone | Staffing | Behaviour | Unauthorised",
      "severity": "high | medium | low",
      "person": "name or unknown",
      "zone": "zone name",
      "description": "plain English description",
      "action_required": "what manager should do"
    }
  ],
  "alerts": [
    {
      "alert_type": "ppe_violation | zone_violation | behaviour | safety | staffing",
      "message": "WhatsApp-ready message under 100 chars",
      "severity": "high | medium | low",
      "worker_name": "name or null",
      "zone_name": "zone name"
    }
  ],
  ${industryFields ? `${industryFields},` : ''}
  "summary": "1-2 sentence overall summary"
}`;
}

// ─── Get the right model based on initial analysis ───────────────────────────
export function getAnalysisModel(quickResult) {
  // Use Haiku for routine scans, escalate to Sonnet if violations detected
  if (!quickResult) return 'claude-haiku-4-5-20251001';
  const hasHighSeverity = (quickResult.violations || []).some(v => v.severity === 'high');
  const hasAlerts = (quickResult.alerts || []).length > 0;
  if (hasHighSeverity) return 'claude-sonnet-4-6-20250514';
  return 'claude-haiku-4-5-20251001';
}

// ─── Calculate cost from token usage ─────────────────────────────────────────
export function calculateCost(model, inputTokens, outputTokens) {
  const pricing = {
    'claude-haiku-4-5-20251001': { input: 1.00 / 1_000_000, output: 5.00 / 1_000_000 },
    'claude-sonnet-4-6-20250514': { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  };
  const p = pricing[model] || pricing['claude-haiku-4-5-20251001'];
  return (inputTokens * p.input) + (outputTokens * p.output);
}
