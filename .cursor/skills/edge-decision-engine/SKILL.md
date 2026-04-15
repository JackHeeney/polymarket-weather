---
name: edge-decision-engine
description: Use when comparing model probability versus market-implied probability, adjusting for spread, slippage, fees, liquidity, and risk rules, then producing buy, pass, or reduce signals.
---
# Edge Decision Engine

## Purpose
Turn model outputs and market prices into controlled trading decisions.

## Use this skill when
- Building signal generation
- Calculating expected edge
- Filtering markets by liquidity and spread
- Generating stake suggestions
- Enforcing no-trade conditions

## Core formula
- Market implied probability ~= YES price
- Model edge = model probability - market implied probability
- Tradable edge = model edge - fees - slippage - spread penalty - confidence penalty

## Decision rules
Only issue a trade signal when all conditions pass:
- Tradable edge exceeds threshold
- Spread is below threshold
- Liquidity exceeds minimum
- Market is not flagged `do_not_trade`
- Position size fits bankroll and exposure rules
- Time to resolution is acceptable for the strategy

## Required outputs
For every evaluated market, store:
- `signal_id`
- `market_id`
- `model_probability`
- `market_probability`
- `raw_edge`
- `tradable_edge`
- `confidence_score`
- `liquidity_score`
- `spread_score`
- `recommended_side`
- `recommended_size`
- `decision_reason`
- `status` (`buy_yes`, `buy_no`, `pass`, `reduce`, `close`)

## Guardrails
- Do not trade wide, thin books simply because the raw edge looks large.
- Penalise signals close to resolution when depth is weak.
- Penalise signals when observation rules are ambiguous.
- Penalise signals when the model has poor historical performance for that market type.
- Prefer no trade over marginal trade.

## Sizing guidance
- Size by bankroll percentage and capped expected loss.
- Enforce max exposure per market, day, city, and region.
- Never use martingale or loss-chasing logic.

## Definition of done
- A market evaluation produces a deterministic structured signal.
- The signal includes reasons, not only a score.
- Risk constraints are applied before any execution logic.
