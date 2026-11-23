#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="height-safety-pdf-spike-linux:node24.18.0-playwright1.62.1"
PROFILE="${1:---all}"

docker build --file "$ROOT/tools/pdf-spike/Dockerfile.linux" --tag "$IMAGE" "$ROOT"

run_profile() {
  local name="$1"
  local cpus="$2"
  local memory="$3"
  local concurrency="$4"
  local output="$ROOT/.tools/pdf-spike-linux/$name"

  mkdir -p "$output"
  docker run --rm \
    --cpus "$cpus" \
    --memory "$memory" \
    --pids-limit 512 \
    --shm-size 256m \
    --env "PDF_SPIKE_CONCURRENCY=$concurrency" \
    --env "PDF_SPIKE_CANDIDATE_PROFILE=$name" \
    --volume "$output:/workspace/.tools/pdf-spike" \
    "$IMAGE"
}

case "$PROFILE" in
  --concurrency-one)
    run_profile 2vcpu-2g-concurrency-1 2 2g 1
    ;;
  --concurrency-two)
    run_profile 4vcpu-4g-concurrency-2 4 4g 2
    ;;
  --all)
    run_profile 2vcpu-2g-concurrency-1 2 2g 1
    run_profile 4vcpu-4g-concurrency-2 4 4g 2
    ;;
  *)
    echo "Usage: tools/pdf-spike-linux.sh [--all|--concurrency-one|--concurrency-two]"
    exit 1
    ;;
esac
