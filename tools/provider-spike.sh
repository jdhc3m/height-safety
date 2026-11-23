#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$ROOT/infra/spikes/cloud-run/candidate.json"
STATE_DIR="$ROOT/.tools/provider-spike"
CONTEXT="$STATE_DIR/context.json"
RUNS_DIR="$STATE_DIR/runs"
EVIDENCE="$ROOT/docs/roadmap/STAGE_2D_04_MANAGED_EVIDENCE.json"
AUTHORIZATION_PHRASE="I_AUTHORIZE_2D04_SPIKE"
NON_TTY_PHRASE="I_AUTHORIZE_2D04_NON_TTY"

ACTION="${1:-}"
if [[ -z "$ACTION" ]]; then
  echo "Usage: tools/provider-spike.sh --check|--plan|--deploy|--exercise|--terminate-during-render|--collect-cost|--destroy|--verify-destroyed|--verify-evidence [options]" >&2
  exit 2
fi
shift

CANDIDATE=""
REGION=""
REPETITIONS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --candidate)
      CANDIDATE="${2:-}"
      shift 2
      ;;
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    --repetitions)
      REPETITIONS="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
done

die() {
  echo "provider-spike: $*" >&2
  exit 1
}

validate_candidate() {
  [[ "$CANDIDATE" == "cloud-run" ]] || die "candidate must be cloud-run"
  [[ "$REGION" == "australia-southeast1" ]] || die "region must be australia-southeast1"
  [[ "$CANDIDATE" == "$(jq -r .candidate "$CONFIG")" ]] || die "candidate differs from checked-in contract"
  [[ "$REGION" == "$(jq -r .region "$CONFIG")" ]] || die "region differs from checked-in contract"
}

new_prefix() {
  local suffix
  suffix="$(openssl rand -hex 4 2>/dev/null || date -u +%s | shasum -a 256 | cut -c1-8)"
  echo "hs2d04-$suffix"
}

prepare_context() {
  mkdir -p "$STATE_DIR" "$RUNS_DIR"
  local prefix project run_id old_run old_prefix destroyed_file
  prefix="${HEIGHT_SAFETY_SPIKE_PREFIX:-}"
  project="${HEIGHT_SAFETY_SPIKE_PROJECT:-UNRESOLVED}"
  if [[ -f "$CONTEXT" ]]; then
    old_run="$(jq -r '.runId // ""' "$CONTEXT")"
    old_prefix="$(jq -r '.prefix // ""' "$CONTEXT")"
    destroyed_file="$RUNS_DIR/$old_run/destroyed.json"
    if [[ -n "$old_run" && ! ( -f "$destroyed_file" && "$(jq -r .passed "$destroyed_file")" == "true" ) ]]; then
      [[ -z "$prefix" || "$prefix" == "$old_prefix" ]] || die "an undestroyed run already owns the active context"
      if [[ "$old_run" =~ ^hs2d04-[a-z0-9]{8}-[0-9]{14}-[a-f0-9]{6}$ ]]; then
        [[ -f "$RUNS_DIR/$old_run/registry.json" ]] || die "active run registry is missing"
        return
      fi
      [[ "$(jq '.resources | length' "$RUNS_DIR/$old_run/registry.json" 2>/dev/null || echo 1)" == "0" ]] || die "legacy active run cannot be replaced until its resources are manually reconciled"
    fi
  fi
  [[ -n "$prefix" ]] || prefix="$(new_prefix)"
  [[ "$prefix" =~ ^hs2d04-[a-z0-9]{8}$ ]] || die "prefix must match hs2d04-xxxxxxxx"
  run_id="$prefix-$(date -u +%Y%m%d%H%M%S)-$(openssl rand -hex 3)"
  jq -n \
    --arg candidate "cloud-run" \
    --arg region "australia-southeast1" \
    --arg prefix "$prefix" \
    --arg project "$project" \
    --arg runId "$run_id" \
    '{schemaVersion:"1.0.0",candidate:$candidate,region:$region,prefix:$prefix,project:$project,runId:$runId}' > "$CONTEXT"
  mkdir -p "$RUNS_DIR/$run_id/results"
  jq -n --arg runId "$run_id" --arg prefix "$prefix" \
    '{schemaVersion:"1.0.0",runId:$runId,prefix:$prefix,resources:[]}' > "$RUNS_DIR/$run_id/registry.json"
}

load_context() {
  [[ -f "$CONTEXT" ]] || die "run --plan first"
  PREFIX="$(jq -r .prefix "$CONTEXT")"
  [[ "$PREFIX" =~ ^hs2d04-[a-z0-9]{8}$ ]] || die "stored prefix is invalid"
  RUN_ID="$(jq -r .runId "$CONTEXT")"
  [[ "$RUN_ID" =~ ^hs2d04-[a-z0-9]{8}-[0-9]{14}-[a-f0-9]{6}$ ]] || die "stored run identifier is invalid; run --plan again"
  RUN_DIR="$RUNS_DIR/$RUN_ID"
  RESULTS_DIR="$RUN_DIR/results"
  TASK_PROOFS_DIR="$RUN_DIR/task-proofs"
  REGISTRY="$RUN_DIR/registry.json"
  DEPLOYMENT_STATE="$RUN_DIR/deployment.json"
  COST_STATE="$RUN_DIR/cost.json"
  DESTROYED_STATE="$RUN_DIR/destroyed.json"
  mkdir -p "$RESULTS_DIR" "$TASK_PROOFS_DIR"
  [[ -f "$REGISTRY" ]] || die "immutable run registry is missing"
}

record_resource_state() {
  local type="$1" name="$2" state="$3"
  jq --arg project "$PROJECT" --arg runId "$RUN_ID" --arg prefix "$PREFIX" --arg type "$type" --arg name "$name" --arg state "$state" \
    '.project=$project | .runId=$runId | .prefix=$prefix |
      if any(.resources[]; .type==$type and .name==$name)
      then .resources |= map(if .type==$type and .name==$name then .state=$state else . end)
      else .resources += [{type:$type,name:$name,state:$state}] end' \
    "$REGISTRY" > "$REGISTRY.tmp"
  mv "$REGISTRY.tmp" "$REGISTRY"
}

register_intent() {
  record_resource_state "$1" "$2" intended
}

register_resource() {
  record_resource_state "$1" "$2" created
}

registry_owns() {
  local type="$1" name="$2"
  [[ "$(jq -r --arg project "$PROJECT" --arg runId "$RUN_ID" --arg type "$type" --arg name "$name" \
    '.project==$project and .runId==$runId and any(.resources[]; .type==$type and .name==$name and (.state=="intended" or .state=="created"))' "$REGISTRY")" == "true" ]]
}

labels_owned() {
  local json="$1"
  jq -e --arg prefix "$PREFIX" '
    (.metadata.labels // .labels // {}) as $labels |
    $labels.ticket == "2d-04" and
    $labels.purpose == "provider-spike" and
    $labels.owner == "height-safety" and
    $labels["spike-prefix"] == $prefix
  ' <<<"$json" >/dev/null
}

require_registry_ownership() {
  registry_owns "$1" "$2" || die "refusing unregistered existing or deletion target: $1 $2"
}

resolve_resources() {
  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
  [[ "$PROJECT_NUMBER" =~ ^[0-9]{6,}$ ]] || die "could not resolve project number"
  SERVICE="$PREFIX-renderer"
  QUEUE="$(jq -r '.queue // empty' "$CONTEXT")"
  if [[ -z "$QUEUE" || "$QUEUE" == "null" ]]; then
    QUEUE="$PREFIX-q$(openssl rand -hex 4)"
    jq --arg queue "$QUEUE" '.queue=$queue' "$CONTEXT" > "$CONTEXT.tmp"
    mv "$CONTEXT.tmp" "$CONTEXT"
  fi
  REPOSITORY="$PREFIX-repo"
  WORKER_ACCOUNT="$PREFIX-worker@$PROJECT.iam.gserviceaccount.com"
  TASK_ACCOUNT="$PREFIX-tasks@$PROJECT.iam.gserviceaccount.com"
  BUCKET="$PREFIX-$PROJECT_NUMBER-private"
  IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPOSITORY/renderer:node24-playwright1-62-1"
}

show_resolved_context() {
  echo "Resolved cloud mutation target:" >&2
  echo "  account: $ACCOUNT" >&2
  echo "  project: $PROJECT" >&2
  echo "  region: $REGION" >&2
  echo "  prefix: $PREFIX" >&2
  echo "  immutable run: $RUN_ID" >&2
  echo "  service: $SERVICE" >&2
  echo "  queue: $QUEUE" >&2
  echo "  bucket: $BUCKET" >&2
}

require_cloud_authorization() {
  validate_candidate
  load_context
  [[ "${CI:-}" != "true" ]] || die "cloud commands are forbidden in CI"
  [[ "${HEIGHT_SAFETY_ALLOW_CLOUD_MUTATION:-}" == "$AUTHORIZATION_PHRASE" ]] || \
    die "set HEIGHT_SAFETY_ALLOW_CLOUD_MUTATION=$AUTHORIZATION_PHRASE for this attended run"
  command -v gcloud >/dev/null || die "gcloud is required for cloud commands"
  PROJECT="${HEIGHT_SAFETY_SPIKE_PROJECT:-}"
  [[ -n "$PROJECT" ]] || die "HEIGHT_SAFETY_SPIKE_PROJECT must name a dedicated non-production project"
  local stored_project
  stored_project="$(jq -r .project "$CONTEXT")"
  [[ "$stored_project" == "UNRESOLVED" || "$stored_project" == "$PROJECT" ]] || die "project differs from the immutable run context"
  [[ ! "$PROJECT" =~ (^|[-_])(prod|production|live)([-_]|$) ]] || die "production-looking projects are refused"
  local project_json project_text
  project_json="$(gcloud projects describe "$PROJECT" --format=json)"
  [[ "$(jq -r .lifecycleState <<<"$project_json")" == "ACTIVE" ]] || die "project is not active"
  project_text="$(jq -r '[.projectId,.name,(.labels // {} | to_entries[]? | .key,.value)] | join(" ")' <<<"$project_json")"
  [[ ! "$project_text" =~ (^|[[:space:]_-])(prod|production|live)([[:space:]_-]|$) ]] || die "project metadata appears production-related"
  ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
  [[ -n "$ACCOUNT" ]] || die "no active gcloud account"
  resolve_resources
  show_resolved_context
  local expected="$PROJECT/$REGION/$PREFIX"
  if [[ "${HEIGHT_SAFETY_ALLOW_NON_TTY:-}" == "$NON_TTY_PHRASE" ]]; then
    [[ "${HEIGHT_SAFETY_SPIKE_CONFIRM:-}" == "$expected" ]] || \
      die "set HEIGHT_SAFETY_SPIKE_CONFIRM=$expected for owner-authorized non-TTY mutation"
    echo "provider-spike: owner-authorized non-TTY mutation for $expected" >&2
    return 0
  fi
  [[ -t 0 && -t 1 ]] || die "cloud commands require an attended interactive terminal"
  local confirmation attempt
  echo "Paste this exact line into Terminal, then press Return: $expected" >&2
  for attempt in 1 2 3 4 5; do
    read -r -p "Type $expected to authorize this command: " confirmation
    confirmation="${confirmation//$'\r'/}"
    confirmation="${confirmation#"${confirmation%%[![:space:]]*}"}"
    confirmation="${confirmation%"${confirmation##*[![:space:]]}"}"
    if [[ "$confirmation" == "$expected" ]]; then
      return 0
    fi
    echo "provider-spike: authorization text did not match (attempt $attempt/5). Paste in this Terminal window, not Cursor chat." >&2
  done
  die "authorization text did not match"
}

resource_exists() {
  local output
  if output="$("$@" 2>&1)"; then
    return 0
  fi
  if [[ "$output" =~ (^|[[:space:][:punct:]])(NOT_FOUND|404)([[:space:][:punct:]]|$) ]] || \
     [[ "$output" =~ [Cc]ould[[:space:]]not[[:space:]]be[[:space:]]found ]] || \
     [[ "$output" =~ [Cc]annot[[:space:]]find[[:space:]]service ]] || \
     [[ "$output" =~ [Dd]oes[[:space:]]not[[:space:]]exist ]]; then
    return 1
  fi
  echo "provider-spike: lookup output: ${output%%$'\n'*}" >&2
  die "resource lookup failed without an authoritative not-found response"
}

service_account_exists() {
  local email="$1"
  local listed
  listed="$(gcloud iam service-accounts list --project "$PROJECT" --format='value(email)')" || \
    die "could not list service accounts"
  if grep -Fxq "$email" <<<"$listed"; then
    return 0
  fi
  return 1
}

service_account_matches() {
  local account="$1" display_name="$2"
  gcloud iam service-accounts describe "$account" --project "$PROJECT" --format=json | \
    jq -e --arg email "$account" --arg display "$display_name" '.email==$email and .displayName==$display' >/dev/null
}

queue_matches() {
  gcloud tasks queues describe "$QUEUE" --project "$PROJECT" --location "$REGION" --format=json | \
    jq -e '
      (.rateLimits.maxConcurrentDispatches|tonumber)==1 and
      (.retryConfig.maxAttempts|tonumber)==5 and
      ((.retryConfig.maxRetryDuration|rtrimstr("s"))|tonumber)==1800 and
      ((.retryConfig.minBackoff|rtrimstr("s"))|tonumber)==5 and
      ((.retryConfig.maxBackoff|rtrimstr("s"))|tonumber)==60
    ' >/dev/null
}

wait_for_object() {
  local object_uri="$1"
  for _ in $(seq 1 300); do
    if gcloud storage ls "$object_uri" --project "$PROJECT" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  die "timed out waiting for sanitised evidence object"
}

revision_cold_token() {
  local revision="$1"
  gcloud run revisions describe "$revision" --project "$PROJECT" --region "$REGION" --format=json | \
    jq -r '
      (.spec.containers[0].env // .spec.template.spec.containers[0].env // [])[]
      | select(.name == "SPIKE_PLATFORM_COLD_TOKEN")
      | .value
    '
}

update_cold_token_revision() {
  local job_id="$1"
  local revision token
  gcloud run services update "$SERVICE" --project "$PROJECT" --region "$REGION" \
    --update-env-vars "SPIKE_PLATFORM_COLD_TOKEN=$job_id" --quiet
  revision="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.latestReadyRevisionName)')"
  [[ -n "$revision" && "$revision" != "null" ]] || die "could not resolve the cold-token revision"
  token="$(revision_cold_token "$revision")"
  [[ "$token" == "$job_id" ]] || die "cold-token revision env does not match the exercise job"
  echo "provider-spike: cold-token revision $revision is ready before enqueue" >&2
}

enqueue_job() {
  local job_id="$1"
  local mode="$2"
  local uri task_name body
  uri="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
  [[ "$uri" == https://* ]] || die "could not resolve private renderer URL"
  task_name="$PREFIX-${job_id//[^a-z0-9-]/-}"
  body="$(jq -nc --arg jobId "$job_id" --arg mode "$mode" --argjson enqueuedAt "$(node -p 'Date.now()')" '{jobId:$jobId,mode:$mode,enqueuedAt:$enqueuedAt}')"
  gcloud tasks queues pause "$QUEUE" --project "$PROJECT" --location "$REGION"
  gcloud tasks create-http-task "$task_name" \
    --project "$PROJECT" \
    --location "$REGION" \
    --queue "$QUEUE" \
    --url "$uri/render" \
    --method POST \
    --header 'Content-Type: application/json' \
    --body-content "$body" \
    --oidc-service-account-email "$TASK_ACCOUNT" \
    --oidc-token-audience "$uri"
  local task_json
  task_json="$(gcloud tasks describe "$task_name" --project "$PROJECT" --location "$REGION" --queue "$QUEUE" --format=json)"
  if ! jq -e --arg account "$TASK_ACCOUNT" --arg audience "$uri" '
    .httpRequest.httpMethod == "POST" and
    .httpRequest.url == ($audience + "/render") and
    .httpRequest.oidcToken.serviceAccountEmail == $account and
    .httpRequest.oidcToken.audience == $audience
  ' <<<"$task_json" >/dev/null; then
    die "queued task OIDC configuration differs from the private delivery contract; queue remains paused"
  fi
  jq -n --arg runId "$RUN_ID" --arg jobId "$job_id" \
    '{schemaVersion:"1.0.0",runId:$runId,jobId:$jobId,methodPost:true,privateServiceUrl:true,oidcServiceAccountVerified:true,oidcAudienceVerified:true}' \
    > "$TASK_PROOFS_DIR/$job_id.json"
  gcloud tasks queues resume "$QUEUE" --project "$PROJECT" --location "$REGION"
}

wait_for_queue_json() {
  local output
  local attempt
  for attempt in $(seq 1 30); do
    if output="$(gcloud tasks queues describe "$QUEUE" --project "$PROJECT" --location "$REGION" --format=json 2>&1)"; then
      printf '%s' "$output"
      return 0
    fi
    if [[ "$output" =~ NOT_FOUND ]] || [[ "$output" =~ [Dd]oes[[:space:]]not[[:space:]]exist ]]; then
      sleep 2
      continue
    fi
    echo "provider-spike: lookup output: ${output%%$'\n'*}" >&2
    die "queue lookup failed without an authoritative not-found response"
  done
  die "Cloud Tasks queue did not become describable after create"
}

ensure_spike_queue() {
  if resource_exists gcloud tasks queues describe "$QUEUE" --project "$PROJECT" --location "$REGION"; then
    require_registry_ownership cloud-tasks-queue "$QUEUE"
    queue_matches || die "refusing mismatched Cloud Tasks queue"
    return 0
  fi
  register_intent cloud-tasks-queue "$QUEUE"
  gcloud tasks queues create "$QUEUE" --project "$PROJECT" --location "$REGION" \
    --max-concurrent-dispatches 1 --max-attempts 5 --max-retry-duration 1800s \
    --min-backoff 5s --max-backoff 60s
  register_resource cloud-tasks-queue "$QUEUE"
}

capture_deployment_state() {
  local run_json run_iam_json revision_json queue_json bucket_json bucket_iam_json repository_json expected_digest actual_digest latest_revision
  run_json="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format=json)"
  run_iam_json="$(gcloud run services get-iam-policy "$SERVICE" --project "$PROJECT" --region "$REGION" --format=json)"
  latest_revision="$(jq -r '.status.latestReadyRevisionName // .latestReadyRevision' <<<"$run_json")"
  [[ -n "$latest_revision" && "$latest_revision" != "null" ]] || die "could not resolve the deployed revision"
  revision_json="$(gcloud run revisions describe "$latest_revision" --project "$PROJECT" --region "$REGION" --format=json)"
  queue_json="$(wait_for_queue_json)"
  bucket_json="$(gcloud storage buckets describe "gs://$BUCKET" --project "$PROJECT" --format=json)"
  bucket_iam_json="$(gcloud storage buckets get-iam-policy "gs://$BUCKET" --project "$PROJECT" --format=json)"
  repository_json="$(gcloud artifacts repositories describe "$REPOSITORY" --project "$PROJECT" --location "$REGION" --format=json)"
  expected_digest="$(jq -r .expectedImageDigest "$CONTEXT")"
  actual_digest="$(jq -r '.status.imageDigest // .status.containerStatuses[0].imageDigest // empty' <<<"$revision_json")"
  actual_digest="${actual_digest##*@}"
  [[ "$expected_digest" =~ ^sha256:[a-f0-9]{64}$ && "$actual_digest" == "$expected_digest" ]] || die "deployed revision digest differs from the locally built image"
  labels_owned "$run_json" || die "deployed Cloud Run service ownership labels do not match"
  labels_owned "$bucket_json" || die "deployed bucket ownership labels do not match"
  labels_owned "$repository_json" || die "deployed repository ownership labels do not match"
  jq -e --arg account "$WORKER_ACCOUNT" '
    ((.spec.template.spec.containerConcurrency // .template.maxInstanceRequestConcurrency) | tonumber) == 1 and
    ((.spec.template.spec.containers[0].resources.limits.cpu // .template.containers[0].resources.limits.cpu) | tostring) == "2" and
    ((.spec.template.spec.containers[0].resources.limits.memory // .template.containers[0].resources.limits.memory) | tostring) == "2Gi" and
    ((.metadata.annotations["run.googleapis.com/minScale"] // .scaling.minInstanceCount // 0) | tonumber) == 0 and
    ((.metadata.annotations["run.googleapis.com/maxScale"] // .scaling.maxInstanceCount) | tonumber) == 1 and
    ((.spec.template.spec.timeoutSeconds // (.template.timeout | rtrimstr("s"))) | tonumber) == 300 and
    (.spec.template.spec.serviceAccountName // .template.serviceAccount) == $account and
    ((.spec.template.metadata.annotations["run.googleapis.com/startup-cpu-boost"] // .template.containers[0].resources.startupCpuBoost // false) | tostring | ascii_downcase) == "false"
  ' <<<"$run_json" >/dev/null || die "deployed renderer resources or identity differ from the 2D-04 contract"
  jq -e --arg member "serviceAccount:$TASK_ACCOUNT" '
    all(.bindings[]?.members[]?; . != "allUsers" and . != "allAuthenticatedUsers") and
    any(.bindings[]; .role == "roles/run.invoker" and any(.members[]?; . == $member))
  ' <<<"$run_iam_json" >/dev/null || die "Cloud Run IAM is public or lacks the exact task invoker"
  jq -e --arg region "$REGION" '
    (.name | contains("/locations/"+$region+"/")) and
    (.rateLimits.maxConcurrentDispatches | tonumber) == 1 and
    (.retryConfig.maxAttempts | tonumber) == 5 and
    ((.retryConfig.maxRetryDuration | rtrimstr("s")) | tonumber) == 1800 and
    ((.retryConfig.minBackoff | rtrimstr("s")) | tonumber) == 5 and
    ((.retryConfig.maxBackoff | rtrimstr("s")) | tonumber) == 60
  ' <<<"$queue_json" >/dev/null || die "deployed queue settings differ from the 2D-04 contract"
  jq -e --arg region "$REGION" '
    (.location | ascii_downcase) == ($region | ascii_downcase) and
    ((.iamConfiguration.uniformBucketLevelAccess.enabled == true) or (.uniform_bucket_level_access == true)) and
    (((.iamConfiguration.publicAccessPrevention // .public_access_prevention) | ascii_downcase) == "enforced") and
    any((.lifecycle.rule // .lifecycle_config.rule)[]; ((.condition.age | tonumber) <= 7))
  ' <<<"$bucket_json" >/dev/null || die "deployed bucket region or privacy settings differ from the 2D-04 contract"
  jq -e --arg worker "serviceAccount:$WORKER_ACCOUNT" '
    all(.bindings[]?.members[]?; . != "allUsers" and . != "allAuthenticatedUsers") and
    all(.bindings[]?.members[]?; (startswith("serviceAccount:") | not) or . == $worker) and
    any(.bindings[]; .role == "roles/storage.objectCreator" and any(.members[]?; . == $worker)) and
    any(.bindings[]; .role == "roles/storage.objectViewer" and any(.members[]?; . == $worker))
  ' <<<"$bucket_iam_json" >/dev/null || die "bucket IAM is public, has an unexpected service account, or lacks the worker bindings"
  jq -e --arg region "$REGION" '(.name | contains("/locations/"+$region+"/")) and .format == "DOCKER"' <<<"$repository_json" >/dev/null || die "artifact repository location or format differs from the contract"

  jq -n \
    --arg runId "$RUN_ID" \
    --arg region "$REGION" \
    --arg imageDigest "$actual_digest" \
    --argjson run "$run_json" \
    --argjson runIam "$run_iam_json" \
    --argjson queue "$queue_json" \
    --argjson bucket "$bucket_json" \
    --argjson repository "$repository_json" \
    '{
      schemaVersion:"1.0.0",runId:$runId,capturedAt:(now|todate),region:$region,
      ownership:{runLabelsVerified:true,bucketLabelsVerified:true,repositoryLabelsVerified:true,unlabelledResourcesRegistryVerified:true},
      identities:{workerServiceAccountVerified:true,taskInvokerBindingVerified:true,bucketWorkerBindingsVerified:true,unexpectedDirectBucketServiceAccountsAbsent:true,publicMembersAbsent:true},
      renderer:{
        imageDigest:$imageDigest,
        cpu:(($run.spec.template.spec.containers[0].resources.limits.cpu // $run.template.containers[0].resources.limits.cpu)|tostring),
        memory:(($run.spec.template.spec.containers[0].resources.limits.memory // $run.template.containers[0].resources.limits.memory)|tostring),
        concurrency:(($run.spec.template.spec.containerConcurrency // $run.template.maxInstanceRequestConcurrency)|tonumber),
        timeoutSeconds:(($run.spec.template.spec.timeoutSeconds // ($run.template.timeout|rtrimstr("s")))|tonumber),
        minimumInstances:(($run.metadata.annotations["run.googleapis.com/minScale"] // $run.scaling.minInstanceCount // 0)|tonumber),
        maximumInstances:(($run.metadata.annotations["run.googleapis.com/maxScale"] // $run.scaling.maxInstanceCount)|tonumber),
        private:(all($runIam.bindings[]?.members[]?; . != "allUsers" and . != "allAuthenticatedUsers")),
        cpuStartupBoost:((($run.spec.template.metadata.annotations["run.googleapis.com/startup-cpu-boost"] // $run.template.containers[0].resources.startupCpuBoost // false)|tostring|ascii_downcase)=="true")
      },
      queue:{
        location:($queue.name|split("/")[3]),
        maximumConcurrentDispatches:($queue.rateLimits.maxConcurrentDispatches|tonumber),
        maximumAttempts:($queue.retryConfig.maxAttempts|tonumber),
        maximumRetryDurationSeconds:(($queue.retryConfig.maxRetryDuration|rtrimstr("s"))|tonumber),
        minimumBackoffSeconds:(($queue.retryConfig.minBackoff|rtrimstr("s"))|tonumber),
        maximumBackoffSeconds:(($queue.retryConfig.maxBackoff|rtrimstr("s"))|tonumber)
      },
      storage:{
        location:($bucket.location|ascii_downcase),
        uniformBucketLevelAccess:($bucket.iamConfiguration.uniformBucketLevelAccess.enabled // $bucket.uniform_bucket_level_access),
        publicAccessPrevention:(($bucket.iamConfiguration.publicAccessPrevention // $bucket.public_access_prevention)|ascii_downcase),
        lifecycleDays:([($bucket.lifecycle.rule // $bucket.lifecycle_config.rule)[].condition.age|tonumber]|min)
      },
      artifactRepository:{location:$region,format:$repository.format,labelsVerified:true},
      build:{method:"local-docker-build-and-direct-artifact-registry-push",implicitCloudBuildStorage:false}
    }' > "$DEPLOYMENT_STATE"
}

deploy_candidate() {
  require_cloud_authorization
  gcloud services enable \
    run.googleapis.com \
    cloudtasks.googleapis.com \
    storage.googleapis.com \
    artifactregistry.googleapis.com \
    iamcredentials.googleapis.com \
    --project "$PROJECT"

  if service_account_exists "$WORKER_ACCOUNT"; then
    require_registry_ownership service-account "$WORKER_ACCOUNT"
    service_account_matches "$WORKER_ACCOUNT" "$PREFIX renderer spike" || die "refusing mismatched worker service account"
  else
    register_intent service-account "$WORKER_ACCOUNT"
    gcloud iam service-accounts create "$PREFIX-worker" --project "$PROJECT" --display-name "$PREFIX renderer spike"
    register_resource service-account "$WORKER_ACCOUNT"
  fi
  if service_account_exists "$TASK_ACCOUNT"; then
    require_registry_ownership service-account "$TASK_ACCOUNT"
    service_account_matches "$TASK_ACCOUNT" "$PREFIX queue invoker spike" || die "refusing mismatched task service account"
  else
    register_intent service-account "$TASK_ACCOUNT"
    gcloud iam service-accounts create "$PREFIX-tasks" --project "$PROJECT" --display-name "$PREFIX queue invoker spike"
    register_resource service-account "$TASK_ACCOUNT"
  fi
  if resource_exists gcloud artifacts repositories describe "$REPOSITORY" --project "$PROJECT" --location "$REGION"; then
    labels_owned "$(gcloud artifacts repositories describe "$REPOSITORY" --project "$PROJECT" --location "$REGION" --format=json)" || die "refusing unowned artifact repository"
  else
    register_intent artifact-repository "$REPOSITORY"
    gcloud artifacts repositories create "$REPOSITORY" --project "$PROJECT" --location "$REGION" \
      --repository-format docker --description "$PREFIX disposable renderer images" \
      --labels "ticket=2d-04,purpose=provider-spike,owner=height-safety,spike-prefix=$PREFIX"
  fi
  register_resource artifact-repository "$REPOSITORY"
  if resource_exists gcloud storage buckets describe "gs://$BUCKET" --project "$PROJECT"; then
    labels_owned "$(gcloud storage buckets describe "gs://$BUCKET" --project "$PROJECT" --format=json)" || die "refusing unowned storage bucket"
  else
    register_intent storage-bucket "$BUCKET"
    gcloud storage buckets create "gs://$BUCKET" --project "$PROJECT" --location "$REGION" \
      --uniform-bucket-level-access --public-access-prevention
  fi
  gcloud storage buckets update "gs://$BUCKET" --project "$PROJECT" \
    --lifecycle-file "$ROOT/infra/spikes/cloud-run/lifecycle.json" \
    --update-labels "ticket=2d-04,purpose=provider-spike,owner=height-safety,spike-prefix=$PREFIX"
  gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --project "$PROJECT" \
    --member "serviceAccount:$WORKER_ACCOUNT" --role roles/storage.objectCreator
  gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --project "$PROJECT" \
    --member "serviceAccount:$WORKER_ACCOUNT" --role roles/storage.objectViewer
  register_resource storage-bucket "$BUCKET"

  command -v docker >/dev/null || die "docker is required for the bounded local build"
  gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet
  docker build --provenance=false --sbom=false --file "$ROOT/infra/spikes/cloud-run/Dockerfile" --tag "$IMAGE" "$ROOT"
  docker push "$IMAGE"
  local pushed_digest
  pushed_digest="$(docker image inspect "$IMAGE" --format '{{index .RepoDigests 0}}' | sed -E 's/^.*@(sha256:[a-f0-9]{64})$/\1/')"
  [[ "$pushed_digest" =~ ^sha256:[a-f0-9]{64}$ ]] || die "could not capture the pushed image digest"
  jq --arg digest "$pushed_digest" '.expectedImageDigest=$digest' "$CONTEXT" > "$CONTEXT.tmp"
  mv "$CONTEXT.tmp" "$CONTEXT"
  if resource_exists gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION"; then
    labels_owned "$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format=json)" || die "refusing unowned Cloud Run service"
  else
    register_intent cloud-run-service "$SERVICE"
  fi
  gcloud run deploy "$SERVICE" --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
    --execution-environment gen2 --no-allow-unauthenticated \
    --service-account "$WORKER_ACCOUNT" --concurrency 1 --cpu 2 --memory 2Gi \
    --timeout 300 --min 0 --max 1 --no-cpu-boost \
    --set-env-vars "SPIKE_BUCKET=$BUCKET,SPIKE_REGION=$REGION,SPIKE_RUN_ID=$RUN_ID,SPIKE_PLATFORM_COLD_TOKEN=deployment-not-an-exercise,PDF_SPIKE_CONCURRENCY=1" \
    --labels "ticket=2d-04,purpose=provider-spike,owner=height-safety,spike-prefix=$PREFIX"
  register_resource cloud-run-service "$SERVICE"
  gcloud run services add-iam-policy-binding "$SERVICE" --project "$PROJECT" --region "$REGION" \
    --member "serviceAccount:$TASK_ACCOUNT" --role roles/run.invoker
  gcloud iam service-accounts add-iam-policy-binding "$TASK_ACCOUNT" --project "$PROJECT" \
    --member "serviceAccount:service-$PROJECT_NUMBER@gcp-sa-cloudtasks.iam.gserviceaccount.com" \
    --role roles/iam.serviceAccountTokenCreator
  ensure_spike_queue

  jq --arg project "$PROJECT" --arg projectNumber "$PROJECT_NUMBER" --arg bucket "$BUCKET" --arg runId "$RUN_ID" \
    '.project=$project | .projectNumber=$projectNumber | .bucket=$bucket | .runId=$runId' "$CONTEXT" > "$CONTEXT.tmp"
  mv "$CONTEXT.tmp" "$CONTEXT"
  capture_deployment_state
  echo "Candidate deployed. It remains unapproved and must be exercised and destroyed."
}

exercise_candidate() {
  require_cloud_authorization
  [[ "$REPETITIONS" == "3" ]] || die "--repetitions must be exactly 3"
  for repetition in 1 2 3; do
    local_id="exercise-$repetition-$(date -u +%s)"
    update_cold_token_revision "$local_id"
    enqueue_job "$local_id" benchmark
    wait_for_object "gs://$BUCKET/evidence/$RUN_ID/$local_id.json"
    gcloud storage cp "gs://$BUCKET/evidence/$RUN_ID/$local_id.json" "$RESULTS_DIR/$local_id.json" --project "$PROJECT"
  done
  capture_deployment_state
  node "$ROOT/infra/spikes/cloud-run/evidence.mjs" --aggregate
}

terminate_candidate() {
  require_cloud_authorization
  local local_id
  local_id="termination-recovery-$(date -u +%s)"
  enqueue_job "$local_id" terminate-once
  wait_for_object "gs://$BUCKET/control/$RUN_ID/$local_id-termination-observed.json"
  wait_for_object "gs://$BUCKET/evidence/$RUN_ID/$local_id.json"
  gcloud storage cp "gs://$BUCKET/evidence/$RUN_ID/$local_id.json" "$RESULTS_DIR/$local_id.json" --project "$PROJECT"
  node "$ROOT/infra/spikes/cloud-run/evidence.mjs" --aggregate
}

collect_cost() {
  require_cloud_authorization
  node "$ROOT/infra/spikes/cloud-run/evidence.mjs" --cost "$REGION"
  node "$ROOT/infra/spikes/cloud-run/evidence.mjs" --aggregate
}

destroy_candidate() {
  require_cloud_authorization
  if resource_exists gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION"; then
    labels_owned "$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format=json)" || die "refusing to delete unowned Cloud Run service"
    gcloud run services delete "$SERVICE" --project "$PROJECT" --region "$REGION" --quiet
  fi
  if resource_exists gcloud tasks queues describe "$QUEUE" --project "$PROJECT" --location "$REGION"; then
    require_registry_ownership cloud-tasks-queue "$QUEUE"
    queue_matches || die "refusing to delete mismatched Cloud Tasks queue"
    gcloud tasks queues delete "$QUEUE" --project "$PROJECT" --location "$REGION" --quiet
  fi
  if resource_exists gcloud storage buckets describe "gs://$BUCKET" --project "$PROJECT"; then
    labels_owned "$(gcloud storage buckets describe "gs://$BUCKET" --project "$PROJECT" --format=json)" || die "refusing to delete unowned storage bucket"
    gcloud storage rm "gs://$BUCKET/**" --project "$PROJECT" --recursive || true
    gcloud storage buckets delete "gs://$BUCKET" --project "$PROJECT" --quiet
  fi
  if resource_exists gcloud artifacts repositories describe "$REPOSITORY" --project "$PROJECT" --location "$REGION"; then
    labels_owned "$(gcloud artifacts repositories describe "$REPOSITORY" --project "$PROJECT" --location "$REGION" --format=json)" || die "refusing to delete unowned artifact repository"
    gcloud artifacts repositories delete "$REPOSITORY" --project "$PROJECT" --location "$REGION" --quiet
  fi
  if service_account_exists "$WORKER_ACCOUNT"; then
    require_registry_ownership service-account "$WORKER_ACCOUNT"
    service_account_matches "$WORKER_ACCOUNT" "$PREFIX renderer spike" || die "refusing to delete mismatched worker service account"
    gcloud iam service-accounts delete "$WORKER_ACCOUNT" --project "$PROJECT" --quiet
  fi
  if service_account_exists "$TASK_ACCOUNT"; then
    require_registry_ownership service-account "$TASK_ACCOUNT"
    service_account_matches "$TASK_ACCOUNT" "$PREFIX queue invoker spike" || die "refusing to delete mismatched task service account"
    gcloud iam service-accounts delete "$TASK_ACCOUNT" --project "$PROJECT" --quiet
  fi
  echo "Destroy requested for exact prefix $PREFIX; run --verify-destroyed next."
}

verify_destroyed() {
  require_cloud_authorization
  local remaining=()
  local labelled_run labelled_repositories labelled_buckets prefixed_queues prefixed_accounts
  resource_exists gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" && remaining+=("cloud-run-service")
  resource_exists gcloud tasks queues describe "$QUEUE" --project "$PROJECT" --location "$REGION" && remaining+=("cloud-tasks-queue")
  resource_exists gcloud storage buckets describe "gs://$BUCKET" --project "$PROJECT" && remaining+=("storage-bucket")
  resource_exists gcloud artifacts repositories describe "$REPOSITORY" --project "$PROJECT" --location "$REGION" && remaining+=("artifact-repository")
  service_account_exists "$WORKER_ACCOUNT" && remaining+=("worker-service-account")
  service_account_exists "$TASK_ACCOUNT" && remaining+=("task-service-account")
  labelled_run="$(gcloud run services list --project "$PROJECT" --region "$REGION" --format=json | \
    jq -r --arg prefix "$PREFIX" '.[] | select(((.metadata.labels // {})["spike-prefix"] == $prefix) or ((.metadata.name // "") | startswith($prefix))) | .metadata.name')"
  labelled_repositories="$(gcloud artifacts repositories list --project "$PROJECT" --location "$REGION" --format=json | \
    jq -r --arg prefix "$PREFIX" '.[] | select(((.labels // {})["spike-prefix"] == $prefix) or ((.name // "") | split("/")[-1] | startswith($prefix))) | .name')"
  labelled_buckets="$(gcloud storage buckets list --project "$PROJECT" --format=json | \
    jq -r --arg prefix "$PREFIX" '.[] | select((((.labels // .metadata.labels // {})["spike-prefix"]) == $prefix) or (((.name // .metadata.name // "") | sub("^gs://"; "")) | startswith($prefix))) | (.name // .metadata.name)')"
  prefixed_queues="$(gcloud tasks queues list --project "$PROJECT" --location "$REGION" --format=json | \
    jq -r --arg prefix "$PREFIX" '.[] | (.name // "") | split("/")[-1] | select(startswith($prefix))')"
  prefixed_accounts="$(gcloud iam service-accounts list --project "$PROJECT" --format=json | \
    jq -r --arg prefix "$PREFIX" '.[] | (.email // "") | select(startswith($prefix))')"
  # gcloud 580 and IAM v1 ListServiceAccounts reject deleted-account inventory.
  # Soft-deleted accounts stay restorable for about 30 days and are recorded as
  # an evidence limitation rather than live labelled resources.
  [[ -z "$labelled_run" ]] || remaining+=("labelled-cloud-run-resource")
  [[ -z "$labelled_repositories" ]] || remaining+=("labelled-artifact-resource")
  [[ -z "$labelled_buckets" ]] || remaining+=("labelled-storage-resource")
  [[ -z "$prefixed_queues" ]] || remaining+=("prefixed-cloud-tasks-resource")
  [[ -z "$prefixed_accounts" ]] || remaining+=("prefixed-service-account")
  jq -n --arg prefix "$PREFIX" --arg runId "$RUN_ID" --argjson remaining "$(printf '%s\n' "${remaining[@]:-}" | jq -Rsc 'split("\n") | map(select(length > 0))')" \
    '{schemaVersion:"1.0.0",ticket:"2D-04",runId:$runId,prefix:$prefix,verifiedAt:(now|todate),remaining:$remaining,passed:($remaining|length==0)}' \
    > "$DESTROYED_STATE"
  [[ ${#remaining[@]} -eq 0 ]] || die "resources remain: ${remaining[*]}"
  node "$ROOT/infra/spikes/cloud-run/evidence.mjs" --aggregate
  echo "No exact-prefix candidate resource remains."
}

case "$ACTION" in
  --check)
    node "$ROOT/infra/spikes/cloud-run/check.mjs"
    bash -n "$ROOT/tools/provider-spike.sh"
    echo "provider-spike local checks passed"
    ;;
  --plan)
    validate_candidate
    prepare_context
    load_context
    jq -n --arg prefix "$PREFIX" --arg runId "$RUN_ID" --arg project "$(jq -r .project "$CONTEXT")" \
      --slurpfile config "$CONFIG" \
      '{status:"local-plan-only",project:$project,prefix:$prefix,runId:$runId,candidate:$config[0].candidate,region:$config[0].region,resources:{service:($prefix+"-renderer"),queue:"prefix-owned unique name assigned at authorised deploy",repository:($prefix+"-repo"),bucket:"resolved only after an authorised project check"},mutationAuthorised:false,managedProviderApproved:false}'
    ;;
  --deploy)
    deploy_candidate
    ;;
  --exercise)
    exercise_candidate
    ;;
  --terminate-during-render)
    terminate_candidate
    ;;
  --collect-cost)
    collect_cost
    ;;
  --destroy)
    destroy_candidate
    ;;
  --verify-destroyed)
    verify_destroyed
    ;;
  --verify-evidence)
    node "$ROOT/infra/spikes/cloud-run/evidence.mjs" --verify "$EVIDENCE"
    ;;
  *)
    die "unknown action $ACTION"
    ;;
esac
