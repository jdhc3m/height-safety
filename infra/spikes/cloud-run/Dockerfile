FROM mcr.microsoft.com/playwright@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e

ARG NODE_VERSION=24.18.0
ARG NODE_LINUX_X64_SHA256=783130984963db7ba9cbd01089eaf2c2efb055c7c1693c943174b967b3050cb8

RUN curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz" \
    && echo "${NODE_LINUX_X64_SHA256}  node-v${NODE_VERSION}-linux-x64.tar.gz" | sha256sum --check --strict \
    && tar -xzf "node-v${NODE_VERSION}-linux-x64.tar.gz" -C /usr/local --strip-components=1 \
    && rm "node-v${NODE_VERSION}-linux-x64.tar.gz" \
    && node --version | grep -Fx "v${NODE_VERSION}"

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY apps/api/package.json apps/api/package.json
COPY clients/typescript/package.json clients/typescript/package.json
RUN corepack pnpm@11.4.0 install --frozen-lockfile --ignore-scripts

COPY fixtures/ fixtures/
COPY tools/pdf-spike/ tools/pdf-spike/
COPY infra/spikes/cloud-run/ infra/spikes/cloud-run/

ENV NODE_ENV=production
ENV PDF_SPIKE_CONCURRENCY=1
CMD ["node", "infra/spikes/cloud-run/worker.mjs"]
