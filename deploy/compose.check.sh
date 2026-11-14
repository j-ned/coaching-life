#!/usr/bin/env bash
# Valide `compose.yaml` avant qu'il parte en production : Dokploy lit ce fichier dans le dépôt à
# chaque déploiement, donc un fichier invalide fusionné serait déployé tel quel. Les variables
# viennent du modèle `coaching-life.env.example`, les vides remplies d'une valeur factice : une
# variable obligatoire du compose absente du modèle fait échouer la commande.
#   deploy/compose.check.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT

sed -E 's/^([A-Z0-9_]+)=$/\1=valeur/' "$HERE/coaching-life.env.example" > "$ENV_FILE"

services="$(docker compose --env-file "$ENV_FILE" -f "$HERE/compose.yaml" config --services | sort | paste -sd' ')"
test "$services" = "coaching-life-app coaching-life-backup" || { echo "services inattendus : $services" >&2; exit 1; }
echo "compose.yaml valide, services : $services"
