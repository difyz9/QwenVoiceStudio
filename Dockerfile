FROM node:20-bookworm-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_EXTRA_INDEX_URL=https://download.pytorch.org/whl/cpu

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip python3-venv supervisor libsndfile1 sox \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN python3 -m pip install --no-cache-dir --break-system-packages -r backend/requirements.txt

COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm --prefix frontend ci

COPY . .

RUN mkdir -p /app/assets /app/outputs /app/logs \
    && npm --prefix frontend run build

COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 3000

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]