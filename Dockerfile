# Use Node.js 22 as the base image
FROM node:22

# Set the working directory
WORKDIR /usr/src/app

# Install system dependencies (ffmpeg)
RUN apt-get update && apt-get install -y ffmpeg

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start"]