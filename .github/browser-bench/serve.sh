#!/usr/bin/env bash
# Starts or stops the servers of the PR (the repository root) and of master (base/) for the
# browser benchmark. Ports and start order are random, so neither side always gets the same
# setup. The ports are written to .bench-pr-port and .bench-master-port.
set -euo pipefail

ports="3000 3001"

# Next renames its server process to next-server, so the servers are found by the ports they
# listen on rather than by command line
listeners() { lsof -t -i "tcp:$1" -sTCP:LISTEN || true; }

stop() {
  for port in $ports; do
    pids=$(listeners "$port")
    if [ -n "$pids" ]; then kill $pids; fi
  done
  for port in $ports; do
    for _ in $(seq 1 20); do
      if [ -z "$(listeners "$port")" ]; then break; fi
      sleep 1
    done
    if [ -n "$(listeners "$port")" ]; then
      echo "Port $port is still in use after stopping its server" >&2
      exit 1
    fi
  done
}

if [ "$1" = stop ]; then
  stop
  exit 0
fi

for port in $ports; do
  if [ -n "$(listeners "$port")" ]; then
    echo "Port $port is already in use, the benchmark would measure another server" >&2
    exit 1
  fi
done

order="3000 3001"
if [ $((RANDOM % 2)) = 1 ]; then order="3001 3000"; fi
read -r pr_port master_port <<< "$order"
echo "$pr_port" > .bench-pr-port
echo "$master_port" > .bench-master-port

sides="pr master"
if [ $((RANDOM % 2)) = 1 ]; then sides="master pr"; fi
for side in $sides; do
  if [ "$side" = pr ]; then
    (cd packages/app && PORT=$pr_port nohup pnpm start > /tmp/bench-pr-server.log 2>&1 &)
  else
    (cd base/packages/app && PORT=$master_port nohup pnpm start > /tmp/bench-master-server.log 2>&1 &)
  fi
done

# Wait for the servers, then warm them up so no measurement hits a cold server
for port in $ports; do
  curl --silent --fail --output /dev/null --retry 30 --retry-connrefused --retry-delay 2 "http://localhost:$port/bridge"
  curl --silent --fail --output /dev/null "http://localhost:$port/bridge"
done
