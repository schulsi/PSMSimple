# Stage 1: Build Frontend with Vite
FROM node:22-alpine AS frontend-builder

WORKDIR /build

COPY package.json package-lock.json* yarn.lock* ./

RUN npm ci

COPY frontend/ frontend/
COPY vite.config.js .

RUN npm run build:vue

# Stage 2: Python Backend
FROM python:3.14-slim

WORKDIR /psmsimple

RUN groupadd --gid 10001 psmsimple \
    && useradd --uid 10001 --gid psmsimple --home-dir /psmsimple --shell /usr/sbin/nologin --no-create-home psmsimple

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

RUN apt-get update \
    && apt-get install --no-install-recommends -y curl \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=psmsimple:psmsimple app/ app/

COPY --chown=psmsimple:psmsimple migrations/ migrations/

COPY --chown=psmsimple:psmsimple run.py .

# Copy built frontend from stage 1
COPY --from=frontend-builder --chown=psmsimple:psmsimple /build/app/static/vue app/static/vue/

RUN mkdir -p /data \
    && chown -R psmsimple:psmsimple /psmsimple /data

VOLUME ["/data"]

ENV DATA_DIR=/data

ENV SECRET_KEY=""
ENV LLM_PROVIDER=""
ENV LLM_MODEL=""
ENV OPENAI_API_KEY=""
ENV ANTHROPIC_API_KEY=""
ENV OPENAI_BASE_URL="https://api.openai.com/v1"
ENV RATELIMIT_STORAGE_URI="redis://redis:6379/0"

ENV FLASK_APP=run:app

USER psmsimple

EXPOSE 8000

CMD ["gunicorn", "-b", "0.0.0.0:8000", "run:app", "--timeout", "130"]
