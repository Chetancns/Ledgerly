# Deployment Guide for Ledgerly

## Overview

This guide covers deploying Ledgerly to various environments including development, staging, and production.

## Prerequisites

### Required Software
- Node.js 18.x or later
- npm 9.x or later
- PostgreSQL 14.x or later
- Git

### Required Accounts
- PostgreSQL database (local or cloud)
- OpenAI API key (for AI features)
- Domain name (for production)
- SSL certificate (for production)

---

## Environment Configuration

### Development Environment

#### Backend Configuration (.env in ledgerly-api/)

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=ledgerly_dev
DB_SSL=false

# Authentication
JWT_SECRET=your-development-secret-key-change-in-production
JWT_EXPIRES=15m

# Server Configuration
PORT=3001
NODE_ENV=development

# OpenAI Configuration (for AI features)
OPENAI_API_KEY=sk-your-api-key

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://192.168.1.50:3000
```

#### Frontend Configuration (.env.local in ledgerly_app/)

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.50:3001

# Environment
NODE_ENV=development
```

### Production Environment

#### Backend Configuration (.env in ledgerly-api/)

```env
# Database Configuration
DB_HOST=your-production-db-host
DB_PORT=5432
DB_USER=ledgerly_user
DB_PASS=strong-random-password
DB_NAME=ledgerly_prod
DB_SSL=true

# Authentication - USE STRONG RANDOM VALUES
JWT_SECRET=generate-strong-random-secret-min-32-chars
JWT_EXPIRES=15m

# Server Configuration
PORT=3001
NODE_ENV=production

# OpenAI Configuration
OPENAI_API_KEY=sk-your-production-api-key

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
```

#### Frontend Configuration (.env.production in ledgerly_app/)

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com

# Environment
NODE_ENV=production
```

---

## Database Setup

### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ledgerly_prod;

# Create user
CREATE USER ledgerly_user WITH ENCRYPTED PASSWORD 'your-secure-password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ledgerly_prod TO ledgerly_user;

# Connect to the database
\c ledgerly_prod

# Create schema
CREATE SCHEMA IF NOT EXISTS dbo;

# Grant schema privileges
GRANT ALL ON SCHEMA dbo TO ledgerly_user;
```

### 2. Run Migrations

```bash
cd ledgerly-api

# Install dependencies
npm install

# Run migrations
npm run migration:run
```

### 3. Verify Setup

```bash
# Connect to database
psql -U ledgerly_user -d ledgerly_prod

# List tables
\dt dbo.*

# Expected tables:
# - dbo.users
# - dbo.accounts
# - dbo.categories
# - dbo.transactions
# - dbo.budgets
# - dbo.debts
# - dbo.debt_updates
# - dbo.recurring_transactions
```

---

## Backend Deployment

### Local/Development

```bash
cd ledgerly-api

# Install dependencies
npm install

# Start development server with hot reload
npm run start:dev

# Server will start on http://localhost:3001
```

### Production Build

```bash
cd ledgerly-api

# Install production dependencies only
npm ci --only=production

# Build the application
npm run build

# Start production server
npm run start:prod
```

### Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
cd ledgerly-api
pm2 start dist/main.js --name ledgerly-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### PM2 Configuration File (ecosystem.config.js)

```javascript
module.exports = {
  apps: [{
    name: 'ledgerly-api',
    script: './dist/main.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '512M'
  }]
};
```

Start with config:
```bash
pm2 start ecosystem.config.js
```

---

## Frontend Deployment

### Local/Development

```bash
cd ledgerly_app

# Install dependencies
npm install

# Start development server
npm run dev

# Application will start on http://localhost:3000
```

### Production Build

```bash
cd ledgerly_app

# Install dependencies
npm ci

# Build for production
npm run build

# Start production server
npm start
```

### Static Export (Optional)

If you want to deploy as static files:

```bash
# Update next.config.ts to enable static export
# Add: output: 'export'

npm run build

# Output will be in 'out' directory
# Deploy 'out' directory to any static hosting
```

---

## Docker Deployment

### Dockerfile for Backend (ledgerly-api/Dockerfile)

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/main"]
```

### Dockerfile for Frontend (ledgerly_app/Dockerfile)

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose (docker-compose.yml)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: ledgerly_prod
      POSTGRES_USER: ledgerly_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - ledgerly-network

  backend:
    build:
      context: ./ledgerly-api
      dockerfile: Dockerfile
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ledgerly_user
      DB_PASS: ${DB_PASSWORD}
      DB_NAME: ledgerly_prod
      DB_SSL: false
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES: 15m
      PORT: 3001
      NODE_ENV: production
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    ports:
      - "3001:3001"
    depends_on:
      - postgres
    networks:
      - ledgerly-network

  frontend:
    build:
      context: ./ledgerly_app
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_BASE_URL: http://backend:3001
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - ledgerly-network

volumes:
  postgres_data:

networks:
  ledgerly-network:
    driver: bridge
```

### Running with Docker Compose

```bash
# Create .env file with secrets
cat > .env << EOF
DB_PASSWORD=your-secure-db-password
JWT_SECRET=your-secure-jwt-secret
OPENAI_API_KEY=your-openai-api-key
EOF

# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## Nginx Configuration

### Reverse Proxy Setup

```nginx
# /etc/nginx/sites-available/ledgerly

upstream ledgerly_backend {
    server localhost:3001;
    keepalive 64;
}

upstream ledgerly_frontend {
    server localhost:3000;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Frontend
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://ledgerly_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # File upload limit
    client_max_body_size 10M;

    location / {
        proxy_pass http://ledgerly_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout for AI operations
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }
}
```

### Enable Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ledgerly /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL Certificate Setup

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured by default
# Test renewal
sudo certbot renew --dry-run
```

---

## Cloud Platform Deployment

### Heroku

#### Backend
```bash
cd ledgerly-api

# Create Heroku app
heroku create your-app-name-api

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set JWT_SECRET=your-secret
heroku config:set JWT_EXPIRES=15m
heroku config:set NODE_ENV=production
heroku config:set OPENAI_API_KEY=your-key

# Deploy
git push heroku main

# Run migrations
heroku run npm run migration:run
```

#### Frontend
```bash
cd ledgerly_app

# Create Heroku app
heroku create your-app-name-web

# Set environment variables
heroku config:set NEXT_PUBLIC_API_BASE_URL=https://your-app-name-api.herokuapp.com
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

### AWS EC2

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t3.small or larger
   - Configure security groups (ports 80, 443, 22)

2. **Setup Server**
```bash
# Connect to instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Nginx
sudo apt-get install -y nginx

# Install PM2
sudo npm install -g pm2
```

3. **Deploy Application**
```bash
# Clone repository
git clone https://github.com/your-repo/ledgerly.git
cd ledgerly

# Setup backend
cd ledgerly-api
npm ci
npm run build
pm2 start ecosystem.config.js

# Setup frontend
cd ../ledgerly_app
npm ci
npm run build
pm2 start npm --name "ledgerly-web" -- start

# Save PM2 config
pm2 save
pm2 startup
```

### Vercel (Frontend Only)

```bash
cd ledgerly_app

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# NEXT_PUBLIC_API_BASE_URL=your-api-url

# Deploy to production
vercel --prod
```

---

## Monitoring and Logging

### PM2 Monitoring

```bash
# View status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit

# View specific app logs
pm2 logs ledgerly-api
```

### Log Management

```bash
# Create log directory
mkdir -p /var/log/ledgerly

# Configure log rotation
sudo nano /etc/logrotate.d/ledgerly
```

```
/var/log/ledgerly/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    sharedscripts
}
```

---

## Backup Strategy

### Database Backup

```bash
# Create backup script
cat > /home/ubuntu/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

pg_dump -U ledgerly_user -d ledgerly_prod | gzip > $BACKUP_DIR/ledgerly_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "ledgerly_*.sql.gz" -mtime +30 -delete
EOF

# Make executable
chmod +x /home/ubuntu/backup.sh

# Schedule daily backup
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup.sh
```

### Application Backup

```bash
# Backup configuration files
tar -czf config-backup.tar.gz \
  ledgerly-api/.env \
  ledgerly_app/.env.production

# Store securely (not in git)
```

---

## Health Checks

### Backend Health Check Endpoint

Add to `ledgerly-api/src/app.controller.ts`:

```typescript
@Get('health')
health() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
}
```

### Monitor Script

```bash
#!/bin/bash
# health-check.sh

BACKEND_URL="https://api.yourdomain.com/health"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Backend is healthy"
else
    echo "Backend is down! Response code: $RESPONSE"
    # Send alert
    # pm2 restart ledgerly-api
fi
```

---

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DB_HOST, DB_PORT, DB_USER, DB_PASS
   - Verify PostgreSQL is running
   - Check firewall rules

2. **CORS Errors**
   - Update CORS_ORIGIN in backend .env
   - Ensure frontend URL is whitelisted

3. **JWT Errors**
   - Verify JWT_SECRET is set and consistent
   - Check JWT_EXPIRES format

4. **Migration Errors**
   - Ensure database schema exists
   - Run migrations: `npm run migration:run`

### Logs Location

- Backend: `/var/log/ledgerly/api.log`
- Frontend: `/var/log/ledgerly/web.log`
- PM2: `~/.pm2/logs/`
- Nginx: `/var/log/nginx/`

---

## Security Checklist

- [ ] Use strong JWT_SECRET (minimum 32 characters)
- [ ] Enable DB_SSL in production
- [ ] Use HTTPS for all connections
- [ ] Set secure cookie flags (httpOnly, secure, sameSite)
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Keep dependencies updated
- [ ] Use environment variables for secrets
- [ ] Implement database backups
- [ ] Enable firewall rules
- [ ] Use strong database passwords
- [ ] Disable unnecessary ports
- [ ] Monitor application logs
- [ ] Implement error tracking (Sentry)
- [ ] Regular security audits

---

## Performance Optimization

1. **Enable caching**
2. **Use CDN for static assets**
3. **Optimize database queries**
4. **Add database indexes**
5. **Enable gzip compression**
6. **Minimize bundle size**
7. **Lazy load components**
8. **Use connection pooling**
9. **Implement rate limiting**
10. **Monitor performance metrics**
