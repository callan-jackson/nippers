# Multi-stage build producing two runnable images from one repo:
#   --target api  → Azure Functions host running the API (port 80)
#   --target web  → nginx serving the SPA and proxying /api to the api service
FROM node:20-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci
COPY . .
RUN npm run build

FROM mcr.microsoft.com/azure-functions/node:4-node20 AS api
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    FUNCTIONS_WORKER_RUNTIME=node
WORKDIR /home/site/wwwroot
COPY api/package.json api/host.json ./
RUN npm install --omit=dev
COPY --from=build /src/api/dist ./dist

FROM nginx:1.27-alpine AS web
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/web/dist /usr/share/nginx/html
