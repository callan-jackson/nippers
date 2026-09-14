#!/usr/bin/env bash
# One-shot provisioning + deployment to Azure (all always-free SKUs):
#   Resource group → Cosmos DB (free tier) → Static Web App (Free) → app settings → deploy.
# Re-running is safe: every step is idempotent. Requires: az, node 20, npm.
#
#   ./infra/deploy.sh                 # full provision + deploy
#   DEPLOY_ONLY=1 ./infra/deploy.sh   # skip provisioning, just build + deploy
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.npm-global/bin:$PATH"

RG="${RG:-nippers-rg}"
LOCATION="${LOCATION:-uksouth}"          # Cosmos region
SWA_LOCATION="${SWA_LOCATION:-westeurope}" # SWA Free regions: westeurope, centralus, eastus2, westus2, eastasia
COSMOS="${COSMOS:-nippers-db-$(whoami | tr -cd 'a-z0-9' | cut -c1-12)}"
SWA="${SWA:-nippers-web}"
ADMIN_EMAIL="${ADMIN_EMAIL:-nippers1973@outlook.com}"
APP_URL="${APP_URL:-}"

log() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }

state=$(az account show --query state -o tsv 2>/dev/null || echo "none")
if [[ "$state" != "Enabled" ]]; then
  echo "Azure subscription state is '$state'. Run 'az login' and make sure the subscription is enabled (not Warned/Disabled)." >&2
  exit 1
fi

if [[ -z "${DEPLOY_ONLY:-}" ]]; then
  log "Resource group $RG ($LOCATION)"
  az group create -n "$RG" -l "$LOCATION" -o none

  log "Cosmos DB account $COSMOS (free tier — 1000 RU/s + 25 GB, £0/month)"
  if ! az cosmosdb show -n "$COSMOS" -g "$RG" -o none 2>/dev/null; then
    az cosmosdb create -n "$COSMOS" -g "$RG" --enable-free-tier true \
      --locations regionName="$LOCATION" failoverPriority=0 \
      --default-consistency-level Session -o none
  fi
  COSMOS_CS=$(az cosmosdb keys list -n "$COSMOS" -g "$RG" --type connection-strings --query 'connectionStrings[0].connectionString' -o tsv)

  log "Static Web App $SWA (Free)"
  if ! az staticwebapp show -n "$SWA" -g "$RG" -o none 2>/dev/null; then
    az staticwebapp create -n "$SWA" -g "$RG" -l "$SWA_LOCATION" --sku Free -o none
  fi
  HOST=$(az staticwebapp show -n "$SWA" -g "$RG" --query defaultHostname -o tsv)
  APP_URL="${APP_URL:-https://$HOST}"

  log "Application settings"
  JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48 | tr -d '\n=/+' | cut -c1-48)}"
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(openssl rand -base64 18 | tr -d '\n=/+' | cut -c1-16)!1}"
  az staticwebapp appsettings set -n "$SWA" -g "$RG" -o none --setting-names \
    STORE=cosmos \
    "COSMOS_CONNECTION_STRING=$COSMOS_CS" \
    COSMOS_DATABASE=nippers \
    "JWT_SECRET=$JWT_SECRET" \
    "ADMIN_EMAIL=$ADMIN_EMAIL" \
    "ADMIN_PASSWORD=$ADMIN_PASSWORD" \
    "APP_URL=$APP_URL" \
    "MAIL_FROM=${MAIL_FROM:-N.I.P.P.E.R.S. <bookings@nippers.org.uk>}" \
    ${RESEND_API_KEY:+"RESEND_API_KEY=$RESEND_API_KEY"}
  echo "Admin login: $ADMIN_EMAIL / $ADMIN_PASSWORD  (change it in Account settings after first sign-in)"
fi

log "Build"
npm ci --silent
npm run build

log "Deploy to $SWA"
TOKEN=$(az staticwebapp secrets list -n "$SWA" -g "$RG" --query properties.apiKey -o tsv)
npx --yes @azure/static-web-apps-cli@2 deploy ./web/dist --api-location ./api --deployment-token "$TOKEN" --env production

HOST=$(az staticwebapp show -n "$SWA" -g "$RG" --query defaultHostname -o tsv)
log "Live at https://$HOST"
echo "Custom domain: az staticwebapp hostname set -n $SWA -g $RG --hostname nippers.org.uk  (then add the CNAME/TXT it prints at one.com)"
