#!/bin/zsh
# Sets up the online test version (dev.menumaison.ch, Convex fleet-aardvark-573).
# No Stripe and no Resend there on purpose: no payment, no e-mail, no sign-up.
# 1. the entry password, typed twice without being shown;
# 2. the site address (not a secret, set automatically);
# 3. optionally the AI keys (Claude, Groq), taken from the clipboard and checked
#    by their prefix. Nothing is ever printed.
# Usage: scripts/set-dev-secrets.sh
cd "$(dirname "$0")/.." || exit 1
DEPLOYMENT=fleet-aardvark-573

# Pipes the value through stdin: never on the command line, never in the history
put() {
  print -rn -- "$2" | npx convex env set "$1" --deployment "$DEPLOYMENT" >/dev/null ||
    { echo "  ✖ Échec pour $1. Rien d'autre n'a été modifié après." >&2; exit 1; }
  echo "  ✔ $1 posé."
}

echo "Version de test en ligne : dev.menumaison.ch (Convex $DEPLOYMENT)"

echo ""
echo "▶ 1/3 Mot de passe d'entrée de la dev (16 caractères au moins)"
echo "  Tape-le ou colle-le (⌘V), il ne s'affiche pas, puis Entrée."
while true; do
  read -rs "pw1?  Mot de passe : "; echo ""
  read -rs "pw2?  Encore une fois : "; echo ""
  if [[ $pw1 != "$pw2" ]]; then
    echo "  ✖ Les deux saisies diffèrent. On recommence."
  elif (( ${#pw1} < 16 )); then
    echo "  ✖ Trop court (${#pw1} caractères). Au moins 16."
  else
    break
  fi
done
put DEV_SITE_PASSWORD "$pw1"
unset pw1 pw2

echo ""
echo "▶ 2/3 Adresse du site"
put SITE_URL "https://dev.menumaison.ch"

# Waits for a clipboard value starting with the prefix; « p » then Entrée skips it
optional_key() {
  local name=$1 label=$2 prefix=$3 answer value
  while true; do
    echo ""
    echo "▶ $label"
    echo "  Copie-la (⌘C) puis Entrée. Pour passer : p puis Entrée."
    read -r answer
    [[ $answer == p ]] && { echo "  … $name laissé de côté."; return; }
    value=$(pbpaste | tr -d '[:space:]')
    [[ $value == ${prefix}* ]] && { put "$name" "$value"; return; }
    echo "  ✖ Le presse-papiers ne commence pas par « $prefix ». Recopie la bonne clé."
  done
}

echo ""
echo "▶ 3/3 Clés d'IA, facultatives : sans elles, les fonctions d'IA (import de recettes notamment) ne marchent pas sur la dev."
optional_key ANTHROPIC_API_KEY "Clé API Anthropic (sk-ant-…)" sk-ant-
optional_key GROQ_API_KEY "Clé API Groq (gsk_…)" gsk_

print -n "" | pbcopy
echo ""
echo "✔ Terminé. Presse-papiers vidé. Variables de la dev (noms seulement) :"
npx convex env list --names-only --deployment "$DEPLOYMENT" 2>/dev/null
