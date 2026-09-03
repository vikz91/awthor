#!/usr/bin/env bash

set -euo pipefail

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Release aborted: commit or stash all working-tree changes first." >&2
  exit 1
fi

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "main" ]]; then
  echo "Release aborted: switch to the main branch first." >&2
  exit 1
fi

git fetch origin main --tags

if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
  echo "Release aborted: main must be fully pushed and up to date with origin/main." >&2
  exit 1
fi

package_version="$(bun -p "require('./package.json').version")"
if [[ ! "$package_version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "Release aborted: package.json version must be a stable semantic version." >&2
  exit 1
fi

tag="v${package_version}"
if git rev-parse --quiet --verify "refs/tags/${tag}" >/dev/null; then
  echo "Release aborted: tag ${tag} already exists." >&2
  exit 1
fi

git tag --annotate "$tag" --message "Awthor ${tag}"
git push origin "$tag"

echo "Pushed ${tag}. The GitHub release workflow will now verify and publish it."
