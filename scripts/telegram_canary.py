#!/usr/bin/env python3
"""
Read-only Telegram canary.
- Reads TELEGRAM_BOT_TOKEN from the process environment only.
- Calls read-only Bot API methods.
- Never prints the token.
- Never sends a message or changes bot profile/settings.
"""
import json
import os
import sys
import urllib.request
import urllib.error

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
EXPECTED = os.environ.get("TELEGRAM_EXPECTED_USERNAME", "SmartAGEN_bot").strip().lstrip("@")

if not TOKEN:
    print("CANARY_FAIL: TELEGRAM_BOT_TOKEN is not set in the runtime environment")
    raise SystemExit(2)

def api(method):
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{TOKEN}/{method}",
        headers={"User-Agent": "rtafnc-gooddeed-telegram-canary/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        print(f"CANARY_FAIL: Telegram HTTP {exc.code}")
        raise SystemExit(3)
    except Exception:
        print("CANARY_FAIL: Telegram request failed")
        raise SystemExit(4)
    if not payload.get("ok"):
        print("CANARY_FAIL: Telegram API returned ok=false")
        raise SystemExit(5)
    return payload.get("result")

me = api("getMe")
username = str((me or {}).get("username") or "")
if EXPECTED and username.lower() != EXPECTED.lower():
    print(f"CANARY_FAIL: bot username mismatch (received @{username or 'unknown'})")
    raise SystemExit(6)

name = api("getMyName") or {}
short_desc = api("getMyShortDescription") or {}
desc = api("getMyDescription") or {}

print("CANARY_OK")
print(f"username=@{username}")
print(f"name={name.get('name','')}")
print(f"short_description={short_desc.get('short_description','')}")
print(f"description={desc.get('description','')}")
print("No write/send/profile-change method was called.")
