FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.base.json ./
COPY modules ./modules
COPY packages ./packages
COPY apps/backend ./apps/backend
RUN npm ci --ignore-scripts --no-audit --no-fund && npm run build
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@cryptox/backend"]
