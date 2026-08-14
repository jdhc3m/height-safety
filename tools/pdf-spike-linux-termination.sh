#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="height-safety-pdf-spike-linux:node24.18.0-playwright1.62.1"
OUTPUT_PARENT="$ROOT/.tools/pdf-spike-linux/container-termination"
CONTAINER="height-safety-pdf-interruption-$$"
FIXTURE="/workspace/fixtures/reports/representative-photo-heavy-report.json"
VARIANT="linux-container-interruption"

mkdir -p "$OUTPUT_PARENT"
OUTPUT="$(mktemp -d "$OUTPUT_PARENT/run-XXXXXX")"

cleanup() {
  docker stop --time 1 "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --detach --rm \
  --name "$CONTAINER" \
  --cpus 2 \
  --memory 2g \
  --pids-limit 512 \
  --shm-size 256m \
  --volume "$OUTPUT:/workspace/.tools/pdf-spike" \
  "$IMAGE" \
  node tools/pdf-spike/render.mjs \
    "--fixture=$FIXTURE" \
    --output-dir=/workspace/.tools/pdf-spike \
    "--variant=$VARIANT" \
    --post-render-delay-ms=30000 >/dev/null

temporary_pdf_observed=false
for _ in $(seq 1 600); do
  if find "$OUTPUT" -maxdepth 1 -name '*.tmp.pdf' -print -quit | grep -q .; then
    temporary_pdf_observed=true
    break
  fi
  sleep 0.1
done

if [[ "$temporary_pdf_observed" != true ]]; then
  echo "Linux container interruption never produced a temporary PDF"
  exit 1
fi

docker stop --time 5 "$CONTAINER" >/dev/null

for _ in $(seq 1 100); do
  if [[ -z "$(docker ps --all --quiet --filter "name=^/${CONTAINER}$")" ]]; then
    break
  fi
  sleep 0.1
done

if [[ -n "$(docker ps --all --quiet --filter "name=^/${CONTAINER}$")" ]]; then
  echo "Stopped renderer container still exists"
  exit 1
fi

retry_result="$(docker run --rm \
  --cpus 2 \
  --memory 2g \
  --pids-limit 512 \
  --shm-size 256m \
  --volume "$OUTPUT:/workspace/.tools/pdf-spike" \
  "$IMAGE" \
  node tools/pdf-spike/render.mjs \
    "--fixture=$FIXTURE" \
    --output-dir=/workspace/.tools/pdf-spike \
    "--variant=$VARIANT")"

if [[ "$(node -e 'const value=JSON.parse(process.argv[1]); process.stdout.write(String(value.reused))' "$retry_result")" != false ]]; then
  echo "Fresh container did not regenerate the interrupted report"
  exit 1
fi

if find "$OUTPUT" -maxdepth 1 \( -name '*.tmp.pdf' -o -name '*.tmp' \) -print -quit | grep -q .; then
  echo "Temporary artifacts remain after Linux container recovery"
  exit 1
fi

trap - EXIT
echo "linux container termination recovery passed"
