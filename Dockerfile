FROM node:20-slim

# Install dependencies needed for Puppeteer & Chromium
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set up the working directory inside the container
WORKDIR /usr/src/app

# Tell Puppeteer to not download its own Chromium and use the installed version
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Install dependencies (only copy package files for caching)
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the TypeScript code
RUN npm run build

# Copy static assets (CSS, etc.) that tsc doesn't emit
RUN cp -r src/rendering/*.css dist/rendering/ 2>/dev/null || true

# Expose the standard port
EXPOSE 3000

# Ensure Render and Fastify bind to 0.0.0.0
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Start the Node.js server
CMD ["npm", "start"]
