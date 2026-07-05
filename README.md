# claude-code-statusline

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
| **Session age** | Time elapsed since the session transcript was created |
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

3. Note your Python executable path. To find it, open a terminal and run:
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

3. Note your Python executable path:
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
    "command": "C:/Users/YOUR_USERNAME/AppData/Local/Programs/Python/Python313/python.exe C:/Users/YOUR_USERNAME/.claude/statusline.py"
  }
}
```

### macOS
```json
{
  "statusLine": {
    "type": "command",
    "command": "/usr/bin/python3 /Users/YOUR_USERNAME/.claude/statusline.py"
  }
}
```

> Use the full absolute path for both the Python executable and the script — Claude Code does not inherit a login shell's `$PATH`.

Restart Claude Code. The status bar will appear at the bottom of every session automatically, for every project.

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
