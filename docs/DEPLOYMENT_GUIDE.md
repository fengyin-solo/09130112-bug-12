# 部署指南

## 概述

本文档提供SeismicVision系统的完整部署指南，包括开发环境、生产环境和分布式部署方案。

## 系统要求

### 最低配置

| 组件 | 要求 |
|------|------|
| 操作系统 | Linux (Ubuntu 20.04+), CentOS 8+ |
| CPU | 4核 |
| 内存 | 8 GB |
| 磁盘 | 100 GB SSD |
| GPU | 可选（推荐用于体绘制） |

### 推荐配置（TB级数据处理）

| 组件 | 要求 |
|------|------|
| CPU | 16核以上 |
| 内存 | 64 GB以上 |
| 磁盘 | 2 TB NVMe SSD |
| GPU | NVIDIA RTX 3090/4090 或 A100 |
| GPU显存 | 24 GB以上 |
| 网络 | 10 Gbps |

### 软件依赖

- Docker 24.0+
- Docker Compose 2.0+
- NVIDIA Container Toolkit（GPU加速）

---

## 快速部署（Docker Compose）

### 1. 准备环境

```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo apt install docker-compose-plugin

# 验证安装
docker --version
docker compose version
```

### 2. 获取代码

```bash
git clone <repository-url>
cd seismic-visualization
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp backend/.env.example backend/.env

# 编辑配置
nano backend/.env
```

关键配置项:
```env
# 数据库连接
DATABASE_URL=postgresql://seismic:seismic123@postgres:5432/seismic_db

# Redis连接
REDIS_URL=redis://redis:6379/0

# MinIO对象存储
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123

# JWT密钥（生产环境请修改）
SECRET_KEY=your-secret-key-change-in-production

# 数据目录
SEISMIC_DATA_DIR=/data/seismic
```

### 4. 启动服务

```bash
# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f backend
```

### 5. 验证部署

```bash
# 健康检查
curl http://localhost:8000/api/v1/health

# 访问前端
# http://localhost:3000

# 访问API文档
# http://localhost:8000/docs

# MinIO控制台
# http://localhost:9001 (账号: minioadmin / minioadmin123)
```

### 6. 默认账号

- 管理员: `admin` / `admin123`
- 演示用户: `demo` / `demo123`

### 7. 停止服务

```bash
# 停止服务
docker compose stop

# 停止并删除容器
docker compose down

# 删除所有数据（谨慎使用）
docker compose down -v
```

---

## 生产环境部署

### 1. 安全配置

#### 修改默认密码

```bash
# 修改PostgreSQL密码
# 在docker-compose.yml中修改POSTGRES_PASSWORD

# 修改MinIO密钥
# 修改MINIO_ACCESS_KEY和MINIO_SECRET_KEY

# 生成强JWT密钥
python3 -c "import secrets; print(secrets.token_hex(32))"
```

#### 配置HTTPS

使用Nginx反向代理:

```nginx
server {
    listen 80;
    server_name seismic.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seismic.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/seismic.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seismic.yourdomain.com/privkey.pem;

    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 大文件上传支持
        client_max_body_size 10G;
        proxy_read_timeout 300s;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

### 2. 性能优化

#### PostgreSQL调优

```sql
-- postgresql.conf
shared_buffers = 16GB
work_mem = 64MB
maintenance_work_mem = 2GB
effective_cache_size = 48GB
random_page_cost = 1.1
effective_io_concurrency = 200
max_connections = 200
```

#### Redis配置

```conf
# redis.conf
maxmemory 8gb
maxmemory-policy allkeys-lru
save 60 10000
appendonly yes
```

### 3. 备份策略

#### 数据库备份

```bash
#!/bin/bash
# 每日备份脚本

BACKUP_DIR="/backup/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份
docker exec seismic-postgres pg_dump -U seismic seismic_db > "${BACKUP_DIR}/seismic_db_${DATE}.sql"

# 压缩
gzip "${BACKUP_DIR}/seismic_db_${DATE}.sql"

# 保留30天
find ${BACKUP_DIR} -name "*.gz" -mtime +30 -delete

# 上传到远程存储（可选）
# aws s3 cp "${BACKUP_DIR}/seismic_db_${DATE}.sql.gz" s3://your-bucket/backups/
```

#### 对象存储备份

使用MinIO内置的版本控制和复制功能，或定期同步到其他存储。

### 4. 监控告警

#### 使用Prometheus + Grafana

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'seismic-backend'
    static_configs:
      - targets: ['backend:8000']
  
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
```

#### 关键指标监控

- API响应时间
- 错误率
- 数据库连接数
- Redis命中率
- 磁盘使用率
- 内存使用率

---

## 分布式部署（Kubernetes）

### Helm Chart部署

```bash
# 添加Helm仓库
helm repo add seismicvision https://charts.seismicvision.com

# 安装
helm install seismicvision seismicvision/seismicvision \
  --set storage.size=10Ti \
  --set postgres.resources.requests.memory=32Gi \
  --set redis.resources.requests.memory=16Gi \
  --set gpu.enabled=true \
  --set gpu.count=2
```

### 自动扩缩容

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: seismic-backend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: seismic-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## 常见问题

### 1. 服务启动失败

```bash
# 查看详细日志
docker compose logs backend --tail 100

# 检查端口占用
sudo lsof -i :8000
sudo lsof -i :3000
sudo lsof -i :5432
```

### 2. 文件上传失败

- 检查Nginx `client_max_body_size` 配置
- 检查MinIO存储容量
- 检查后端 `MAX_UPLOAD_SIZE` 配置

### 3. 三维渲染卡顿

- 检查浏览器是否启用WebGL
- 降低体绘制质量设置
- 考虑使用GPU加速
- 检查网络带宽（大体积数据传输）

### 4. 数据库连接错误

```bash
# 检查PostgreSQL容器状态
docker compose ps postgres

# 手动连接测试
docker exec -it seismic-postgres psql -U seismic -d seismic_db
```

---

## 性能基准

| 数据规模 | 加载时间 | 切片响应 | 帧率(体绘制) |
|----------|----------|----------|-------------|
| 1 GB | 2s | < 100ms | 60 FPS |
| 10 GB | 15s | < 200ms | 45 FPS |
| 100 GB | 2min | < 500ms | 30 FPS |
| 1 TB | 15min | < 1s | 15 FPS |

*测试环境: 32核CPU, 128GB内存, RTX 4090 GPU, NVMe SSD*

---

## 升级指南

### 版本升级

```bash
# 拉取最新镜像
docker compose pull

# 备份数据库
docker exec seismic-postgres pg_dump -U seismic seismic_db > backup.sql

# 重启服务
docker compose up -d

# 检查状态
docker compose ps
```

### 数据库迁移

```bash
# 执行数据库迁移
docker exec seismic-backend alembic upgrade head
```
