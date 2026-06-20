# ENVIRONMENT CONFIGURATION REFERENCE GUIDE

This guide provides the exhaustive specification for all environment variables used by the EasyDev Support AI platform across all environments (Local, Staging, Production).

---

## 1. VARIABLE REFERENCE GUIDE

### 1.1 Core Configuration
| Variable Name | Type | Allowed Values | Description | Production Baseline |
|:---|:---|:---|:---|:---|
| `NODE_ENV` | String | `development`, `production`, `test` | Node runtime environment mode. | `production` |
| `PORT` | Integer | `1024-65535` | The port the application API listener binds to. | `3000` |
| `APP_NAME` | String | Plain text | The identifier for the application node. | `easydev-support-ai` |
| `APP_VERSION` | String | SemVer | The current semantic version of the codebase. | `1.0.0` |
| `API_PREFIX` | String | Path format | The URL path prefix for REST endpoints. | `/v1` |

### 1.2 Database Configuration (PostgreSQL 17)
| Variable Name | Type | Description | Production Baseline |
|:---|:---|:---|:---|
| `DATABASE_URL` | Connection String | Primary URI for database connectivity. | `postgresql://support_ai_prod:<PASSWORD>@postgres:5432/easydev_support_ai_prod?sslmode=disable` |
| `POSTGRES_HOST` | Hostname | Database host server. | `postgres` |
| `POSTGRES_PORT` | Integer | Connection port (typically 5432). | `5432` |
| `POSTGRES_DB` | String | Database name. | `easydev_support_ai_prod` |
| `POSTGRES_USER` | String | Database role user. | `support_ai_prod` |
| `POSTGRES_PASSWORD` | String | Secure credentials pass. | High-entropy secret key |

### 1.3 Cache & Queue Store (Redis 8)
| Variable Name | Type | Description | Production Baseline |
|:---|:---|:---|:---|
| `REDIS_HOST` | Hostname | Redis instance address. | `redis` |
| `REDIS_PORT` | Integer | Redis port (typically 6379). | `6379` |
| `REDIS_PASSWORD` | String | Authentication credential. | High-entropy secret key |
| `REDIS_DB` | Integer | Redis database index. | `0` |

### 1.4 Authentication & Integration Links
| Variable Name | Type | Description | Production Baseline |
|:---|:---|:---|:---|
| `JWT_SECRET` | String | Key for JWT Access Token signing. | 256-bit secure key |
| `JWT_REFRESH_SECRET` | String | Key for JWT Refresh Token signing. | 256-bit secure key |
| `IAM_SERVICE_URL` | URL | Public URL of EasyDev IAM. | `https://iam.easydev.in` |
| `IAM_SERVICE_INTERNAL_URL`| URL | Internal Docker gateway connection to IAM. | `http://host.docker.internal:3001` |
| `AI_PLATFORM_URL` | URL | Public URL of EasyDev AI. | `https://ai.easydev.in` |
| `AI_PLATFORM_INTERNAL_URL`| URL | Internal gateway path to EasyDev AI. | `http://host.docker.internal:3002` |
| `AI_PLATFORM_API_KEY` | String | API authorization key for EasyDev AI. | 256-bit secure key |
| `NOTIFICATION_SERVICE_URL`| URL | Endpoint for EasyDev Notification Service.| `https://notification.easydev.in` |
| `NOTIFICATION_SERVICE_API_KEY`| String | API authorization key. | 256-bit secure key |
| `PAYMENT_SERVICE_URL` | URL | Endpoint for EasyDev Payment Service. | `https://payment.easydev.in` |
| `PAYMENT_SERVICE_API_KEY`| String | API authorization key. | 256-bit secure key |
| `FILE_UPLOAD_SERVICE_URL`| URL | Endpoint for EasyDev Upload Service. | `https://upload.easydev.in` |
| `FILE_UPLOAD_SERVICE_HEALTH_URL`| URL | Health endpoint of Upload Service. | `https://upload.easydev.in/health` |
| `FILE_UPLOAD_HMAC_SECRET`| String | Shared HMAC key for secure uploads. | 256-bit secure key |

### 1.5 Queues, Observability, and Metrics
| Variable Name | Type | Description | Production Baseline |
|:---|:---|:---|:---|
| `BULLMQ_PREFIX` | String | Prefix for BullMQ redis hashes. | `easydev-support-ai-queue` |
| `LOG_LEVEL` | String | Logging output level (`debug`, `info`, `warn`, `error`). | `info` |
| `OTEL_ENABLED` | Boolean | Activates OpenTelemetry auto-instrumentation. | `true` |
| `OTEL_ENDPOINT` | URL | OpenTelemetry collector gateway (Tempo). | `http://tempo:4317` |
| `PROMETHEUS_ENABLED` | Boolean | Activates Prometheus metrics exporter endpoint. | `true` |
| `PROMETHEUS_PORT` | Integer | Exporter port. | `9090` |

### 1.6 Client and Routing Domain Configuration
| Variable Name | Type | Description | Production Baseline |
|:---|:---|:---|:---|
| `WIDGET_DOMAIN` | Hostname | Domain serving customer widgets. | `widget.easydev.in` |
| `WIDGET_PUBLIC_URL` | URL | Public path resolver for widget scripts. | `https://widget.easydev.in` |
| `ADMIN_PORTAL_URL` | URL | Origin domain of the Admin frontend portal. | `https://admin.easydev.in` |
| `PUBLIC_API_URL` | URL | Main public entry gateway of the API. | `https://api.easydev.in` |

### 1.7 Security Ciphers
| Variable Name | Type | Description | Production Baseline |
|:---|:---|:---|:---|
| `ENCRYPTION_KEY` | String (32 Bytes)| AES-256-GCM symmetric key for tenant data. | Hex/Text format (32 bytes) |
| `WEBHOOK_SECRET` | String | HMAC secret for verifying incoming webhooks. | 256-bit secure key |
| `COOKIE_SECRET` | String | Cookie parser signature validation key. | 256-bit secure key |

### 1.8 Rate Limiting & SMTP
| Variable Name | Type | Description | Production Baseline |
|:---|:---|:---|:---|
| `RATE_LIMIT_WINDOW_MS` | Integer | Sliding window tracking rate duration. | `60000` (1 minute) |
| `RATE_LIMIT_MAX_REQUESTS`| Integer | Max hits allowed per window by IP/Tenant. | `100` |
| `SMTP_HOST` | Hostname | Outbound mail transport (e.g. SendGrid).| `smtp.sendgrid.net` |
| `SMTP_PORT` | Integer | Outbound SMTP TLS port. | `587` |
| `SMTP_USER` | String | SMTP account login user. | `apikey` |
| `SMTP_PASSWORD` | String | SMTP secret access credential. | 256-bit secure key |
| `SMTP_FROM` | Email | Authorized Sender envelope address. | `support@easydev.in` |

### 1.9 Storage, Backup, and Features
| Variable Name | Type | Description | Production Baseline |
|:---|:---|:---|:---|
| `STORAGE_PROVIDER` | String | File storage provider driver (`s3`, `local`).| `s3` |
| `STORAGE_BUCKET` | String | Target S3 storage bucket. | `easydev-support-ai-backups` |
| `STORAGE_REGION` | String | AWS S3 region. | `us-east-1` |
| `STORAGE_ACCESS_KEY` | String | AWS credentials access key ID. | IAM-scoped key |
| `STORAGE_SECRET_KEY` | String | AWS credentials secret access key. | IAM-scoped key |
| `ANALYTICS_RETENTION_DAYS`| Integer | Duration in days to keep analytics events. | `90` |
| `BACKUP_ENABLED` | Boolean | Activates automated cron-based backups. | `true` |
| `BACKUP_RETENTION_DAYS` | Integer | Duration in days to keep postgres backups. | `30` |
| `FEATURE_FLAGS_ENABLED` | Boolean | Enables dynamic remote feature controls. | `true` |

---

## 2. SECURITY GUIDELINES

1. **Passphrase Entropy**:
   - Every secret key (such as `JWT_SECRET`, `ENCRYPTION_KEY`, `WEBHOOK_SECRET`, `COOKIE_SECRET`) must contain at least 256 bits of entropy. Generate keys using:
     ```bash
     openssl rand -hex 32
     ```
2. **Credential Storage (Docker Secrets)**:
   - In staging and production environments, avoid injecting raw database passwords, encryption keys, and S3 credentials via plain text environment variables in Compose files.
   - Use **Docker Secrets** mounted in read-only directories (e.g., `/run/secrets/db_password`) and configure the application to resolve from secret file paths.
3. **Key Rotation Protocol**:
   - Rotate encryption keys (`ENCRYPTION_KEY`) every 90 days. The system uses a multi-version key ring to decrypt data encrypted with previous keys automatically.
   - Rotate JWT signature keys every 30 days.

---

## 3. DOCKER CONFIGURATION REFERENCE

Mount environment files explicitly inside Compose files based on target environments:

```yaml
# docker-compose.yml example mapping
services:
  api:
    image: easydev-support-ai-api:prod
    env_file:
      - ./deployment/environments/production.env
    secrets:
      - db_password
      - api_encryption_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_encryption_key:
    file: ./secrets/api_encryption_key.txt
```

---

## 4. DEPLOYMENT CONFIGURATION REFERENCE

During zero-downtime Blue-Green hot-swaps, variables are passed dynamically via environment files to isolate execution contexts:

- **Blue Container Port mapping**: binds container internal port `3000` to host port `3000`.
- **Green Container Port mapping**: binds container internal port `3000` to host port `3002`.
- Both color instances share identical environment credentials (`DATABASE_URL`, `REDIS_HOST`, etc.) loaded from `./deployment/environments/${DEPLOY_ENV}.env`.
