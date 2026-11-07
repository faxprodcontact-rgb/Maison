#!/usr/bin/env sh
# Met l'app en ligne dans un dépôt GitHub Pages, dans un sous-dossier « maison ».
# Exemple : scripts/publier.sh ../fuze-arena-test
#   → https://faxprodcontact-rgb.github.io/fuze-arena-test/maison/
set -e
SITE="${1:?Indiquez le dossier du dépôt du site, par exemple ../fuze-arena-test}"
DEPOT="$(basename "$(cd "$SITE" && pwd)")"
BASE="/$DEPOT/maison/" npm run build
rm -rf "$SITE/maison"
cp -r dist "$SITE/maison"
echo "Copié dans $SITE/maison : il reste à faire un commit et un push dans ce dépôt."
