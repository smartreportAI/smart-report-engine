FROM node:20-slim

# ── 1. Install Chrome + dependencies (modern signed-by approach) ──────────
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates \
    && mkdir -p /etc/apt/keyrings \
    && wget -q -O /etc/apt/keyrings/google-chrome.asc https://dl.google.com/linux/linux_signing_key.pub \
    && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-chrome.asc] http://dl.google.com/linux/chrome/deb/ stable main" \
       > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
       google-chrome-stable \
       fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg \
       fonts-kacst fonts-freefont-ttf \
       libxss1 dbus dbus-x11 \
    && rm -rf /var/lib/apt/lists/*

# ── 2. Working directory ──────────────────────────────────────────────────
WORKDIR /usr/src/app

# ── 3. Puppeteer config: skip download, use system Chrome ─────────────────
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# ── 4. Install Node dependencies (cached layer) ──────────────────────────
COPY package*.json ./
RUN npm ci

# ── 5. Copy source & build ───────────────────────────────────────────────
COPY . .
RUN npm run build

# Copy static assets (CSS, etc.) that tsc doesn't emit
RUN cp -r src/rendering/*.css dist/rendering/ 2>/dev/null || true

# ── 6. Runtime config ────────────────────────────────────────────────────
EXPOSE 3000
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# ── 7. Start ─────────────────────────────────────────────────────────────
CMD ["node", "dist/server.js"]
