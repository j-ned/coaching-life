#!/usr/bin/env bash
# Garanties de l'image de production, jugées sur un vrai démarrage devant un Postgres jetable :
# refus de démarrer sans configuration, migrations et seed rejouables, pages prérendues et coquille
# CSR, caches, 404 des fichiers absents, en-têtes de sécurité, limitation de débit par l'adresse du
# visiteur derrière le tunnel Cloudflare, utilisateur non root.
# Usage : ci/verify-image.sh <image>
set -euo pipefail
image=${1:?image attendue}
id="coaching-life-verify-$$"
db="$id-db"
app="$id-app"
tmp=$(mktemp -d)

cleanup() {
  docker rm -f "$app" "$db" >/dev/null 2>&1 || true
  docker network rm "$id" >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT
fail() { echo "ÉCHEC : $1" >&2; exit 1; }

docker network create "$id" >/dev/null
docker run -d --name "$db" --network "$id" -e POSTGRES_PASSWORD=verify -e POSTGRES_DB=coaching postgres:18-alpine >/dev/null
for _ in $(seq 1 60); do docker exec "$db" pg_isready -U postgres -d coaching >/dev/null 2>&1 && break; sleep 1; done

# Configuration de production factice : rien n'est envoyé (aucun mail ni fichier dans ce test).
ENV=(
  -e "DATABASE_URL=postgres://postgres:verify@$db:5432/coaching"
  -e SESSION_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
  -e ADMIN_EMAIL=admin@example.test -e ADMIN_PASSWORD=verify-admin-password
  -e CORS_ORIGIN=https://coaching-life.example.test
  -e SMTP_HOST=smtp.example.test -e SMTP_USER=user -e SMTP_PASS=pass
  -e S3_ENDPOINT=https://s3.example.test -e S3_ACCESS_KEY=key -e S3_SECRET_KEY=secret -e S3_BUCKET=bucket
  -e CLIENT_IP_HEADER=cf-connecting-ip
)

# Une configuration de production incomplète arrête le conteneur au lieu de dégrader en silence.
if timeout 60 docker run --rm --network "$id" -e "DATABASE_URL=postgres://postgres:verify@$db:5432/coaching" \
  -e SESSION_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef \
  -e ADMIN_PASSWORD=verify-admin-password "$image" >/dev/null 2>&1; then
  fail "l'image démarre sans SMTP_* ni S3_*"
fi

start() {
  docker run -d --name "$app" --network "$id" -p 127.0.0.1::3000 "${ENV[@]}" "$image" >/dev/null
  base="http://127.0.0.1:$(docker port "$app" 3000/tcp | head -1 | sed 's/.*://')"
  for _ in $(seq 1 60); do curl -fsS -o /dev/null "$base/api/health" 2>/dev/null && return 0; sleep 1; done
  docker logs "$app" >&2
  fail "l'API ne répond pas sur /api/health"
}

# Deux démarrages : migrations et seed doivent se rejouer sans erreur sur une base déjà prête.
start
docker rm -f "$app" >/dev/null
start
users=$(docker exec "$db" psql -U postgres -d coaching -At -c "select count(*) from users where email = 'admin@example.test'")
test "$users" = 1 || fail "seed non idempotent : $users comptes admin après deux démarrages"

# status <chemin> ; header <chemin> <en-tête> (valeur sans retour chariot)
status() { curl -s -o /dev/null -w '%{http_code}' "$base$1"; }
header() { curl -s -o /dev/null -D - "$base$1" | tr -d '\r' | awk -F': ' -v h="$2" 'tolower($1) == tolower(h) { print $2 }'; }
expect() { test "$2" = "$3" || fail "$1 : « $2 », attendu « $3 »"; }

IMMUTABLE='public, max-age=31536000, immutable'

# Pages prérendues servies telles quelles, coquille CSR pour les routes client ; HTML revalidé.
for page in / /life-coach /life-coach/ /equine-coaching /dashboard /dashboard/rendez-vous/42; do
  expect "statut de $page" "$(status "$page")" 200
  expect "cache de $page" "$(header "$page" Cache-Control)" no-cache
done
curl -s "$base/life-coach" -o "$tmp/life-coach.html"
curl -s "$base/dashboard/rendez-vous/42" -o "$tmp/route.html"
docker exec "$app" cat /app/browser/index.csr.html >"$tmp/csr.html"
cmp -s "$tmp/life-coach.html" "$tmp/csr.html" && fail "/life-coach sert la coquille CSR au lieu de sa page prérendue"
cmp -s "$tmp/route.html" "$tmp/csr.html" || fail "une route client ne sert pas index.csr.html"

# Bundles à empreinte immuables ; fichier absent : 404, jamais la coquille HTML.
bundle=$(grep -oE 'main-[A-Za-z0-9_-]{8}\.js' "$tmp/csr.html" | head -1)
test -n "$bundle" || fail "bundle main introuvable dans index.csr.html"
expect "cache de /$bundle" "$(header "/$bundle" Cache-Control)" "$IMMUTABLE"
expect "cache de /favicon.ico" "$(header /favicon.ico Cache-Control)" no-cache
for missing in /main-AAAAAAAA.js /absent.css /icons/absent.svg; do
  expect "statut de $missing" "$(status "$missing")" 404
done

# En-têtes de sécurité (secureHeaders de Hono) sur les pages comme sur l'API.
for path in / /api/health; do
  expect "X-Content-Type-Options de $path" "$(header "$path" X-Content-Type-Options)" nosniff
  expect "X-Frame-Options de $path" "$(header "$path" X-Frame-Options)" SAMEORIGIN
  test -n "$(header "$path" Strict-Transport-Security)" || fail "HSTS absent sur $path"
done

# Limitation de débit de la connexion (10 essais / 5 min) comptée par visiteur (CF-Connecting-IP),
# même quand le tunnel est le dernier saut de X-Forwarded-For pour tout le monde.
login() {
  curl -s -o /dev/null -w '%{http_code}' -X POST "$base/api/auth/login" -H 'Content-Type: application/json' \
    -H "CF-Connecting-IP: $1" -H 'X-Forwarded-For: 172.18.0.5' -d '{"email":"x@example.test","password":"faux"}'
}
for _ in $(seq 1 10); do login 198.51.100.4 >/dev/null; done
expect "11e essai du même visiteur" "$(login 198.51.100.4)" 429
expect "premier essai d'un autre visiteur" "$(login 198.51.100.5)" 401

test "$(docker exec "$app" id -u)" != 0 || fail "le conteneur tourne en root"

echo "image vérifiée"
