#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"

echo "[smoke] ambiguous query"
curl -sS "$BASE_URL/api/entity/apple" | jq '{ambiguous, question, options: (.options | length)}'

echo "[smoke] topic query after disambiguation"
curl -sS "$BASE_URL/api/entity/Apple%20Inc.?topic=carbon%20neutral&mode=balanced" | jq '{entity: .entity.name, claims: (.claims | length), sources: .retrieval.sources_considered, message}'

echo "[smoke] strict mode"
curl -sS "$BASE_URL/api/entity/Tesla%2C%20Inc.?mode=strict" | jq '{entity: .entity.name, claims: (.claims | length), mode: .retrieval.mode, message}'
