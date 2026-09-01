FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.base.json ./
COPY modules ./modules
COPY packages ./packages
COPY apps/frontend ./apps/frontend
ARG VITE_BACKEND_URL=http://localhost:3000
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
RUN npm install && npm run build --workspace @cryptox/frontend
EXPOSE 5173
CMD ["npm", "run", "start", "--workspace", "@cryptox/frontend"]
