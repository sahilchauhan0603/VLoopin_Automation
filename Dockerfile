# ──────────────────────────────────────────────────────────────
# Loopin Automation – Playwright + Microsoft Edge Docker Image
# ──────────────────────────────────────────────────────────────
# Based on the official Playwright image, with MS Edge added
# for Azure AD Conditional Access compatibility.
#
# Build:
#   docker build -t loopin-playwright .
#
# Run tests:
#   docker run --rm -e CI=true loopin-playwright npm run test:ci
# ──────────────────────────────────────────────────────────────

FROM mcr.microsoft.com/playwright:v1.52.0-noble

# ── Install Microsoft Edge ──────────────────────────────────
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl \
      gnupg \
      ca-certificates && \
    curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | \
      gpg --dearmor -o /usr/share/keyrings/microsoft-edge.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-edge.gpg] \
      https://packages.microsoft.com/repos/edge stable main" \
      > /etc/apt/sources.list.d/microsoft-edge.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends microsoft-edge-stable && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ── Set working directory ───────────────────────────────────
WORKDIR /app

# ── Copy dependency manifests first (for Docker layer caching) ─
COPY package.json package-lock.json ./

# ── Install Node dependencies ──────────────────────────────
RUN npm ci --ignore-scripts

# ── Install Playwright browsers (Chromium + Edge channel) ──
RUN npx playwright install --with-deps chromium

# ── Copy all project files ─────────────────────────────────
COPY . .

# ── Default command: run all tests in CI mode ──────────────
CMD ["npm", "run", "test:ci"]
