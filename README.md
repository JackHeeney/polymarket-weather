# Polymarket Weather Agent Skill Pack

This starter pack gives you:
- 9 Cursor skills in `.cursor/skills/`
- 2 optional subagents in `.cursor/agents/`
- a minimal `.cursor/hooks.json`
- a starter `.cursor/mcp.json`

## Included skills
- market-ingestion
- weather-probability-modelling
- edge-decision-engine
- paper-trading
- live-trading-guardrails
- portfolio-pnl-tracker
- market-reconciliation
- dashboard-reporting
- backtesting-research

## Recommended build order
1. market-ingestion
2. weather-probability-modelling
3. edge-decision-engine
4. paper-trading
5. portfolio-pnl-tracker
6. dashboard-reporting
7. market-reconciliation
8. backtesting-research
9. live-trading-guardrails

## Notes
These skills are written for Cursor's skill format and are intended as a practical starting point, not a finished production trading system.

## Build scaffold implemented

This repository now includes a TypeScript-first weather market agent scaffold with:
- Cursor rules in `.cursor/rules/`
- Prisma schema in `packages/db/prisma/schema.prisma`
- Mock ingestion adapters in `services/weather` and `services/markets`
- Matching, edge, and risk services in `services/matching`, `services/edge`, and `services/risk`
- Pipeline orchestration in `core/engine/src/runPipeline.ts`
- Minimal API and dashboard in `apps/api` and `apps/web-dashboard`
- Unit and integration tests in `tests/`

## Local commands

- `npm install`
- `npm run db:generate`
- `npm run db:push`
- `npm run db:seed`
- `npm test`
- `npm run api:start`
- `npm run dashboard:start`
