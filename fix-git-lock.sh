#!/usr/bin/env bash
# Run this once to clear the stale git lock and push Phase 32 + Phase 33 changes
set -e
cd "$(dirname "$0")"
rm -f .git/index.lock
git add -A
git commit -m "fix(B124-B126,I20-I23): storage cleanup, toast dismiss, EditGoalModal stale form, offline count, month income/expense split"
git push
rm -f fix-git-lock.sh
echo "Done."
