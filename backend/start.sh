#!/bin/sh
set -e

echo "▶ Running database migrations..."
node dist/db/migrate.js

echo "▶ Running database seed..."
node dist/db/seed.js

echo "▶ Starting server..."
exec node dist/index.js
