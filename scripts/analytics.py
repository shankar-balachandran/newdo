#!/usr/bin/env python3
"""Cloudflare traffic for newdo.beaverminds.com and beaverminds.com (HTML page loads, bots filtered by path).
Uses wrangler's OAuth token. Run `npx wrangler whoami` first if you get a 401.
Usage: python3 scripts/analytics.py [hours]   (default 24)"""
import sys, json, re, urllib.request, subprocess, datetime as dt
from pathlib import Path

HOURS = int(sys.argv[1]) if len(sys.argv) > 1 else 24
ZONE = "b7dc74032c9b792351149b8f83fafec5"  # beaverminds.com
HOSTS = ["newdo.beaverminds.com", "beaverminds.com"]
# Only paths that actually exist on each site count; everything else is a scanner.
REAL = {
    "newdo.beaverminds.com": re.compile(r"^/(how/?)?(\?.*)?$"),
    "beaverminds.com": re.compile(r"^/(labs|blog(/[^/]+)?|case-studies|founders|growing-businesses|how-we-work|openbravo-etendo|assessment|privacy-policy|terms-of-service)?/?(\?.*)?$"),
}

tok = re.search(r'oauth_token\s*=\s*"([^"]+)"', (Path.home() / "Library/Preferences/.wrangler/config/default.toml").read_text()).group(1)
now = dt.datetime.now(dt.timezone.utc); start = now - dt.timedelta(hours=HOURS)
iso = lambda t: t.strftime("%Y-%m-%dT%H:%M:%SZ")

def gql(q, v):
    req = urllib.request.Request("https://api.cloudflare.com/client/v4/graphql", data=json.dumps({"query": q, "variables": v}).encode(),
                                 headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json"})
    try: return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e: sys.exit(f"HTTP {e.code}. Run: npx wrangler whoami  (refreshes the token)")

for host in HOSTS:
    f = f'clientRequestHTTPHost:"{host}",edgeResponseContentTypeName:"html",datetime_geq:$s,datetime_leq:$e'
    q = """query($z:String!,$s:Time!,$e:Time!){viewer{zones(filter:{zoneTag:$z}){
      byPath: httpRequestsAdaptiveGroups(limit:5000,filter:{%s},orderBy:[count_DESC]){count sum{visits} dimensions{clientRequestPath}}
      byHour: httpRequestsAdaptiveGroups(limit:5000,filter:{%s},orderBy:[datetimeHour_ASC]){count sum{visits} dimensions{datetimeHour clientRequestPath}}
      byCountry: httpRequestsAdaptiveGroups(limit:5000,filter:{%s},orderBy:[count_DESC]){count dimensions{clientCountryName clientRequestPath}}
    }}}""" % (f, f, f)
    z = gql(q, {"z": ZONE, "s": iso(start), "e": iso(now)})["data"]["viewer"]["zones"][0]
    real = lambda p: bool(REAL[host].match(p))
    paths = [x for x in z["byPath"] if real(x["dimensions"]["clientRequestPath"])]
    noise = sum(x["count"] for x in z["byPath"]) - sum(x["count"] for x in paths)
    total = sum(x["count"] for x in paths); visits = sum(x["sum"]["visits"] for x in paths)
    print(f"\n=== {host}  last {HOURS}h  |  real page loads {total}, visits {visits}  (bot probes filtered: {noise})")
    hours = {}
    for x in z["byHour"]:
        if real(x["dimensions"]["clientRequestPath"]):
            h = x["dimensions"]["datetimeHour"]; hours.setdefault(h, [0, 0]); hours[h][0] += x["count"]; hours[h][1] += x["sum"]["visits"]
    print("  by hour (IST):")
    for h in sorted(hours):
        t = dt.datetime.fromisoformat(h.replace("Z", "+00:00")) + dt.timedelta(hours=5, minutes=30)
        c, v = hours[h]
        if c: print(f"    {t.strftime('%a %H:%M')}  {c:5} loads  {v:4} visits  {'#' * min(60, c // 5)}")
    print("  by path:")
    for x in paths[:10]: print(f"    {x['count']:5}  {x['dimensions']['clientRequestPath']}")
    ctry = {}
    for x in z["byCountry"]:
        if real(x["dimensions"]["clientRequestPath"]): ctry[x["dimensions"]["clientCountryName"]] = ctry.get(x["dimensions"]["clientCountryName"], 0) + x["count"]
    print("  by country:", ", ".join(f"{k} {v}" for k, v in sorted(ctry.items(), key=lambda kv: -kv[1])[:8]))
