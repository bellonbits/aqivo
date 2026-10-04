#!/bin/sh
set -e

echo "=== Starting Aqivo Backend Service ==="

if [ -n "$DATABASE_URL" ]; then
  echo "Waiting for database connection..."
  python - << 'EOF'
import time
import os
import sys
import psycopg

db_url = os.environ.get("DATABASE_URL", "")
conn_url = db_url.replace("postgresql+psycopg://", "postgresql://")

max_retries = 30
for i in range(1, max_retries + 1):
    try:
        conn = psycopg.connect(conn_url)
        conn.close()
        print(f"Database connection established successfully on attempt {i}.")
        sys.exit(0)
    except Exception as e:
        print(f"Waiting for database ({i}/{max_retries}): {e}")
        time.sleep(1)

print("Error: Could not connect to database after 30 seconds.")
sys.exit(1)
EOF
fi

echo "Running Alembic migrations..."
alembic upgrade head
echo "Database migrations complete."

exec "$@"
