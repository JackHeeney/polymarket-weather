---
name: market-reconciliation
description: Use when reconciling market outcomes against official resolution sources, closing positions, validating settlement, and updating final P/L after market resolution.
---
# Market Reconciliation

## Purpose
Close the loop between predictions, trades, and actual outcomes.

## Use this skill when
- Settling resolved markets
- Validating resolution sources
- Updating final position states
- Backfilling missing settlements

## Responsibilities
1. Detect when a market has resolved.
2. Fetch or validate the official result source used by the market rules.
3. Compare stored assumptions against the final outcome.
4. Close related positions.
5. Update realised P/L and settlement status.
6. Flag mismatches and exceptions for review.

## Rules
- Use the exact official source logic stated in the market rules whenever possible.
- Store evidence of the final outcome.
- Keep both exchange resolution and locally validated resolution records where applicable.
- Never silently overwrite disputed outcomes.

## Exception handling
Flag manual review when:
- official source is unavailable
- stored source mapping was wrong
- market resolves unexpectedly
- fill history and position state disagree

## Definition of done
- Resolved markets are reflected in final P/L.
- Settlement records are auditable.
- Exceptions are visible rather than buried.
