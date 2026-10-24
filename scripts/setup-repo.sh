#!/usr/bin/env bash
# One-time GitHub settings. Must be run by a repo admin (Jonathan).
# Usage: ./scripts/setup-repo.sh <teammate-github-username> [more usernames...]
set -euo pipefail
repo=jonathanphung/hacktx2026

for user in "$@"; do
  echo "Inviting $user (write access)"
  gh api -X PUT "repos/$repo/collaborators/$user" -f permission=push >/dev/null
done

echo "Squash-only merges, auto-merge on, delete branches after merge"
gh api -X PATCH "repos/$repo" \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -F allow_auto_merge=true -F delete_branch_on_merge=true >/dev/null

echo "Protect main: PRs only, CI must pass, no force-push"
# strict=false: PRs don't have to be re-rebased after every other merge (that would
# serialize four agents into a queue). CI on main still catches any bad combination.
gh api -X PUT "repos/$repo/branches/main/protection" --input - >/dev/null <<'JSON'
{
  "required_status_checks": { "strict": false, "contexts": ["check"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON

echo "Lane labels"
for l in web api ai glue contract; do
  gh label create "$l" --repo "$repo" --force >/dev/null
done

echo "Done. Teammates must accept their invite at https://github.com/$repo/invitations"
