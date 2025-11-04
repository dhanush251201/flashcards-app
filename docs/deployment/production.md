# Production Deployment Guide

Best practices for deploying Flash-Decks to production.

## Pre-Deployment Checklist

### Security

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS with specific origins (no wildcards)
- [ ] Set up firewall rules
- [ ] Review environment variables

### Database

- [ ] Set up automated backups
- [ ] Configure connection pooling
- [ ] Enable SSL for database connections
- [ ] Set up monitoring

### Application

- [ ] Set LOG_LEVEL to WARNING or ERROR
- [ ] Disable debug mode
- [ ] Configure error tracking (e.g., Sentry)
- [ ] Set up health check endpoints
- [ ] Configure rate limiting

## Deployment Options

### Option 1: Cloud Platform (Recommended)

**Heroku, Railway, Render, etc.**

Pros:
- Managed infrastructure
- Easy scaling
- Built-in SSL
- Automated backups

Example (Railway):
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and init
railway login
railway init

# Deploy
railway up
```

### Option 2: VPS (DigitalOcean, AWS EC2, etc.)

Pros:
- Full control
- Cost-effective at scale
- Custom configuration

Steps:
1. Set up server (Ubuntu 22.04 recommended)
2. Install Docker & Docker Compose
3. Clone repository
4. Configure environment
5. Run docker compose
6. Set up Nginx reverse proxy
7. Configure SSL with Let's Encrypt

### Option 3: Kubernetes

Pros:
- Highly scalable
- Production-grade orchestration
- Self-healing

Requirements:
- Kubernetes cluster
- Helm charts (to be created)
- Advanced DevOps knowledge

## Environment Configuration

**Production .env:**
```env
# Database
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/flashdecks

# Security
JWT_SECRET_KEY=<64-char-random-string>
JWT_REFRESH_SECRET_KEY=<64-char-random-string>
ACCESS_TOKEN_EXPIRE_MINUTES=15  # Shorter for production
CORS_ORIGINS=https://flashdecks.com,https://www.flashdecks.com

# Logging
LOG_LEVEL=WARNING
LOG_FORMAT=json

# Performance
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
```

## Monitoring

### Application Monitoring

- Error tracking: Sentry, Rollbar
- Performance: New Relic, Datadog
- Uptime: UptimeRobot, Pingdom

### Infrastructure Monitoring

- Server metrics: Prometheus + Grafana
- Database monitoring: pg_stat_statements
- Container monitoring: cAdvisor

## Backup Strategy

### Database Backups

```bash
# Daily automated backup
pg_dump -U flashdecks flashdecks_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U flashdecks flashdecks_db < backup_20240101.sql
```

### Backup Schedule

- Daily: Last 7 days
- Weekly: Last 4 weeks
- Monthly: Last 12 months

## Scaling

### Vertical Scaling

- Increase server resources
- Optimize database (indexes, queries)
- Tune connection pool

### Horizontal Scaling

- Multiple backend instances behind load balancer
- Database read replicas
- CDN for frontend assets
- Redis for caching

## Troubleshooting

**Service won't start:**
- Check logs: `docker compose logs`
- Verify environment variables
- Check database connection

**Slow performance:**
- Check database indexes
- Monitor query performance
- Review connection pool settings

**High memory usage:**
- Check for memory leaks
- Adjust worker processes
- Review connection pool size

## Further Reading

- [Docker Deployment](./docker.md)
- [Environment Variables](./environment-variables.md)
- [Configuration Guide](../getting-started/configuration.md)
