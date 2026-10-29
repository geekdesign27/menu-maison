#!/bin/zsh
# Sets the secrets of the online test version (dev.menumaison.ch) from the
# clipboard, one at a time: the Convex deploy key goes to GitHub, the others
# to the dev Convex deployment. Each value is checked by its prefix before
# being sent, and never printed.
# Usage: scripts/set-dev-secrets.sh <dev deployment name, e.g. happy-otter-123>
cd "$(dirname "$0")/.." || exit 1
DEPLOYMENT=$1
if [[ -z $DEPLOYMENT || $DEPLOYMENT == resolute-squid-776 ]]; then
  echo "Donne le nom du déploiement de menu-maison-dev (jamais celui de la production)."
  exit 1
fi

# Waits until the clipboard holds a value starting with one of the prefixes
copied() {
  local label=$1; shift
  local value
  while true; do
    echo "" >&2
    echo "▶ $label" >&2
    echo "  Copie-la (⌘C), puis appuie sur Entrée ici." >&2
    read -r _
    value=$(pbpaste | tr -d '[:space:]')
    for prefix in "$@"; do
      [[ $value == ${prefix}* ]] && { print -r -- "$value"; return; }
    done
    echo "  ✖ Le presse-papiers ne commence pas par « $* ». Recopie la bonne clé." >&2
  done
}

ask() {
  local name=$1 label=$2; shift 2
  npx convex env set "$name" "$(copied "$label" "$@")" --deployment "$DEPLOYMENT"
}

copied "Clé de déploiement Convex du projet menu-maison-dev (prod:…)" prod: |
  gh secret set CONVEX_DEPLOY_KEY_DEV --repo geekdesign27/menu-maison
ask STRIPE_SECRET_KEY "Clé secrète Stripe de TEST (sk_test_… ou rk_test_…)" sk_test_ rk_test_
ask STRIPE_WEBHOOK_SECRET "Secret du webhook Stripe de TEST (whsec_…)" whsec_
ask RESEND_API_KEY "Clé API Resend de la dev (re_…)" re_

echo -n | pbcopy
echo ""
echo "✔ Clés de la dev posées (GitHub et Convex $DEPLOYMENT). Presse-papiers vidé."
