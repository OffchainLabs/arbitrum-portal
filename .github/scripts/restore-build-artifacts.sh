#!/usr/bin/env bash
# Waits for this run's build artifact, then restores it into packages/app (the artifact's root
# is packages/app, the common folder of the uploaded paths). Test jobs start alongside the build
# rather than after it, so their setup overlaps it. Needs GH_TOKEN with `actions: read`.
set -euo pipefail

# Fail fast if the build failed rather than waiting out the timeout
deadline=$((SECONDS + 900))
while true; do
  count=$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID/artifacts?name=build-artifacts" --jq '.total_count')
  [ "$count" != 0 ] && break
  failed=$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID/attempts/$GITHUB_RUN_ATTEMPT/jobs?per_page=100" \
    --jq '[.jobs[] | select((.name | endswith("Build")) and .status == "completed" and .conclusion != "success")] | length')
  [ "$failed" != 0 ] && { echo "The build job failed"; exit 1; }
  [ $SECONDS -ge $deadline ] && { echo "Timed out waiting for the build artifact"; exit 1; }
  sleep 3
done

# The 53 MB download takes ~3s but about 1 in 60 stalls for minutes, so time it out and retry.
# Just after the upload, the API lists the artifact a few seconds before it can be downloaded.
deadline=$((SECONDS + 120))
attempt=0
while [ $SECONDS -lt $deadline ]; do
  attempt=$((attempt + 1))
  dir="$RUNNER_TEMP/build-artifacts-$attempt"
  if timeout 45 gh run download "$GITHUB_RUN_ID" -R "$GITHUB_REPOSITORY" -n build-artifacts -D "$dir"; then
    cp -a "$dir/." ./packages/app/
    exit 0
  fi
  echo "Download attempt $attempt failed or timed out"
  sleep 3
done
exit 1
