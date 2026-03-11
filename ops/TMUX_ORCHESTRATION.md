# tmux Agent Orchestration

This gives you a repeatable tmux workspace for milestone execution with one build lane and parallel research lanes.

## Start session

```bash
chmod +x ops/tmux_orchestrate.sh
./ops/tmux_orchestrate.sh
```

Attach:

```bash
tmux -S "${TMUX_SOCKET:-${CLAWDBOT_TMUX_SOCKET_DIR:-${TMPDIR:-/tmp}/clawdbot-tmux-sockets}/evelyn.sock}" attach -t "${TMUX_SESSION:-evelyn-orchestrator}"
```

## Pane role map

Window `orchestrator`:
- pane `orchestrator`: milestone plan, acceptance criteria, command queue
- pane `builder`: production edits and integration
- pane `tests`: test/build/typecheck loop
- pane `git`: `git status`, diffs, branch checks

Window `research`:
- pane `explore-a`: codebase discovery tasks
- pane `explore-b`: dependency/spec checks
- pane `general-a`: quick scripts/validation ideas

## Working protocol

1. Keep `builder` as the only pane where production code is changed.
2. Use `research` panes for read-only work and command experiments.
3. Promote findings back to `orchestrator` pane as decisions.
4. Run verification in `tests` pane before any commit/PR.
5. Keep each slice to one PR and close it before starting another.

## Helpful tmux commands

```bash
# list sessions on this socket
tmux -S "${TMUX_SOCKET:-${CLAWDBOT_TMUX_SOCKET_DIR:-${TMPDIR:-/tmp}/clawdbot-tmux-sockets}/evelyn.sock}" ls

# capture recent output from builder pane
tmux -S "${TMUX_SOCKET:-${CLAWDBOT_TMUX_SOCKET_DIR:-${TMPDIR:-/tmp}/clawdbot-tmux-sockets}/evelyn.sock}" capture-pane -p -J -t "${TMUX_SESSION:-evelyn-orchestrator}":0.1 -S -120

# kill the orchestration session when done
tmux -S "${TMUX_SOCKET:-${CLAWDBOT_TMUX_SOCKET_DIR:-${TMPDIR:-/tmp}/clawdbot-tmux-sockets}/evelyn.sock}" kill-session -t "${TMUX_SESSION:-evelyn-orchestrator}"
```
