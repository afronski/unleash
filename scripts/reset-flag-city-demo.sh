#!/usr/bin/env bash
# Resets the Flag City Playground demo: removes the demo project, its feature
# flags (incl. dependencies), the frontend API tokens, and the demo context
# fields — so the instance is empty and ready for demoing the demo.
#
# Usage: ./scripts/reset-flag-city-demo.sh
# Override the postgres container name with POSTGRES_CONTAINER=<name>.
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-postgres}"

# -i attaches stdin so the SQL actually reaches psql; ON_ERROR_STOP +
# --single-transaction make any failure loud and atomic.
docker exec -i "$CONTAINER" psql -U unleash_user -d unleash \
    -v ON_ERROR_STOP=1 --single-transaction <<'SQL'
DELETE FROM dependent_features
    WHERE child IN (SELECT name FROM features WHERE project = 'flag-city');
DELETE FROM features WHERE project = 'flag-city';
DELETE FROM api_tokens WHERE secret LIKE 'flag-city:%';
DELETE FROM projects WHERE id = 'flag-city';
DELETE FROM context_fields WHERE name IN ('carId', 'carType', 'carColor');
SQL

REMAINING=$(docker exec "$CONTAINER" psql -U unleash_user -d unleash -t -A -c \
    "SELECT (SELECT count(*) FROM projects WHERE id = 'flag-city')
          + (SELECT count(*) FROM features WHERE project = 'flag-city')
          + (SELECT count(*) FROM api_tokens WHERE secret LIKE 'flag-city:%')
          + (SELECT count(*) FROM context_fields WHERE name IN ('carId', 'carType', 'carColor'));")

if [ "$REMAINING" != "0" ]; then
    echo "ERROR: $REMAINING Flag City rows still present — reset incomplete." >&2
    exit 1
fi

echo "Flag City removed (project, flags, tokens, context fields)."
echo "The instance is ready for a fresh demo run."
