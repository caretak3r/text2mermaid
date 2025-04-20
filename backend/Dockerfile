FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Start the server
CMD ["node", "index.js"]
