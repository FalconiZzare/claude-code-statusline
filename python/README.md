# Claude Code Status Line (Python, deprecated)

> **Deprecated.** This script is replaced by the [usage-statusline mod](../README.md), which runs inside Claude Code on macOS, Windows and Linux with no Python and no settings to edit. The script below keeps working but gets no new features.

A lightweight Python script that powers a live status bar at the bottom of every Claude Code session, showing your model, context usage, git branch, rate limits, session duration, and current folder.

```
claude-fable-5  |  [▓▓▓░░░░░░░░░░░░░░░░░] 15%  |   main  |  5h:12%  |  7d:4%  |  Fable:38%  |  42m  |  my-project
```

---

## What it displays

| Segment | Description |
|---|---|
| **Model** | Active Claude model name |
| **Context bar** | Visual fill bar + percentage of context window used |
| **Git branch** | Current branch (or short commit hash if detached HEAD) |
| **5h limit** | Five-hour rolling rate limit usage |
| **7d limit** | Seven-day rolling rate limit usage |
| **Model limit** | Model-scoped weekly limit (e.g. Fable 5 or Opus), shown only if your plan has one. Claude Code does not pass this to statusline scripts, so the script fetches it from the same usage endpoint Claude Code uses for `/usage` (with your existing login, read from the macOS keychain or `~/.claude/.credentials.json`), caches it in `~/.claude/statusline-usage.json`, and refreshes it every 5 minutes in a detached background process so the status line never blocks. The segment dims if the cache is older than 30 minutes |
| **Session age** | Wall-clock time elapsed since the session started |
| **Folder** | Basename of the current working directory |

---

## Prerequisites

- **Python 3.8+**
- **Git** available in your PATH
- **Claude Code** CLI installed

---

## Installation

### Windows

1. Clone or download this repository:
   ```
   git clone https://github.com/OctopiAI/claude-code-statusline.git
   ```

2. Copy `python/windows/statusline.py` to a permanent location. Recommended:
   ```
   C:\Users\YOUR_USERNAME\.claude\statusline.py
   ```

3. Note your Python executable path. It varies by install method (Microsoft Store, python.org, Anaconda), so don't assume it matches the example below. To find it, open a terminal and run:
   ```
   where python
   ```

### macOS

1. Clone or download this repository:
   ```
   git clone https://github.com/OctopiAI/claude-code-statusline.git
   ```

2. Copy `python/mac/statusline.py` to a permanent location. Recommended:
   ```
   ~/.claude/statusline.py
   ```

3. Note your Python executable path. It varies by install method (system, Homebrew, pyenv, python.org), so don't assume `/usr/bin/python3`:
   ```
   which python3
   ```

---

## Configuration

Open (or create) your global Claude Code settings file:

- **Windows:** `C:\Users\YOUR_USERNAME\.claude\settings.json`
- **macOS:** `~/.claude/settings.json`

Add the `statusLine` block:

### Windows
```json
{
  "statusLine": {
    "type": "command",
    "command": "C:/path/to/python.exe C:/Users/YOUR_USERNAME/.claude/statusline.py"
  }
}
```

> Replace `C:/path/to/python.exe` with the output of `where python` from step 3 (e.g. `C:/Users/YOUR_USERNAME/AppData/Local/Programs/Python/Python313/python.exe`), written with forward slashes. Claude Code runs Windows status line commands through Git Bash when it's installed, which treats backslashes as escape characters and can silently mangle the path.

### macOS
```json
{
  "statusLine": {
    "type": "command",
    "command": "/path/to/python3 /Users/YOUR_USERNAME/.claude/statusline.py"
  }
}
```

> Use the full absolute path for both the Python executable (the output of `which python3` from step 3, e.g. `/opt/homebrew/bin/python3` or `/Library/Frameworks/Python.framework/Versions/3.x/bin/python3`) and the script. Claude Code does not inherit a login shell's `$PATH`, so `/usr/bin/python3` or a bare `python3` will silently fail to pick up your intended interpreter.

Restart Claude Code. The status bar will appear at the bottom of every session automatically, for every project.

> If nothing appears, make sure you've accepted the workspace trust dialog for the current directory: `statusLine` runs a shell command, so it's gated the same way hooks are. You'll see `statusline skipped · restart to fix` if trust hasn't been accepted yet; accept it and restart.

---

## Folder structure

```
python/
├── windows/
│   └── statusline.py
├── mac/
│   └── statusline.py
└── README.md
```

---

## License

MIT
