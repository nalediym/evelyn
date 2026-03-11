# Hyper Execution Brief: Evelyn Working MVP

Use this as the single handoff doc for Hyper to execute the approved plan.

## Objective

Deliver a working Evelyn MVP with:
- end-to-end creator flow (Dashboard -> Create Game -> Create World -> Publish + Share),
- OpenAPI parity guardrails against `evelyn-specs/openapi.yaml`,
- CI + docs loop that enforces verification receipts.

## Acceptance Criteria

1. Local MVP smoke path works and tests pass without manual patching.
2. Contract parity check fails on drift and passes when aligned.
3. CI + PR process enforces command evidence and proof.

## Operating Rules

- One active implementation slice at a time.
- Build work sequential; discovery/validation work parallel.
- One write lease per branch; no multi-agent writes to same branch.
- No merge without receipts (commands + outputs + evidence).

## Agent Topology

- `orchestrator`: queue, lease ownership, event polling, merge gate.
- `builder`: only production writer for current slice.
- `spec-guardian`: parity matrix + drift policy + contract checks.
- `validator`: test/spec/parity execution and receipts.
- `scribe` (optional): status snapshots and release notes.
- `watchdog` (optional): stale lease and stalled-slice recovery.

## Event Bus Contract (Git-native)

Use Git + PR metadata + handoff artifacts as shared state.

### Commit trailers

Add trailers to key commits:

```
Slice: MVP-S1
Agent: builder
Event: build.completed
Handoff: ops/handoffs/MVP-S1/builder-<timestamp>.md
```

### PR labels

- `state:assigned`
- `state:blocked`
- `state:ready`
- `needs:spec-sync`
- `risk:high`

### Handoff artifacts

For each transition:

- `ops/handoffs/<slice-id>/<agent>-<timestamp>.md` (human summary)
- `ops/handoffs/<slice-id>/<agent>-<timestamp>.yaml` (machine-readable state)

## Polling/Orchestration Loop

Cadence: every 60-120 seconds.

1. Poll git log + PR checks + labels + latest handoff files.
2. Reconcile slice state and lease ownership.
3. Assign next action to exactly one writer.
4. Run/collect validator checks.
5. Promote state (`blocked` -> `ready`) only with receipts.
6. Merge or requeue with explicit reason.

## Branch and Worktree Strategy

Branch naming:

- `feat/<slice-id>/<short-topic>`
- `fix/<slice-id>/<short-topic>`
- `docs/<slice-id>/<short-topic>`

If concurrent write lanes are needed across repos, use `git worktree` isolation per writing agent.

## Execution Plan

### Phase 0: Git integrity

- Confirm root and relevant repos support `git log`, branch refs, and status.
- If broken, repair/re-clone before orchestration.

Exit: git event stream is reliable.

### Phase 1: Control contract

- Finalize trailers, labels, and handoff schema.
- Dry-run one synthetic lifecycle end-to-end.

Exit: lifecycle replayable from git + PR + handoff files.

### Phase 2: Slice pilot (MVP-S2 recommended)

- Run full protocol on contract parity slice first.
- Capture drift matrix and parity test receipt.

Exit: one PR merged with complete receipts.

### Phase 3: Worktree + lease hardening

- Enforce write lease rules and worktree isolation.

Exit: no branch stomping in concurrent operations.

### Phase 4: tmux control loop

- Use `ops/tmux_orchestrate.sh` and pane roles from `ops/TMUX_ORCHESTRATION.md`.
- Keep production edits in builder lane only.

Exit: one full slice delivered entirely through orchestrated loop.

### Phase 5: Failure drills + metrics

- Simulate: stale PR, CI failure, merge conflict, spec drift.
- Exercise recovery flow and log incident receipts.

Exit: each recovery path documented and reproducible.

### Phase 6: Complete milestone slices

- MVP-S1: stability smoke path.
- MVP-S2: contract parity guardrails.
- MVP-S3: CI + contributor loop.

Exit: all acceptance criteria satisfied.

## Slice Packets

### MVP-S1: Stability baseline

Deliverables:
- lock smoke path for creator journey,
- add/tighten integration tests,
- document one local verification sequence.

Verification:

```bash
cd evelyn-python && make test
```

### MVP-S2: Contract parity guardrails

Deliverables:
- parity scope between Python endpoints and OpenAPI,
- parity test/script that fails on drift,
- drift resolution policy in docs.

Verification:

```bash
cd evelyn-specs && npx -y @apidevtools/swagger-cli validate openapi.yaml
cd evelyn-specs && npx -y @asyncapi/cli validate asyncapi.yaml
cd evelyn-python && pytest -q tests/test_openapi_parity.py
```

### MVP-S3: CI + docs contributor loop

Deliverables:
- CI runs tests + spec validation + parity checks,
- PR checklist requires commands/evidence,
- contributor docs include exact copy/paste verification commands.

Verification:
- CI green on test PR,
- checklist populated with receipts.

## Recovery Protocol

- Heartbeat timeout (15 min without event) -> watchdog revokes lease.
- Requeue from last successful event + latest handoff artifact.
- For conflicts: create `recovery/<slice-id>/<incident-id>` and continue.
- Prefer forward-fix; if reverting, emit `Event: rollback.applied` trailer.

## Success Metrics (weekly)

- cycle time (start -> merged),
- PR size (lines/files),
- reopen rate,
- blocker age,
- milestone burn-up.

Target: lower cycle time with stable or lower reopen rate.
