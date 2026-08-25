FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.base.json ./
COPY modules ./modules
COPY packages ./packages
COPY apps/frontend ./apps/frontend
ENV VITE_BACKEND_URL=http://localhost:3000
RUN npm install && npm run build --workspace @cryptox/frontend
EXPOSE 5173
CMD ["npm", "run", "start", "--workspace", "@cryptox/frontend"]
