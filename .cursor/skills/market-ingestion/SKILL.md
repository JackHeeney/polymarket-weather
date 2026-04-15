---
name: market-ingestion
description: Use when working on Polymarket market discovery, Gamma API ingestion, public CLOB reads, market metadata storage, rules parsing, token IDs, close times, liquidity, spreads, and order book snapshots for weather markets.
---
# Market Ingestion

## Purpose
Build and maintain the weather market ingestion layer for the Polymarket Weather Agent.

## Use this skill when
- Adding or updating market scanners
- Parsing active weather and climate market metadata
- Storing market rules, token IDs, close times, and liquidity snapshots
- Building websocket or polling ingestion for order books and prices
- Normalising market data into Postgres tables

## Core responsibilities
1. Fetch active weather-relevant markets from Polymarket discovery endpoints.
2. Read public market data and public CLOB order book data.
3. Persist canonical market metadata.
4. Snapshot prices, spreads, depth, and liquidity on a schedule.
5. Parse and store resolution rules verbatim.
6. Flag malformed, ambiguous, or low-quality markets.

## Output requirements
Always produce or update:
- `markets`
- `market_snapshots`
- `resolution_sources`
- `market_tags`
- `strategy_runs`

## Rules
- Store raw rule text exactly as returned by the source before creating any parsed version.
- Keep both raw and derived fields.
- Capture `market_id`, `slug`, `question`, `description`, `token_ids`, `close_time`, `end_time`, `event_slug`, `outcomes`, `min_tick`, and any fee-relevant fields.
- Record bid, ask, midpoint, last price, best available size, and top-of-book depth.
- Never assume a market resolves on a generic city forecast if the rules specify a station or official source.
- Mark markets as `do_not_trade` when rules are unclear, resolution source is weak, or liquidity is below threshold.

## Implementation guidance
- Prefer idempotent ingestion jobs.
- Use upserts for metadata and append-only snapshots for time-series records.
- Separate discovery from snapshot polling.
- Maintain `ingested_at` and `source_updated_at` timestamps.
- Cache hot reads where practical.
- Treat public reads and authenticated trading as separate concerns.

## Suggested file layout
- `apps/api/src/services/markets/scanMarkets.ts`
- `apps/api/src/services/markets/snapshotOrderBooks.ts`
- `apps/api/src/services/markets/parseRules.ts`
- `packages/db/prisma/schema/market.prisma`

## Definition of done
- A scheduled scanner can pull active weather markets.
- Market metadata is persisted without duplicates.
- Snapshots are timestamped and queryable.
- Ambiguous markets are flagged automatically.
