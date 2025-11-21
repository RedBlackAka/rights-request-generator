# syntax=docker/dockerfile:1

FROM nginx:stable-alpine

# Set working directory where nginx expects static files
WORKDIR /usr/share/nginx/html

# Remove default nginx html assets
RUN rm -rf ./*

# Copy static site into image
COPY . .

# Expose default HTTP port
EXPOSE 3085

# Use the default nginx start command
CMD ["nginx", "-g", "daemon off;"]
