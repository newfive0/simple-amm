# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Copy source code
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build contracts and copy artifacts to frontend
ENV NX_DAEMON=false
RUN npx nx build contracts

# Manually copy TypeChain artifacts to frontend
RUN mkdir -p apps/frontend/artifacts
RUN cp -r libs/contracts/artifacts/typechain-types apps/frontend/artifacts/typechain-types

# Set build-time environment variables for production
ARG VITE_TOKEN_ADDRESS
ARG VITE_AMM_POOL_ADDRESS  
ARG VITE_NETWORK_CHAIN_ID
ENV VITE_TOKEN_ADDRESS=$VITE_TOKEN_ADDRESS
ENV VITE_AMM_POOL_ADDRESS=$VITE_AMM_POOL_ADDRESS
ENV VITE_NETWORK_CHAIN_ID=$VITE_NETWORK_CHAIN_ID

# Build the frontend application
RUN NX_DAEMON=false npx nx build frontend --prod

# Production stage
FROM nginx:alpine

# Copy built frontend to nginx  
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]