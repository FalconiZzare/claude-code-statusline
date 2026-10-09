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

A Claude Code mod that draws a live usage line under the prompt: your model, context usage, git branch, rate limits, session time and folder, plus how long the prompt cache stays warm and what re-caching would cost. The same on macOS, Windows and Linux, in the terminal and the desktop app. No Python, no scripts, no settings to edit.

```
OPUS 5.5 │ [▓░░░░░░░░░] 12% 46K/400K │ main │ 5H 3% │ WEEK 62% │ FABLE 38% │ 42M │ my-project │ ● CACHE WARM 58M │ REWRITE ≈ $0.69
```

One row when the terminal is wide enough; a narrower one breaks onto more rows between segments.

> Looking for the original Python status line script? It now lives in [`python/`](python/) and is deprecated in favor of this mod.

---

## Install (macOS, Windows, Linux)

Requirements: Claude Code **2.1.287 or later** (`claude --version`; update with `claude update`). The 5h, week and model limits need you signed in with a Claude subscription; on an API key they are simply left out.

1. Start Claude Code in any terminal (Terminal, iTerm, Windows Terminal, PowerShell, any Linux terminal).
2. At the prompt, type:

   ```
   /plugin install usage-statusline --marketplace OctopiAI/claude-code-statusline
   ```

3. Answer `y` to add the marketplace, then press Enter to keep the default **user** scope.

You'll see `Installed usage-statusline. Plugin is now active.` and the line appears under the prompt right away, no restart needed. With the user scope it shows in every session from then on, in every project, and in the Claude Code desktop app too. The desktop app can't run `/plugin install` itself, so install once from a terminal.

**Coming from the Python script?** Remove the `statusLine` block from `~/.claude/settings.json` (Windows: `C:\Users\YOUR_USERNAME\.claude\settings.json`), or you'll see both lines.

**Update:** `claude plugin update usage-statusline`, then `/reload-plugins` in a running session.<br>
**Uninstall:** `claude plugin uninstall usage-statusline`.

---

## What it displays

| Segment | Description |
|---|---|
| **Model** | Active model, e.g. `OPUS 5.5` |
| **Context** | Fill bar, percentage and tokens of the context window; red from 80% |
| **Branch** | Current git branch (or short commit hash on a detached HEAD) |
| **5h / Week** | Rate-limit windows; red from 80% |
| **Model weekly** | A model's own weekly limit (e.g. Fable), shown only if your plan has one. Claude Code doesn't hand it to mods, so the mod reads it from the same usage endpoint `/usage` uses, with your existing login, every 5 minutes. Dims when the reading is older than 30 minutes |
| **Session** | Time since the session started |
| **Folder** | Current folder |
| **Cache** | Time left before the prompt cache goes cold: green, amber under half, red in the last 20%, `○ CACHE COLD` once it has expired |
| **Rewrite** | What re-caching the current context would cost at the model's list cache-write price (1.25x input on a 5m cache, 2x on a 1h cache); amber once the cache is cold, since that is when the next prompt pays it |

The cache TTL is 1h on a Claude subscription and 5m otherwise; override it with the `cacheTtl` option in `/config`.

---

## Developing

The mod is a Claude Code plugin of function hooks: `hooks/register.tsx` is the hooks module, `hooks/format.ts` the formatting, `types/index.d.ts` the state it keeps.

```
claude --plugin-dir /path/to/claude-code-statusline   # run a session with your working copy; saving a file reloads it
claude plugin validate .                              # manifest, marketplace and hooks module
claude plugin test .                                  # tests/*.test.tsx
```

---

## Folder structure

```
claude-code-statusline/
├── .claude-plugin/
│   ├── plugin.json        # the mod's manifest
│   └── marketplace.json   # makes this repo installable with /plugin install
├── hooks/
│   ├── hooks.json
│   ├── register.tsx
│   └── format.ts
├── types/
│   └── index.d.ts
├── tests/
│   └── band.test.tsx
├── python/                # deprecated Python status line script
└── README.md
```

---

## License

MIT
