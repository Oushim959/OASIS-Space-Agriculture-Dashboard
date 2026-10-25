# ==============================================================================
# O.A.S.I.S. Multi-Stage Production Container
# Stage 1: Build React 19 / Vite Space Mission Control Dashboard
# Stage 2: Lightweight Python 3.11 FastAPI server hosting API + SPA
# ==============================================================================

# ----------------- Stage 1: Frontend Build -----------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies
COPY artifacts/oasis-space-agriculture/package.json ./
RUN npm install --frozen-lockfile=false

# Copy frontend source and compile production bundle
COPY artifacts/oasis-space-agriculture/ ./
RUN npm run build

# ----------------- Stage 2: Production Runtime -----------------
FROM python:3.11-slim AS runtime

# System runtime settings & security
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    HOST=0.0.0.0

WORKDIR /app

# Install security updates & curl for container health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY oasis/ ./oasis/
COPY agents.py main.py example.py ./
COPY oasis_telemetry_dataset.csv ./

# Copy built frontend assets from Stage 1 into server discovery directory
COPY --from=frontend-builder /app/frontend/dist/public ./artifacts/oasis-space-agriculture/dist/public

# Create non-privileged user for AWS production security standards
RUN useradd -u 1001 -m oasisuser && chown -R oasisuser:oasisuser /app
USER oasisuser

# Expose FastAPI server port
EXPOSE 5000

# Container healthcheck targeting the O.A.S.I.S. status endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/oasis/status || exit 1

# Launch uvicorn ASGI production server
CMD ["python", "-m", "uvicorn", "oasis.server:app", "--host", "0.0.0.0", "--port", "5000"]
