#!/bin/bash
# StaffLenz end-to-end health check — run from project root.
# Requires: .env.local with SUPABASE vars; Mac on gym LAN to hit DVR.

set -e
cd "$(dirname "$0")"

SUPA_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)
SUPA_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2-)
CID="dc20bf56-01e3-4a10-90e8-cb45e5c3e971"
APP="https://www.stafflenz.com"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; }
warn() { echo "  ⚠️  $1"; }

echo "═══ 1. Edge agent ═══"
if pgrep -f "node agent.js" >/dev/null; then
  pass "Agent process running (PID $(pgrep -f 'node agent.js'))"
else
  warn "Agent not running. Start with: cd edge-agent && nohup node agent.js > /tmp/edge-agent.log 2>&1 & disown"
fi

echo ""
echo "═══ 2. DVR reachability ═══"
if curl -sS -m 3 -o /dev/null "http://192.168.68.101/ISAPI/System/deviceInfo" 2>/dev/null; then
  pass "DVR 192.168.68.101 reachable"
else
  fail "DVR unreachable — wrong network?"
fi

echo ""
echo "═══ 3. Recent analysis rows ═══"
ROWS=$(curl -sS "$SUPA_URL/rest/v1/monitoring_results?select=created_at&client_id=eq.$CID&order=created_at.desc&limit=1" \
  -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY")
LATEST=$(echo "$ROWS" | python3 -c "import sys,json,datetime;d=json.load(sys.stdin);print(d[0]['created_at'] if d else 'NONE')" 2>/dev/null)
if [ "$LATEST" = "NONE" ]; then
  fail "No monitoring_results rows — agent has never written analysis"
else
  AGE=$(python3 -c "import datetime,sys;t=datetime.datetime.fromisoformat('$LATEST'.replace('Z','+00:00'));now=datetime.datetime.now(datetime.timezone.utc);print(int((now-t).total_seconds()/60))")
  if [ "$AGE" -lt 10 ]; then
    pass "Latest analysis: ${AGE} min ago"
  else
    warn "Latest analysis: ${AGE} min ago (expected < 5 min if agent is running)"
  fi
fi

echo ""
echo "═══ 4. Industry pages ═══"
FAILED=0
for slug in gym factory construction retail warehouse hotel restaurant hospital school security; do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" -L "$APP/industries/$slug")
  if [ "$CODE" != "200" ]; then
    fail "/industries/$slug → HTTP $CODE"
    FAILED=$((FAILED+1))
  fi
done
if [ "$FAILED" = "0" ]; then pass "All 10 industry pages return 200"; fi

echo ""
echo "═══ 5. Signup + checkout pages ═══"
for path in "/signup" "/signup/checkout" "/billing" "/industries"; do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" -L "$APP$path")
  if [ "$CODE" = "200" ]; then
    pass "$path → 200"
  else
    fail "$path → HTTP $CODE"
  fi
done

echo ""
echo "═══ 6. Razorpay plans synced ═══"
SYNCED=$(curl -sS "$SUPA_URL/rest/v1/plan_limits?select=plan,razorpay_plan_id" \
  -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(sum(1 for p in d if p.get('razorpay_plan_id')))")
if [ "$SYNCED" -ge 4 ]; then
  pass "$SYNCED plans synced with Razorpay"
else
  warn "Only $SYNCED plans have razorpay_plan_id. Run: POST $APP/api/billing/sync-plans"
fi

echo ""
echo "═══ 7. Industry packs seeded ═══"
PACKS=$(curl -sS "$SUPA_URL/rest/v1/industry_packs?select=slug&is_active=eq.true" \
  -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY" \
  | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
if [ "$PACKS" = "10" ]; then
  pass "All 10 industry packs seeded"
else
  warn "Only $PACKS industry packs found (expected 10). Run migration-industry-packs.sql"
fi

echo ""
echo "═══ Done ═══"
