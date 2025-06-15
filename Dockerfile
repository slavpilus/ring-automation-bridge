FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose health check port if configured
EXPOSE 3000

# Run the application
CMD ["node", "ring-webhook-bridge.js"]