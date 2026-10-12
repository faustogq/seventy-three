#!/bin/bash
# Publishes offline-app/ (built by build/assemble.py) to GitHub Pages: https://faustogq.github.io/seventy-three/
# Phones that installed the web app get the new version the next time they open it with internet.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f offline-app/index.html ] || { echo "Run python3 build/assemble.py first"; exit 1; }
REPO=$(git remote get-url origin)
TMP=$(mktemp -d)
cp -R offline-app/. "$TMP"
rm -f "$TMP/LEEME.txt"
touch "$TMP/.nojekyll"            # without it GitHub Pages hides data/fathers/_counts.json and _authors.json
cd "$TMP"
git init -q -b gh-pages
git config user.name "$(git -C "$OLDPWD" config user.name)"
git config user.email "$(git -C "$OLDPWD" config user.email)"
git add -A
git commit -q -m "Web app build $(date +%Y-%m-%d)"
git push -q -f "$REPO" gh-pages
cd - >/dev/null && rm -rf "$TMP"
echo "Published. GitHub Pages updates in about a minute."
