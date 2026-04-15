---
name: live-trading-guardrails
description: Use when enabling manual or constrained live trading, adding authenticated Polymarket CLOB execution, enforcing approval gates, and applying bankroll and loss controls.
---
# Live Trading Guardrails

## Purpose
Add strong operational controls around any live trading capability.

## Use this skill when
- Integrating authenticated CLOB execution
- Building manual approval flows
- Adding hard risk controls
- Preventing unsafe automation

## Core policy
Live trading is opt-in, constrained, and disabled by default.

## Mandatory controls
- Manual approval required unless `LIVE_AUTOTRADE_ENABLED=true`
- Daily realised loss cap
- Max position per market
- Max exposure per city, region, and day
- Minimum liquidity threshold
- Maximum spread threshold
- No new entries near resolution unless explicitly allowed by strategy
- Kill switch for all live trading

## Required checks before order placement
1. Signal is still valid.
2. Market book has enough depth.
3. Order size respects bankroll rules.
4. Daily loss cap is not breached.
5. The market is not in a blocked state.
6. Credentials are present and valid.
7. Order intent is logged before transmission.

## Logging requirements
Always log:
- order intent
- pre-trade checks
- final submitted parameters
- exchange response
- post-trade position state

## Safety rules
- Never increase size after losses automatically.
- Never place orders on markets with ambiguous rules.
- Never hide or suppress failed order events.
- Prefer reduce-only behaviour during degraded conditions.

## Definition of done
- Live execution cannot happen accidentally.
- Manual approval can be toggled in UI/config.
- Every live trade is fully auditable.
