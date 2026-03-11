#!/usr/bin/env bash
set -euo pipefail

SOCKET_DIR="${CLAWDBOT_TMUX_SOCKET_DIR:-${TMPDIR:-/tmp}/clawdbot-tmux-sockets}"
SOCKET="${TMUX_SOCKET:-$SOCKET_DIR/evelyn.sock}"
SESSION="${TMUX_SESSION:-evelyn-orchestrator}"
ROOT="${TMUX_ROOT:-/Users/naledi/Projects/evelyn}"

mkdir -p "$SOCKET_DIR"

if tmux -S "$SOCKET" has-session -t "$SESSION" 2>/dev/null; then
  echo "Session already exists: $SESSION"
  echo "Attach with: tmux -S \"$SOCKET\" attach -t \"$SESSION\""
  exit 0
fi

tmux -S "$SOCKET" new-session -d -s "$SESSION" -n orchestrator -c "$ROOT"

# ──────────────────────────────────────────────────
# Pane layout — window 0 (orchestrator)
# ──────────────────────────────────────────────────
ORCH_PANE="$(tmux -S "$SOCKET" list-panes -t "$SESSION":orchestrator -F "#{pane_id}" | head -n 1)"
BUILDER_PANE="$(tmux -S "$SOCKET" split-window -h -t "$ORCH_PANE" -c "$ROOT" -P -F "#{pane_id}")"
TESTS_PANE="$(tmux -S "$SOCKET" split-window -v -t "$BUILDER_PANE" -c "$ROOT" -P -F "#{pane_id}")"
GIT_PANE="$(tmux -S "$SOCKET" split-window -v -t "$ORCH_PANE" -c "$ROOT" -P -F "#{pane_id}")"
tmux -S "$SOCKET" select-layout -t "$SESSION":orchestrator tiled

# ──────────────────────────────────────────────────
# Pane layout — window 1 (research)
# ──────────────────────────────────────────────────
tmux -S "$SOCKET" new-window -t "$SESSION" -n research -c "$ROOT"
EXPLORE_A_PANE="$(tmux -S "$SOCKET" list-panes -t "$SESSION":research -F "#{pane_id}" | head -n 1)"
EXPLORE_B_PANE="$(tmux -S "$SOCKET" split-window -h -t "$EXPLORE_A_PANE" -c "$ROOT" -P -F "#{pane_id}")"
GENERAL_A_PANE="$(tmux -S "$SOCKET" split-window -v -t "$EXPLORE_A_PANE" -c "$ROOT" -P -F "#{pane_id}")"
tmux -S "$SOCKET" select-layout -t "$SESSION":research tiled

# ──────────────────────────────────────────────────
# Pane titles with emoji for instant recognition
# ──────────────────────────────────────────────────
tmux -S "$SOCKET" select-pane -t "$ORCH_PANE"      -T "👑 orchestrator"
tmux -S "$SOCKET" select-pane -t "$BUILDER_PANE"    -T "🔨 builder"
tmux -S "$SOCKET" select-pane -t "$TESTS_PANE"      -T "🧪 tests"
tmux -S "$SOCKET" select-pane -t "$GIT_PANE"        -T "🌿 git"
tmux -S "$SOCKET" select-pane -t "$EXPLORE_A_PANE"  -T "🔭 explore-a"
tmux -S "$SOCKET" select-pane -t "$EXPLORE_B_PANE"  -T "🔬 explore-b"
tmux -S "$SOCKET" select-pane -t "$GENERAL_A_PANE"  -T "⚡ general-a"

# ──────────────────────────────────────────────────
# 🎨 Pane color theming — ADHD-friendly visual coding
# Each pane gets a unique bg/fg so you always know where you are.
# ──────────────────────────────────────────────────

# 👑 orchestrator — deep indigo + lavender (command/authority)
tmux -S "$SOCKET" select-pane -t "$ORCH_PANE" -P 'bg=#1a1033,fg=#c4b5fd'

# 🔨 builder — deep forest + bright green (PRIMARY — most prominent)
tmux -S "$SOCKET" select-pane -t "$BUILDER_PANE" -P 'bg=#0d1f0d,fg=#4ade80'

# 🧪 tests — deep amber + gold (attention/signals)
tmux -S "$SOCKET" select-pane -t "$TESTS_PANE" -P 'bg=#1f1507,fg=#fbbf24'

# 🌿 git — deep navy + sky blue (calm info)
tmux -S "$SOCKET" select-pane -t "$GIT_PANE" -P 'bg=#0d1520,fg=#38bdf8'

# 🔭 explore-a — deep rose + pink (curiosity)
tmux -S "$SOCKET" select-pane -t "$EXPLORE_A_PANE" -P 'bg=#1a0d14,fg=#f472b6'

# 🔬 explore-b — deep teal + bright teal (analytical)
tmux -S "$SOCKET" select-pane -t "$EXPLORE_B_PANE" -P 'bg=#0d1a1a,fg=#2dd4bf'

# ⚡ general-a — dark olive + silver (utility)
tmux -S "$SOCKET" select-pane -t "$GENERAL_A_PANE" -P 'bg=#1a1a0d,fg=#d4d4d4'

# ──────────────────────────────────────────────────
# Pane border styling (requires tmux 3.2+)
# Shows pane title in the border
# ──────────────────────────────────────────────────
tmux -S "$SOCKET" set-option -t "$SESSION" pane-border-status top
tmux -S "$SOCKET" set-option -t "$SESSION" pane-border-format \
  ' #{?pane_active,#[bold],#[dim]}#{pane_title} '
tmux -S "$SOCKET" set-option -t "$SESSION" pane-border-style 'fg=#3f3f46'
tmux -S "$SOCKET" set-option -t "$SESSION" pane-active-border-style 'fg=#a78bfa,bold'

# ──────────────────────────────────────────────────
# Status line — window tabs with role colors
# ──────────────────────────────────────────────────
tmux -S "$SOCKET" set-option -t "$SESSION" status-style 'bg=#0f0f14,fg=#71717a'
tmux -S "$SOCKET" set-option -t "$SESSION" status-left \
  '#[bg=#1a1033,fg=#c4b5fd,bold] 👑 #{session_name} #[default] '
tmux -S "$SOCKET" set-option -t "$SESSION" status-right \
  '#[fg=#3f3f46]│ #[fg=#a3a3a3]%H:%M '
tmux -S "$SOCKET" set-option -t "$SESSION" window-status-format \
  ' #[fg=#71717a]#I:#W '
tmux -S "$SOCKET" set-option -t "$SESSION" window-status-current-format \
  '#[bg=#1e1b4b,fg=#c4b5fd,bold] #I:#W #[default]'

# ──────────────────────────────────────────────────
# Preload commands into each pane
# ──────────────────────────────────────────────────

# 👑 orchestrator — show milestone plan
tmux -S "$SOCKET" send-keys -t "$ORCH_PANE" \
  'cat MILESTONE_PLAN_CURRENT.md 2>/dev/null || echo "No milestone plan found. Create MILESTONE_PLAN_CURRENT.md"' Enter

# 🔨 builder — ready in evelyn-python
tmux -S "$SOCKET" send-keys -t "$BUILDER_PANE" \
  'cd evelyn-python && echo "🔨 Builder ready — evelyn-python" && ls' Enter

# 🧪 tests — start test watcher (or show how to run)
tmux -S "$SOCKET" send-keys -t "$TESTS_PANE" \
  'cd evelyn-python && echo "🧪 Test lane ready" && if [ -f Makefile ]; then echo "Run: make test"; else echo "Run: python -m pytest"; fi' Enter

# 🌿 git — show submodule status on a 10s loop
tmux -S "$SOCKET" send-keys -t "$GIT_PANE" \
  'cd '"$ROOT"' && echo "🌿 Git status (refreshes every 10s, Ctrl-C to stop)" && while true; do clear; for d in evelyn-python evelyn-elixir evelyn-specs; do if [ -d "$d/.git" ] || [ -f "$d/.git" ]; then echo "── $d ──"; git -C "$d" status -sb 2>/dev/null; git -C "$d" log --oneline -3 2>/dev/null; echo ""; fi; done; date +%H:%M:%S; sleep 10; done' Enter

# 🔭 explore-a — show project structure (works with fd or find)
tmux -S "$SOCKET" send-keys -t "$EXPLORE_A_PANE" \
  'echo "🔭 Explore-A: codebase discovery" && if command -v fd &>/dev/null; then fd --max-depth 3 --exclude .git; else command find . -maxdepth 3 -not -path "./.git/*" -not -path "./.git"; fi | head -60' Enter

# 🔬 explore-b — show specs
tmux -S "$SOCKET" send-keys -t "$EXPLORE_B_PANE" \
  'echo "🔬 Explore-B: spec/dependency checks" && ls -la evelyn-specs/ 2>/dev/null || echo "No specs submodule"' Enter

# ⚡ general-a — ready for ad-hoc commands
tmux -S "$SOCKET" send-keys -t "$GENERAL_A_PANE" \
  'echo "⚡ General-A: ready for quick scripts and validation"' Enter

# ──────────────────────────────────────────────────
# Focus on orchestrator window, builder pane
# ──────────────────────────────────────────────────
tmux -S "$SOCKET" select-window -t "$SESSION":orchestrator
tmux -S "$SOCKET" select-pane -t "$BUILDER_PANE"

echo "Created tmux orchestration session: $SESSION"
echo ""
echo "  Window 1 [orchestrator]"
echo "    👑 orchestrator  — deep indigo    (milestone plan)"
echo "    🔨 builder       — forest green   (production code)"
echo "    🧪 tests         — amber/gold     (test watcher)"
echo "    🌿 git           — navy/sky blue  (status loop)"
echo ""
echo "  Window 2 [research]"
echo "    🔭 explore-a     — rose/pink      (codebase discovery)"
echo "    🔬 explore-b     — teal           (spec/dep checks)"
echo "    ⚡ general-a     — olive/silver   (quick scripts)"
echo ""
echo "Socket: $SOCKET"
echo "Attach: tmux -S \"$SOCKET\" attach -t \"$SESSION\""
