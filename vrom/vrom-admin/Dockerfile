# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and lock files
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Set environment variables for build
ENV NEXT_PUBLIC_API_URL=http://localhost:8080

# Build the application
RUN npm run build

# Run stage
FROM node:20-alpine

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# If you use next.config.mjs or similar, copy it
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/postcss.config.mjs ./

# Expose the UI port
EXPOSE 3001

# Next.js defaults to 3000, we'll tell it to use 3001
ENV PORT=3001

CMD ["npm", "start"]
