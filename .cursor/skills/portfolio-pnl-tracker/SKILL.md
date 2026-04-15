---
name: portfolio-pnl-tracker
description: Use when tracking open positions, realised and unrealised P/L, bankroll, drawdown, win rate, exposure, and strategy-level performance over time.
---
# Portfolio and PnL Tracker

## Purpose
Maintain a clear source of truth for performance and risk.

## Use this skill when
- Building portfolio views
- Calculating P/L
- Tracking exposure and bankroll
- Generating strategy reports

## Responsibilities
- Store entries, exits, fills, and current positions.
- Calculate realised and unrealised P/L.
- Track bankroll changes over time.
- Compute drawdown, win rate, EV proxies, and performance by segment.
- Support both paper and live modes.

## Required dimensions
Report performance by:
- market type
- location
- lead time
- provider mix
- strategy version
- manual vs automated execution

## Core calculations
- realised P/L
- unrealised P/L
- cumulative P/L
- max drawdown
- exposure by category
- bankroll utilisation
- average stake
- average edge at entry
- average slippage

## Rules
- Preserve immutable fill history.
- Position state should be derived from fills, not hand-edited balance guesses.
- Revalue open positions using conservative mark logic.
- Distinguish cash balance, reserved capital, and open exposure.

## Definition of done
- Open positions and historical performance are queryable.
- P/L can be reconciled to fills and resolutions.
- Users can see where the strategy performs well or badly.
