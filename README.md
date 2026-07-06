<div align="center">
    <h1>【 Claude Code Status Line 】</h1>
    <h3></h3>
</div>

<div align="center">

![](https://shields.octopi.ai/github/last-commit/OctopiAI/claude-code-statusline?&style=for-the-badge&color=8ad7eb&logo=git&logoColor=D9E0EE&labelColor=1E202B)
![](https://shields.octopi.ai/github/stars/OctopiAI/claude-code-statusline?style=for-the-badge&logo=andela&color=86dbd7&logoColor=D9E0EE&labelColor=1E202B)
![](https://shields.octopi.ai/github/repo-size/OctopiAI/claude-code-statusline?color=86dbce&label=SIZE&logo=protondrive&style=for-the-badge&logoColor=D9E0EE&labelColor=1E202B)
![](https://shields.octopi.ai/github/forks/OctopiAI/claude-code-statusline?color=86dbce&label=FORKS&logo=forgejo&style=for-the-badge&logoColor=D9E0EE&labelColor=1E202B)

</div>

A lightweight Python script that powers a live status bar at the bottom of every Claude Code session — showing your model, context usage, git branch, rate limits, session duration, and current folder.

```
claude-sonnet-4-6  |  [▓▓▓░░░░░░░░░░░░░░░░░] 15%  |   main  |  5h:12%  |  7d:4%  |  42m  |  my-project
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
   git clone https://github.com/YOUR_USERNAME/claude-code-statusline.git
   ```

2. Copy `windows/statusline.py` to a permanent location — recommended:
   ```
   C:\Users\YOUR_USERNAME\.claude\statusline.py
   ```

3. Note your Python executable path — this varies by install method (Microsoft Store, python.org, Anaconda), so don't assume it matches the example below. To find it, open a terminal and run:
   ```
   where python
   ```

### macOS

1. Clone or download this repository:
   ```
   git clone https://github.com/YOUR_USERNAME/claude-code-statusline.git
   ```

2. Copy `mac/statusline.py` to a permanent location — recommended:
   ```
   ~/.claude/statusline.py
   ```

3. Note your Python executable path — this varies by install method (system, Homebrew, pyenv, python.org), so don't assume `/usr/bin/python3`:
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

> Replace `C:/path/to/python.exe` with the output of `where python` from step 3 (e.g. `C:/Users/YOUR_USERNAME/AppData/Local/Programs/Python/Python313/python.exe`), written with forward slashes — Claude Code runs Windows status line commands through Git Bash when it's installed, which treats backslashes as escape characters and can silently mangle the path.

### macOS
```json
{
  "statusLine": {
    "type": "command",
    "command": "/path/to/python3 /Users/YOUR_USERNAME/.claude/statusline.py"
  }
}
```

> Use the full absolute path for both the Python executable (the output of `which python3` from step 3, e.g. `/opt/homebrew/bin/python3` or `/Library/Frameworks/Python.framework/Versions/3.x/bin/python3`) and the script — Claude Code does not inherit a login shell's `$PATH`, so `/usr/bin/python3` or a bare `python3` will silently fail to pick up your intended interpreter.

Restart Claude Code. The status bar will appear at the bottom of every session automatically, for every project.

> If nothing appears, make sure you've accepted the workspace trust dialog for the current directory — `statusLine` runs a shell command, so it's gated the same way hooks are. You'll see `statusline skipped · restart to fix` if trust hasn't been accepted yet; accept it and restart.

---

## Folder structure

```
claude-code-statusline/
├── windows/
│   └── statusline.py
├── mac/
│   └── statusline.py
└── README.md
```

---

## License

MIT
