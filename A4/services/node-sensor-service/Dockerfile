FROM node:20-alpine

# Install wait-for-it script for database readiness
RUN apk add --no-cache bash

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy source code
COPY src/ ./src/

# Copy wait script
COPY wait-for-it.sh ./
RUN chmod +x wait-for-it.sh

# Expose port
EXPOSE 3000

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Run from new location
CMD ["./wait-for-it.sh", "node-sensor-db:5432", "--", "node", "src/index.js"]
