---
name: paper-trading
description: Use when simulating trades from generated signals, recording hypothetical entries and exits, tracking P/L, and validating strategy quality before any live execution is allowed.
---
# Paper Trading

## Purpose
Run the agent safely in simulation mode first.

## Use this skill when
- Building the MVP
- Validating signals without real capital
- Comparing strategies before live deployment
- Running strategy experiments

## Responsibilities
1. Convert approved signals into simulated orders.
2. Use realistic fills based on best available bid/ask, slippage, and spread.
3. Track hypothetical positions over time.
4. Mark exits according to strategy rules.
5. Reconcile final outcomes after market resolution.

## Simulation rules
- Entries should not use midpoint fantasy fills when the book is thin.
- Model slippage conservatively.
- Apply fee assumptions where relevant.
- Keep a full audit trail of why the simulated trade was entered or skipped.
- Support manual override scenarios for comparison.

## Required metrics
- Realised P/L
- Unrealised P/L
- Hit rate
- Average edge at entry
- Average hold time
- Max drawdown
- Profit factor
- Performance by market type
- Performance by lead time bucket

## Data outputs
- `orders`
- `fills`
- `positions`
- `pnl_daily`
- `strategy_runs`

## Definition of done
- A user can review hypothetical trades and cumulative performance.
- The simulation is auditable and reproducible.
- No live order code is required for this mode.
