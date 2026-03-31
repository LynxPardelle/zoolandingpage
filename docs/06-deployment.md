# Deployment Guide 🚀

This document covers deployment strategies, configuration, and operations for the Zoolandingpage project.

For the everyday authoring workflows, use these companion guides first:

- [11-draft-lifecycle.md](11-draft-lifecycle.md)
- [12-public-assets-and-file-uploads.md](12-public-assets-and-file-uploads.md)
- [api-driven-config/08-upload-to-api.md](api-driven-config/08-upload-to-api.md)

This deployment guide is the operational companion for infrastructure, API routing, and production validation.

## 🎯 Deployment Overview

The project supports multiple deployment strategies to accommodate different needs:

1. **Docker Development**: Zero dependencies local development
2. **Docker Production SSR**: Server-side rendering with Node.js/Express
3. **Docker Production Static**: Static files with Nginx
4. **Cloud Deployment**: Scalable production deployment

## Config Platform Services

The config-driven production path depends on three Lambda repositories that are deployed separately from the Angular app:

- `../zoolanding-config-runtime-read`
- `../zoolanding-config-authoring`
- `../zoolanding-image-upload`

Recommended AWS resource names:

- DynamoDB table: `zoolanding-config-registry`
- Config payload bucket: `zoolanding-config-payloads`
- Public asset bucket: `zoolandingpage-public-files`
- Public asset CDN domain: `https://assets.zoolandingpage.com.mx`
- API custom domain: `https://api.zoolandingpage.com.mx`

Recommended deployment order:

1. Use the existing `zoolanding-config-payloads`, `zoolandingpage-public-files`, and `zoolanding-config-registry` resources.
2. Configure S3 CORS on `zoolandingpage-public-files` for browser `PUT` uploads from `https://zoolandingpage.com.mx` and `https://test.zoolandingpage.com.mx`.
3. Create or reuse a CloudFront distribution in front of `zoolandingpage-public-files` and attach the alias `assets.zoolandingpage.com.mx`.
4. Deploy `zoolanding-config-runtime-read` behind API Gateway and map `/runtime-bundle` under `https://api.zoolandingpage.com.mx`.
5. Deploy `zoolanding-config-authoring` behind API Gateway and map `/config-authoring` under `https://api.zoolandingpage.com.mx`.
6. Deploy `zoolanding-image-upload` behind API Gateway and map `/image-upload/presign` under `https://api.zoolandingpage.com.mx`.
7. Seed or update the canonical production site under `zoolandingpage.com.mx`, and declare any preview or alternate hosts in `site-config.json.aliases`.
8. Build and deploy the Dokploy containers for `zoolandingpage.com.mx` and `test.zoolandingpage.com.mx` from the same codebase. Both can call `https://api.zoolandingpage.com.mx`, and the test host will reuse the canonical production config resources.

Notes for preview and alternate domains:

- Put preview or alternate hosts in `site-config.json.aliases`, for example `"aliases": ["test.zoolandingpage.com.mx", "landing-preview.zoolandingpage.com.mx"]`.
- The authoring Lambda persists alias lookup records in DynamoDB, and the runtime Lambda resolves those aliases back to the canonical site domain at request time.
- You do not need a second DynamoDB site entry just for a preview host when it should reuse the canonical site's config.
- The REST APIs currently answer CORS preflight with `Access-Control-Allow-Origin: *`, `Content-Type,Authorization`, and the expected route methods.
- The CloudFront distribution for `api.zoolandingpage.com.mx` must forward `Origin`, `Access-Control-Request-Method`, `Access-Control-Request-Headers`, query strings, and `OPTIONS` requests to preserve browser CORS behavior.
- Browser uploads to S3 still require bucket-level CORS on `zoolandingpage-public-files`.
- The public files bucket already allows `GET`, `HEAD`, and `PUT` from `https://zoolandingpage.com.mx` and `https://test.zoolandingpage.com.mx`.

## SAM Deployment For Config Platform

`sam` is now installed locally and the three Lambda stacks were deployed from this workspace into `us-east-1`.

Current deployed stack outputs:

- `zoolanding-config-authoring`: `https://2dvjmiwjod.execute-api.us-east-1.amazonaws.com/Prod/config-authoring`
- `zoolanding-config-runtime-read`: `https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod/runtime-bundle`
- `zoolanding-image-upload`: `https://sots05zp69.execute-api.us-east-1.amazonaws.com/Prod/image-upload/presign`

Current smoke-test status before the first site upload:

- authoring endpoint is live and returns `404 Site metadata not found` for `zoolandingpage.com.mx`, which is expected before `createSite`
- runtime endpoint is live and returns `404 Site metadata not found` for `zoolandingpage.com.mx`, which is expected before the first upload and publish
- image-upload endpoint is live and returns `200` with a presigned upload URL

Current custom-domain routing through CloudFront:

- distribution id: `E28Y8KTE8ZVWY9`
- alias: `api.zoolandingpage.com.mx`
- `/runtime-bundle*` -> `y84vk0v44l.execute-api.us-east-1.amazonaws.com` with origin path `/Prod`
- `/config-authoring*` -> `2dvjmiwjod.execute-api.us-east-1.amazonaws.com` with origin path `/Prod`
- `/image-upload/presign*` -> `sots05zp69.execute-api.us-east-1.amazonaws.com` with origin path `/Prod`
- the existing default behavior remains in place for older API routes already using the same distribution

Use `https://api.zoolandingpage.com.mx` as the stable frontend base URL. Keep the raw execute-api endpoints only for low-level troubleshooting.

Future redeploys can use the repo-local `samconfig.toml` files added to each Lambda repository.

### Recommended first-time bootstrap order

If `zoolandingpage.com.mx` has not been uploaded yet, use this order instead of trying to wire everything at once:

1. Deploy `zoolanding-config-authoring`.
2. Deploy `zoolanding-image-upload` if you need media uploads during authoring.
3. Use the authoring endpoint to create the `zoolandingpage.com.mx` site from the local draft.
4. Publish the current draft.
5. Deploy `zoolanding-config-runtime-read`.
6. Test `GET /runtime-bundle` with both `zoolandingpage.com.mx` and `test.zoolandingpage.com.mx`.
7. Point Dokploy traffic to the app after the API responses are stable.

### 1. Deploy with SAM

From each Lambda repository, run `sam deploy`. The checked-in `samconfig.toml` files already contain the stack name, region, and parameter overrides.

Windows PowerShell commands:

```powershell
Set-Location "C:\Users\lince\Documents\GitHub\zoolanding-config-authoring"
sam deploy

Set-Location "C:\Users\lince\Documents\GitHub\zoolanding-config-runtime-read"
sam deploy

Set-Location "C:\Users\lince\Documents\GitHub\zoolanding-image-upload"
sam deploy
```

The non-interactive commands actually used for the first deployment were:

```powershell
Set-Location "C:\Users\lince\Documents\GitHub\zoolanding-config-authoring"
sam deploy --stack-name zoolanding-config-authoring --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3 --no-confirm-changeset --no-fail-on-empty-changeset --parameter-overrides ConfigTableName=zoolanding-config-registry ConfigPayloadsBucketName=zoolanding-config-payloads LogLevel=INFO

Set-Location "C:\Users\lince\Documents\GitHub\zoolanding-config-runtime-read"
sam deploy --stack-name zoolanding-config-runtime-read --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3 --no-confirm-changeset --no-fail-on-empty-changeset --parameter-overrides ConfigTableName=zoolanding-config-registry ConfigPayloadsBucketName=zoolanding-config-payloads LogLevel=INFO

Set-Location "C:\Users\lince\Documents\GitHub\zoolanding-image-upload"
sam deploy --stack-name zoolanding-image-upload --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3 --no-confirm-changeset --no-fail-on-empty-changeset --parameter-overrides PublicFilesBucketName=zoolandingpage-public-files PublicFilesBaseUrl=https://assets.zoolandingpage.com.mx PresignExpirationSeconds=900 LogLevel=INFO
```

### 2. Prepare deployment zip files

If you ever need to fall back to manual console uploads, create zip files with the Python files at the zip root:

- `lambda_function.py`
- `zoolanding_lambda_common.py`

Do not put the files inside a nested folder in the zip, or Lambda will not find `lambda_function.lambda_handler`.

On Windows PowerShell, you can create the zip files like this:

```powershell
Set-Location "C:\Users\lince\Documents\GitHub\zoolanding-config-authoring"
Compress-Archive -Path .\lambda_function.py, .\zoolanding_lambda_common.py -DestinationPath .\zoolanding-config-authoring.zip -Force

Set-Location "C:\Users\lince\Documents\GitHub\zoolanding-config-runtime-read"
Compress-Archive -Path .\lambda_function.py, .\zoolanding_lambda_common.py -DestinationPath .\zoolanding-config-runtime-read.zip -Force

Set-Location "C:\Users\lince\Documents\GitHub\zoolanding-image-upload"
Compress-Archive -Path .\lambda_function.py, .\zoolanding_lambda_common.py -DestinationPath .\zoolanding-image-upload.zip -Force
```

After creating each zip, open it once and verify the files are at the root of the archive, not inside another folder.

### 3. Runtime stack settings

In AWS Lambda:

1. Create a new function named `zoolanding-config-runtime-read`.
2. Runtime: Python 3.13.
3. Handler: `lambda_function.lambda_handler`.
4. Upload the runtime-read zip from `../zoolanding-config-runtime-read`.

Set environment variables:

- `CONFIG_TABLE_NAME=zoolanding-config-registry`
- `CONFIG_PAYLOADS_BUCKET_NAME=zoolanding-config-payloads`
- `LOG_LEVEL=INFO`

Attach permissions:

- `dynamodb:GetItem` on `zoolanding-config-registry`
- `s3:GetObject` on `zoolanding-config-payloads/*`

Suggested execution settings:

- Memory: `256 MB`
- Timeout: `10 seconds`
- Architecture: `x86_64` is fine for this first pass
- Enable CloudWatch Logs with the default Lambda execution role permissions

### 4. Authoring stack settings

In AWS Lambda:

1. Create a new function named `zoolanding-config-authoring`.
2. Runtime: Python 3.13.
3. Handler: `lambda_function.lambda_handler`.
4. Upload the authoring zip from `../zoolanding-config-authoring`.

Set environment variables:

- `CONFIG_TABLE_NAME=zoolanding-config-registry`
- `CONFIG_PAYLOADS_BUCKET_NAME=zoolanding-config-payloads`
- `LOG_LEVEL=INFO`

Attach permissions:

- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `s3:GetObject`
- `s3:PutObject`
- `s3:ListBucket`

Suggested execution settings:

- Memory: `256 MB`
- Timeout: `20 seconds`
- Architecture: `x86_64`

Important first-upload note:

- This Lambda writes the canonical site metadata record and the alias lookup records for every hostname listed in `site-config.json.aliases`.
- Because your local draft already includes `test.zoolandingpage.com.mx` as an alias, the first `createSite` or `upsertDraft` call will create the lookup the runtime Lambda needs.

### 5. Image upload stack settings

In AWS Lambda:

1. Create a new function named `zoolanding-image-upload`.
2. Runtime: Python 3.13.
3. Handler: `lambda_function.lambda_handler`.
4. Upload the zip from `../zoolanding-image-upload`.

Set environment variables:

- `PUBLIC_FILES_BUCKET_NAME=zoolandingpage-public-files`
- `PUBLIC_FILES_BASE_URL=https://assets.zoolandingpage.com.mx`
- `PRESIGN_EXPIRATION_SECONDS=900`
- `LOG_LEVEL=INFO`

Attach permissions:

- `s3:PutObject` on `zoolandingpage-public-files/*`

Suggested execution settings:

- Memory: `256 MB`
- Timeout: `10 seconds`
- Architecture: `x86_64`

### 6. Wire the CloudFront API front door

The current production setup uses one existing CloudFront distribution for `api.zoolandingpage.com.mx` and routes each config-platform path to its own REST API origin:

- `GET /runtime-bundle` -> `zoolanding-config-runtime-read`
- `POST /config-authoring` -> `zoolanding-config-authoring`
- `POST /image-upload/presign` -> `zoolanding-image-upload`
- `OPTIONS` for the same routes if you configure CORS manually

Current distribution details:

- distribution id: `E28Y8KTE8ZVWY9`
- alias: `api.zoolandingpage.com.mx`
- viewer certificate: ACM certificate already attached to the distribution

Current origin and behavior mapping:

1. Add one CloudFront origin per execute-api hostname.
2. Use origin path `/Prod` for each of the three new origins so the public route stays clean.
3. Add cache behavior `/runtime-bundle*` pointing to the runtime API origin.
4. Add cache behavior `/config-authoring*` pointing to the authoring API origin.
5. Add cache behavior `/image-upload/presign*` pointing to the image-upload API origin.
6. Keep the existing default behavior untouched so older API routes continue working.
7. Reuse the distribution's disabled-cache policy and the origin-request policy that forwards viewer headers except `Host`.

CORS requirements through CloudFront:

1. Allow `OPTIONS` in every relevant CloudFront behavior.
2. Forward `Origin`, `Access-Control-Request-Method`, and `Access-Control-Request-Headers` to the origin.
3. Forward query strings for `/runtime-bundle` so `domain`, `path`, and `lang` reach the runtime API.
4. Keep API Gateway route-level preflight enabled for the three APIs.
5. Keep Lambda proxy responses returning `Access-Control-Allow-Origin`.
6. Keep S3 bucket CORS for presigned browser uploads.

### 7. Seed payload data

The published S3 structure now supports shared and page-specific files:

```text
sites/{domain}/versions/{versionId}/
  {domain}/site-config.json
  {domain}/components.json
  {domain}/variables.json
  {domain}/angora-combos.json
  {domain}/i18n/{lang}.json
  {domain}/{pageId}/page-config.json
  {domain}/{pageId}/components.json
  {domain}/{pageId}/variables.json
  {domain}/{pageId}/angora-combos.json
  {domain}/{pageId}/i18n/{lang}.json
```

The runtime merges shared files first and then page-specific overrides.

The canonical site config can also declare reusable aliases:

```json
{
  "version": 1,
  "domain": "zoolandingpage.com.mx",
  "aliases": ["test.zoolandingpage.com.mx", "landing-preview.zoolandingpage.com.mx"]
}
```

### 7.1 First upload from the local draft

Once the authoring Lambda is live, create the site from your local draft before testing the runtime Lambda.

If you prefer using the local Node CLI in this repo:

```powershell
Set-Location "C:\Users\lince\Documents\GitHub\zoolandingpage"
node .\tools\config-draft-sync.mjs create --endpoint=https://2dvjmiwjod.execute-api.us-east-1.amazonaws.com/Prod/config-authoring --domain=zoolandingpage.com.mx --publish-on-create=true

# Preferred through the stable custom domain
node .\tools\config-draft-sync.mjs create --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --publish-on-create=true
```

If you prefer a direct API call, first pack the local draft into a JSON file:

```powershell
Set-Location "C:\Users\lince\Documents\GitHub\zoolandingpage"
node .\tools\config-draft-sync.mjs pack --domain=zoolandingpage.com.mx --output=.\zoolandingpage-draft-package.json
```

Then use that package body in a `createSite` call through your preferred REST client. The CLI path is simpler because it assembles the `files` payload for you.

After that first upload, confirm in DynamoDB that you have:

- one `SITE#zoolandingpage.com.mx` metadata item
- one `ALIAS#test.zoolandingpage.com.mx` lookup item

### 7. Dokploy application setup

For the production and test containers:

1. Use the same image and the same codebase.
2. Keep `configApiUrl` pointing to `https://api.zoolandingpage.com.mx`.
3. Manage preview-domain routing through authored `site-config.json.aliases`, not frontend environment files.
4. Point both domains to the Dokploy app.
5. Validate that `https://test.zoolandingpage.com.mx` renders the same authored config as `https://zoolandingpage.com.mx`.

### 8. Smoke tests

Runtime bundle through the custom domain:

```bash
curl "https://api.zoolandingpage.com.mx/runtime-bundle?domain=zoolandingpage.com.mx&path=/&lang=es"
```

Runtime bundle through alias:

```bash
curl "https://api.zoolandingpage.com.mx/runtime-bundle?domain=test.zoolandingpage.com.mx&path=/&lang=es"
```

Authoring get site:

```bash
curl -X POST "https://api.zoolandingpage.com.mx/config-authoring" \
  -H "Content-Type: application/json" \
  -d '{"action":"getSite","domain":"zoolandingpage.com.mx","stage":"published"}'
```

Image upload presign:

```bash
curl -X POST "https://api.zoolandingpage.com.mx/image-upload/presign" \
  -H "Content-Type: application/json" \
  -d '{"domain":"zoolandingpage.com.mx","pageId":"default","assetKind":"hero-images","assetId":"headline-art","fileName":"headline-art.png","contentType":"image/png"}'
```

### 9. AWS Console fallback

If SAM is unavailable on another machine, keep the manual AWS Console path below as the fallback process.

## 🐳 Docker Deployment

### Development Environment

```bash
# Start development environment
make dev

# Background development
make dev-detached
make dev-logs    # Monitor logs

# Development with specific port
DEV_PORT=4200 make dev
```

### Production SSR Deployment

```bash
# Build and start SSR production server
make prod

# Background SSR production
make prod-detached

# Custom configuration
PROD_PORT=3000 make prod
```

### Production Static Deployment

```bash
# Build and serve static files with Nginx
make prod-no-ssr

# Background static production
make prod-no-ssr-detached

# Custom configuration
PROD_NO_SSR_PORT=8080 make prod-no-ssr
```

## 🔧 Environment Configuration

### Environment Variables

Create `.env` file based on `.example.env`:

```bash
# Application Configuration
APP_NAME=zoolandingpage
NODE_ENV=production

# Port Configuration
DEV_PORT=6161
PROD_PORT=6162
PROD_NO_SSR_PORT=6163

# Performance Settings
NODE_OPTIONS=--max-old-space-size=4096
NG_CLI_ANALYTICS=false

# Docker Configuration
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1

# User Configuration (Linux/macOS)
UID=1000
GID=1000

# Analytics Configuration
WEBSOCKET_URL=wss://your-domain.com/ws
ANALYTICS_ENABLED=true

# Feature Flags
ENABLE_DEBUG=false
ENABLE_ANALYTICS_DASHBOARD=true
```

### Angular Environment Files

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  websocketUrl: 'wss://your-domain.com/ws',
  analyticsEnabled: true,
  debugMode: false,
  languages: ['es', 'en'],
  fallbackLang: 'es',
  apiUrl: 'https://api.your-domain.com',
  assetsUrl: 'https://cdn.your-domain.com',

  // Feature flags
  features: {
    realTimeAnalytics: true,
    advancedAnimations: true,
    a11yMode: false,
  },

  // Performance settings
  performance: {
    enableServiceWorker: true,
    enableLazyLoading: true,
    enablePreloading: true,
  },
};
```

```typescript
// src/environments/environment.ts (development)
export const environment = {
  production: false,
  websocketUrl: 'ws://localhost:3001/ws',
  analyticsEnabled: true,
  debugMode: true,
  languages: ['es', 'en'],
  fallbackLang: 'es',
  apiUrl: 'http://localhost:3000/api',
  assetsUrl: '/assets',

  features: {
    realTimeAnalytics: true,
    advancedAnimations: true,
    a11yMode: true,
  },

  performance: {
    enableServiceWorker: false,
    enableLazyLoading: false,
    enablePreloading: false,
  },
};
```

## 🏗 Build Configuration

### Multi-Stage Dockerfile

```dockerfile
# Development Stage
FROM node:18-alpine AS development
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose development port
EXPOSE 6161

# Start development server
CMD ["npm", "run", "start", "--", "--host", "0.0.0.0", "--port", "6161"]

# Build Stage
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

# Production SSR Stage
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S angular -u 1001

# Copy built application
COPY --from=build --chown=angular:nodejs /app/dist ./dist
COPY --from=build --chown=angular:nodejs /app/package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Switch to non-root user
USER angular

# Expose production port
EXPOSE 6162

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:6162/health || exit 1

# Start production server
CMD ["node", "dist/zoolandingpage/server/server.mjs"]

# Production Static Stage
FROM nginx:alpine AS production-static
WORKDIR /usr/share/nginx/html

# Copy built static files
COPY --from=build /app/dist/zoolandingpage/browser ./

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx
RUN adduser -S nginx -u 1001

# Set ownership
RUN chown -R nginx:nginx /usr/share/nginx/html
RUN chown -R nginx:nginx /etc/nginx

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 6163

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:6163/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Development Profile
  app-dev:
    build:
      context: .
      target: development
      dockerfile: Dockerfile
    profiles: ['dev']
    ports:
      - '${DEV_PORT:-6161}:6161'
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - NG_CLI_ANALYTICS=false
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:6161']
      interval: 30s
      timeout: 10s
      retries: 3

  # Production SSR Profile
  app-prod:
    build:
      context: .
      target: production
      dockerfile: Dockerfile
    profiles: ['prod']
    ports:
      - '${PROD_PORT:-6162}:6162'
    environment:
      - NODE_ENV=production
      - PORT=6162
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:6162/health']
      interval: 30s
      timeout: 10s
      retries: 3

  # Production Static Profile
  app-static:
    build:
      context: .
      target: production-static
      dockerfile: Dockerfile
    profiles: ['static']
    ports:
      - '${PROD_NO_SSR_PORT:-6163}:6163'
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:6163']
      interval: 30s
      timeout: 10s
      retries: 3

  # Analytics WebSocket Server (Optional)
  analytics-server:
    image: node:18-alpine
    profiles: ['analytics']
    ports:
      - '3001:3001'
    volumes:
      - ./analytics-server:/app
    working_dir: /app
    command: ['node', 'server.js']
    environment:
      - NODE_ENV=production
      - PORT=3001
    restart: unless-stopped

networks:
  default:
    driver: bridge
```

### Nginx Configuration

```nginx
# nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;" always;

    server {
        listen 6163;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Enable browser caching for static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary "Accept-Encoding";
        }

        # Handle Angular routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Security
        location ~ /\. {
            deny all;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

## ☁️ Cloud Deployment

### AWS Deployment

#### ECS with Fargate

```yaml
# aws-task-definition.json
{
  'family': 'zoolandingpage',
  'networkMode': 'awsvpc',
  'requiresCompatibilities': ['FARGATE'],
  'cpu': '256',
  'memory': '512',
  'executionRoleArn': 'arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole',
  'taskRoleArn': 'arn:aws:iam::ACCOUNT:role/ecsTaskRole',
  'containerDefinitions':
    [
      {
        'name': 'zoolandingpage',
        'image': 'your-registry/zoolandingpage:latest',
        'portMappings': [{ 'containerPort': 6162, 'protocol': 'tcp' }],
        'environment': [{ 'name': 'NODE_ENV', 'value': 'production' }, { 'name': 'PORT', 'value': '6162' }],
        'logConfiguration':
          {
            'logDriver': 'awslogs',
            'options':
              { 'awslogs-group': '/ecs/zoolandingpage', 'awslogs-region': 'us-east-1', 'awslogs-stream-prefix': 'ecs' },
          },
        'healthCheck':
          {
            'command': ['CMD-SHELL', 'curl -f http://localhost:6162/health || exit 1'],
            'interval': 30,
            'timeout': 5,
            'retries': 3,
            'startPeriod': 60,
          },
      },
    ],
}
```

#### CloudFormation Template

```yaml
# cloudformation-template.yml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Zoolandingpage Infrastructure'

Parameters:
  ImageUri:
    Type: String
    Description: ECR Image URI

  Environment:
    Type: String
    Default: production
    AllowedValues: [development, staging, production]

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true

  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [1, !GetAZs '']
      MapPublicIpOnLaunch: true

  InternetGateway:
    Type: AWS::EC2::InternetGateway

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC

  PublicRoute:
    Type: AWS::EC2::Route
    DependsOn: AttachGateway
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub '${Environment}-zoolandingpage'

  ECSService:
    Type: AWS::ECS::Service
    Properties:
      Cluster: !Ref ECSCluster
      TaskDefinition: !Ref TaskDefinition
      LaunchType: FARGATE
      DesiredCount: 2
      NetworkConfiguration:
        AwsvpcConfiguration:
          SecurityGroups:
            - !Ref ECSSecurityGroup
          Subnets:
            - !Ref PublicSubnet1
            - !Ref PublicSubnet2
          AssignPublicIp: ENABLED
      LoadBalancers:
        - ContainerName: zoolandingpage
          ContainerPort: 6162
          TargetGroupArn: !Ref TargetGroup

  TaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: !Sub '${Environment}-zoolandingpage'
      Cpu: 256
      Memory: 512
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      ExecutionRoleArn: !Ref ExecutionRole
      TaskRoleArn: !Ref TaskRole
      ContainerDefinitions:
        - Name: zoolandingpage
          Image: !Ref ImageUri
          PortMappings:
            - ContainerPort: 6162
          Environment:
            - Name: NODE_ENV
              Value: !Ref Environment
            - Name: PORT
              Value: '6162'
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref LogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: ecs

Outputs:
  LoadBalancerDNS:
    Description: Load Balancer DNS Name
    Value: !GetAtt LoadBalancer.DNSName
    Export:
      Name: !Sub '${Environment}-zoolandingpage-dns'
```

### Digital Ocean App Platform

```yaml
# .do/app.yaml
name: zoolandingpage
services:
  - name: web
    source_dir: /
    github:
      repo: LynxPardelle/zoolandingpage
      branch: main
      deploy_on_push: true
    build_command: npm run build
    run_command: npm run serve:ssr
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    routes:
      - path: /
    health_check:
      http_path: /health
    envs:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: '8080'
      - key: ANALYTICS_ENABLED
        value: 'true'
```

### Heroku Deployment

```json
# package.json (add heroku scripts)
{
  "scripts": {
    "heroku-prebuild": "npm install",
    "heroku-postbuild": "npm run build",
    "start": "npm run serve:ssr"
  },
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}
```

```text
# Procfile
web: npm run serve:ssr
```

## 📊 Monitoring & Observability

### Health Check Endpoints

```typescript
// src/app/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  healthCheck(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: require('../../package.json').version,
    };
  }

  @Get('ready')
  readinessCheck(): ReadinessStatus {
    // Check dependencies (database, external APIs, etc.)
    return {
      status: 'ready',
      checks: {
        websocket: this.checkWebSocket(),
        analytics: this.checkAnalytics(),
      },
    };
  }
}
```

### Application Metrics

```typescript
// src/app/metrics/metrics.service.ts
@Injectable()
export class MetricsService {
  private metrics = new Map<string, number>();

  increment(metric: string, value = 1): void {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }

  gauge(metric: string, value: number): void {
    this.metrics.set(metric, value);
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  @Cron('*/30 * * * * *') // Every 30 seconds
  collectSystemMetrics(): void {
    this.gauge('memory_usage', process.memoryUsage().heapUsed);
    this.gauge('uptime', process.uptime());
    this.gauge('active_connections', this.getActiveConnections());
  }
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Zoolandingpage

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test -- --watch=false --browsers=ChromeHeadless

      - name: Run linting
        run: npm run lint

      - name: Build application
        run: npm run build

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          target: production
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # Add deployment commands here
```

### Deployment Scripts

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "Starting deployment..."

# Build and tag image
docker build -t zoolandingpage:latest --target production .

# Push to registry
docker tag zoolandingpage:latest your-registry/zoolandingpage:latest
docker push your-registry/zoolandingpage:latest

# Deploy to production
kubectl set image deployment/zoolandingpage zoolandingpage=your-registry/zoolandingpage:latest

# Wait for rollout
kubectl rollout status deployment/zoolandingpage

echo "Deployment complete!"
```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Use HTTPS in production
- [ ] Implement Content Security Policy
- [ ] Enable security headers
- [ ] Use non-root container user
- [ ] Regularly update dependencies
- [ ] Implement rate limiting
- [ ] Enable request logging
- [ ] Set up monitoring and alerting
- [ ] Use secrets management
- [ ] Implement backup strategy

### Environment Security

```bash
# Production environment variables
NODE_ENV=production
HTTPS=true
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem
SESSION_SECRET=your-secure-session-secret
JWT_SECRET=your-secure-jwt-secret
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://host:port
```

This deployment guide provides comprehensive strategies for deploying the Zoolandingpage project across different environments and platforms while maintaining security and performance best practices.
