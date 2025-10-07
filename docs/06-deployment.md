# Deployment Guide 🚀

This document covers deployment strategies, configuration, and operations for the Zoolandingpage project.

## 🎯 Deployment Overview

The project supports multiple deployment strategies to accommodate different needs:

1. **Docker Development**: Zero dependencies local development
2. **Docker Production SSR**: Server-side rendering with Node.js/Express
3. **Docker Production Static**: Static files with Nginx
4. **Cloud Deployment**: Scalable production deployment

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

```
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
