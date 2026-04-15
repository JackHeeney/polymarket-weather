---
name: weather-probability-modelling
description: Use when converting raw weather forecasts into calibrated event probabilities for market outcomes, including threshold temperatures, precipitation events, lead-time uncertainty, and source-specific resolution logic.
---
# Weather Probability Modelling

## Purpose
Convert weather data into tradeable event probabilities aligned with each market's exact resolution criteria.

## Use this skill when
- Building forecast ingestion pipelines
- Translating forecasts into YES/NO probabilities
- Handling threshold weather events
- Calibrating forecast uncertainty
- Combining multiple forecast providers

## Core responsibilities
1. Read market rules and identify the exact measurable event.
2. Match the market to the correct observation source and location logic.
3. Transform forecast inputs into event probabilities, not single-point guesses.
4. Apply calibration using historical forecast error.
5. Output confidence intervals and probability distributions.

## Required modelling principles
- Use the same geography and source logic as the market resolution rules.
- Model uncertainty explicitly.
- Account for lead time decay.
- Track provider disagreement.
- Treat ensemble spread as signal.
- Distinguish between forecast probability and observation probability.

## Inputs
- Forecast provider values
- Ensemble or confidence data where available
- Historical forecast error by lead time and location
- Market rule thresholds
- Observation station/source mapping

## Outputs
Produce a normalised record with:
- `market_id`
- `forecast_time`
- `provider`
- `event_probability`
- `confidence_score`
- `distribution_summary`
- `resolution_mapping`
- `notes`

## Rules
- Never output only a point estimate where uncertainty matters.
- If a market threshold is near the forecast median, confidence should usually fall.
- Reduce confidence when provider disagreement is high.
- Reject markets when source mapping cannot be trusted.

## Suggested modelling flow
1. Parse threshold event from rule text.
2. Map station/location and measurement definition.
3. Pull forecast data.
4. Estimate probability distribution.
5. Convert to event probability.
6. Calibrate against historical bias/error.
7. Persist model output and diagnostics.

## Definition of done
- The service can produce a probability for a specific weather market.
- The result is reproducible and auditable.
- Confidence and source mapping are stored with the prediction.
