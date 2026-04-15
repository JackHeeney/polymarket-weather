---
name: dashboard-reporting
description: Use when building the operator dashboard for trade candidates, open positions, bankroll curve, performance analytics, and manual approval workflows for the weather-market trading agent.
---
# Dashboard Reporting

## Purpose
Surface the right information for safe, fast decisions.

## Use this skill when
- Building the Next.js dashboard
- Designing operator workflows
- Exposing candidate trades and P/L
- Adding approval controls

## Dashboard sections
- Candidate trades
- Open positions
- Recent fills
- Market detail view
- Bankroll and P/L curve
- Performance by market type
- Risk monitor
- Settlement exceptions
- Strategy diagnostics

## UX rules
- Manual approval actions must be obvious and deliberate.
- Show why a trade was suggested, not just the score.
- Surface uncertainty and risk, not only upside.
- Highlight blocked markets and reasons.
- Make paper mode and live mode visually distinct.

## Must-show fields for candidate trades
- question
- market price
- model probability
- tradable edge
- confidence
- spread
- liquidity
- recommended side
- recommended size
- reason summary
- approval status

## Definition of done
- An operator can review opportunities and understand the rationale quickly.
- Risk and uncertainty are visible.
- Paper and live workflows are separated cleanly.
