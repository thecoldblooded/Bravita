FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Expose BFF port
EXPOSE 3901

# Start the BFF backend server
CMD ["node", "scripts/bff/bff-auth-server.mjs"]
