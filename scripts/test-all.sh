#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")/.."

projects=(src/ui src/invoicing)
failed=()

for project in "${projects[@]}"; do
  echo "==> $project"
  if ! npm test --prefix "$project"; then
    failed+=("$project")
  fi
  echo
done

if [ "${#failed[@]}" -gt 0 ]; then
  echo "Failed: ${failed[*]}"
  exit 1
fi

echo "All projects passed."
