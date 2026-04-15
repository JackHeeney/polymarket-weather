---
name: backtesting-research
description: Use when evaluating historical strategy performance, comparing thresholds, testing market-type filters, validating calibration, and identifying where the weather-market agent actually has edge.
---
# Backtesting Research

## Purpose
Find out what works before scaling.

## Use this skill when
- Testing strategies on historical data
- Comparing providers or calibration methods
- Measuring edge by market type
- Tuning thresholds and filters

## Research questions
- Which weather market types produce reliable edge?
- How does performance vary by lead time?
- What confidence thresholds improve Sharpe-style outcomes?
- Where do spreads and slippage erase theoretical edge?
- Which locations are harder to model accurately?

## Required outputs
- Backtest configuration
- Data coverage notes
- Performance summary
- Market-type breakdown
- Calibration diagnostics
- Recommendation for threshold changes

## Rules
- Avoid lookahead bias.
- Use realistic entry assumptions.
- Separate in-sample and out-of-sample periods.
- Report missing-data limitations explicitly.

## Definition of done
- The strategy can be compared across versions.
- Users can see where edge is real and where it disappears.
