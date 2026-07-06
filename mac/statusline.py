#!/usr/bin/env python3
import sys, json, subprocess
from pathlib import Path
from datetime import datetime
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

SEP = f"{DIM} | {R}"

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

# 6. Session duration — dim
tm = None
try:
    tm = int(float(d["cost"]["total_duration_ms"]) / 60000)
except (KeyError, TypeError, ValueError):
    pass
if tm is None:
    # Fallback for older Claude Code versions without cost.total_duration_ms.
    # st_birthtime (true creation time on macOS/APFS) is used instead of
    # st_ctime, which bumps on every append to the transcript and would
    # always read close to zero.
    tp = d.get("transcript_path", "")
    if tp:
        try:
            st = Path(tp).stat()
            ct = datetime.fromtimestamp(getattr(st, "st_birthtime", st.st_ctime))
            tm = int((datetime.now() - ct).total_seconds() / 60)
        except Exception:
            pass
if tm is not None:
    ds = f"{tm // 60}h {tm % 60:02d}m" if tm >= 60 else f"{tm}m"
    parts.append(f"{DIM}{ds}{R}")

# 7. Folder basename — bold cyan
fn = Path(cwd).name if cwd else "~"
parts.append(f"{CYB}{fn}{R}")

sys.stdout.write(SEP.join(parts) + "\n")
sys.stdout.flush()
