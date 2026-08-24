FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.base.json ./
COPY modules ./modules
COPY packages ./packages
COPY apps/backtest-worker ./apps/backtest-worker
RUN npm install && npm run build --workspace @cryptox/backtest-worker
CMD ["npm", "run", "start", "--workspace", "@cryptox/backtest-worker"]
