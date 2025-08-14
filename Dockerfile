# Use a small Node.js base image
FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the app
COPY . .

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# Start the server
CMD ["npm","start"]


