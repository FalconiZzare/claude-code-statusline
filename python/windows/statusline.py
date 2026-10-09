#!/usr/bin/env python3
import sys, os, json, time, subprocess
from pathlib import Path
from datetime import datetime, timezone
sys.stdout.reconfigure(encoding='utf-8')
sys.stdin.reconfigure(encoding='utf-8')

def e(code): return f"\033[{code}m"

R    = e(0)
BOLD = e(1)
DIM  = e(2)
YLB  = e("1;33")  # bold yellow  — model
YL   = e(33)       # yellow       — separators, brackets, context %, 5h
GR   = e(32)       # green        — bar filled, 7d
CYB  = e("1;36")  # bold cyan    — branch + folder
MG   = e(35)       # magenta      — model-scoped weekly limit (Fable 5 / Opus)

SEP = f"{DIM} | {R}"

# ---- Usage helpers (model-scoped weekly limit) ------------------------------
# Claude Code forwards only five_hour and seven_day in the statusline stdin
# payload. The model-scoped weekly limit (Fable 5 / Opus) exists only in the
# response of the usage endpoint Claude Code itself calls for /usage. Recent
# builds no longer persist that response to ~/.claude.json, so this script
# fetches it directly with the same OAuth token, caches it on disk, and
# refreshes it in a detached background process ("--refresh") so rendering
# never waits on the network. The access token is only ever read, never
# refreshed: Claude Code owns the refresh flow and rewrites the credentials
# on its own, so a 401 here simply keeps the last cached value.
USAGE_CACHE = Path.home() / ".claude" / "statusline-usage.json"
USAGE_URL   = "https://api.anthropic.com/api/oauth/usage"
USAGE_TTL   = 300    # seconds between refreshes (matches Claude Code's own throttle)
USAGE_STALE = 1800   # seconds after which the segment is dimmed as stale
USAGE_LOCK  = 60     # seconds a pending refresh blocks another spawn

def oauth_token():
    # Windows: Claude Code keeps credentials in ~/.claude/.credentials.json.
    try:
        cred = json.loads((Path.home() / ".claude" / ".credentials.json").read_text(encoding="utf-8"))
        return (cred.get("claudeAiOauth") or {}).get("accessToken")
    except Exception:
        return None

def http_get_json(url, headers):
    import ssl, urllib.request, urllib.error
    req = urllib.request.Request(url, headers=headers)
    # Some Python builds ship without a usable CA bundle, so plain urllib
    # fails TLS verification. Try the default trust store, then certifi.
    contexts = [None]
    try:
        import certifi
        contexts.append(ssl.create_default_context(cafile=certifi.where()))
    except Exception:
        pass
    for ctx in contexts:
        try:
            with urllib.request.urlopen(req, timeout=5, context=ctx) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError:
            raise          # a real server answer (401 etc.): nothing to retry
        except Exception:
            continue       # TLS / network trouble: try the next trust source
    # Last resort: curl (bundled with Windows 10+) uses the OS trust store.
    # Headers are passed as a config on stdin so the token never shows up in
    # the process list.
    cfg = "".join(f'header = "{k}: {v}"\n' for k, v in headers.items())
    out = subprocess.check_output(
        ["curl", "-sSf", "-m", "5", "-K", "-", url],
        input=cfg, text=True, timeout=8, stderr=subprocess.DEVNULL
    )
    return json.loads(out)

def refresh_usage():
    tok = oauth_token()
    if not tok:
        return
    data = http_get_json(USAGE_URL, {
        "Authorization": f"Bearer {tok}",
        "anthropic-beta": "oauth-2025-04-20",
        "Content-Type": "application/json",
        "User-Agent": "claude-code-statusline",
    })
    if not isinstance(data, dict) or not ("limits" in data or "five_hour" in data):
        return
    USAGE_CACHE.parent.mkdir(parents=True, exist_ok=True)
    tmp = USAGE_CACHE.with_suffix(".tmp")
    tmp.write_text(json.dumps({"fetched_at": time.time(), "data": data}), encoding="utf-8")
    os.replace(tmp, USAGE_CACHE)   # atomic: readers never see a half-written file

def load_usage_cache():
    try:
        c = json.loads(USAGE_CACHE.read_text(encoding="utf-8"))
        return float(c["fetched_at"]), c["data"]
    except Exception:
        return None, None

def spawn_refresher():
    # At most one refresher in flight: the lock file's mtime is the guard, so a
    # failed or hung fetch cannot pile up processes on every status line tick.
    lock = USAGE_CACHE.with_suffix(".lock")
    try:
        if time.time() - lock.stat().st_mtime < USAGE_LOCK:
            return
    except OSError:
        pass
    try:
        lock.parent.mkdir(parents=True, exist_ok=True)
        lock.touch()
        flags = (getattr(subprocess, "DETACHED_PROCESS", 0)
                 | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
                 | getattr(subprocess, "CREATE_NO_WINDOW", 0))
        subprocess.Popen(
            [sys.executable, os.path.abspath(__file__), "--refresh"],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            creationflags=flags, close_fds=True,
        )
    except Exception:
        pass

if "--refresh" in sys.argv[1:]:
    try:
        refresh_usage()
    except Exception:
        pass
    sys.exit(0)

raw = sys.stdin.read().strip()
if not raw:
    sys.exit(0)
try:
    d = json.loads(raw)
except Exception:
    sys.exit(0)

parts = []

# 1. Model — bold yellow
mn = (d.get("model") or {}).get("display_name") or (d.get("model") or {}).get("id", "")
if mn:
    parts.append(f"{YLB}{mn}{R}")

# 2. Context bar — [▓▓▓░░░░░░░░░] 4%  (yellow brackets, green filled, dim empty)
up = None
try:
    up = float((d.get("context_window") or {}).get("used_percentage", None))
except (TypeError, ValueError):
    pass
if up is not None:
    f = max(0, min(20, round(up / 5)))          # 20-block bar
    filled = f"{GR}\u2593{R}" * f
    empty  = f"{DIM}\u2591{R}" * (20 - f)
    parts.append(f"{GR}[{R}{filled}{empty}{GR}]{R} {e(90)}{round(up)}%{R}")

# 3. Git branch — green  icon
cwd = (d.get("workspace") or {}).get("current_dir") or d.get("cwd", "")
if cwd:
    try:
        br = subprocess.check_output(
            ["git", "-C", cwd, "symbolic-ref", "--short", "HEAD"],
            stderr=subprocess.DEVNULL, text=True, timeout=2
        ).strip()
    except Exception:
        try:
            br = subprocess.check_output(
                ["git", "-C", cwd, "rev-parse", "--short", "HEAD"],
                stderr=subprocess.DEVNULL, text=True, timeout=2
            ).strip()
        except Exception:
            br = ""
    if br:
        parts.append(f"{GR} {br}{R}")

# 4. 5h rate limit — yellow
try:
    v = float(d["rate_limits"]["five_hour"]["used_percentage"])
    parts.append(f"{YL}5h:{round(v)}%{R}")
except (KeyError, TypeError, ValueError):
    pass

# 5. 7d rate limit — green
try:
    v = float(d["rate_limits"]["seven_day"]["used_percentage"])
    parts.append(f"{GR}7d:{round(v)}%{R}")
except (KeyError, TypeError, ValueError):
    pass

# 6. Model-scoped weekly limit (Fable 5 / Opus) — magenta, dimmed when stale
# Rendered from the on-disk usage cache (see usage helpers above). When the
# cache is older than USAGE_TTL a detached refresh is kicked off; this tick
# still renders the previous value so the status line never blocks on I/O.
# Entries whose resets_at has already passed are skipped as stale.
try:
    fetched, usage = load_usage_cache()
    if fetched is None or time.time() - fetched > USAGE_TTL:
        spawn_refresher()
    if usage:
        col = DIM if time.time() - fetched > USAGE_STALE else MG
        now = datetime.now(timezone.utc)
        for lim in usage.get("limits") or []:
            if not isinstance(lim, dict) or lim.get("kind") != "weekly_scoped":
                continue
            ra = lim.get("resets_at")
            if ra:
                try:
                    if datetime.fromisoformat(ra) < now:
                        continue
                except (TypeError, ValueError):
                    pass
            name = ((lim.get("scope") or {}).get("model") or {}).get("display_name") or "model"
            try:
                parts.append(f"{col}{name}:{round(float(lim['percent']))}%{R}")
            except (KeyError, TypeError, ValueError):
                pass
except Exception:
    pass

# 7. Session duration — dim
tp = d.get("transcript_path", "")
if tp:
    try:
        ct = datetime.fromtimestamp(Path(tp).stat().st_ctime)
        tm = int((datetime.now() - ct).total_seconds() / 60)
        ds = f"{tm // 60}h {tm % 60:02d}m" if tm >= 60 else f"{tm}m"
        parts.append(f"{DIM}{ds}{R}")
    except Exception:
        pass

# 8. Folder basename — bold cyan
fn = Path(cwd).name if cwd else "~"
parts.append(f"{CYB}{fn}{R}")

sys.stdout.write(SEP.join(parts) + "\n")
sys.stdout.flush()
