#
# Description: This Dockerfile is used by Docker to build an image containing the Broadlink-mqtt-bridge app.
#
# Instructions:
#     
#   To build (and publish) on your default plaform (typically linux/amd64) run: 
#       docker build -t <image_registry>:[port]/[group/]broadlink-mqtt-bridge:<version> .
#       docker push <image_registry>:[port]/[group/]broadlink-mqtt-bridge:<version>
#   
#   To build (and publish) multiplatform images run:
#       docker buildx create --use default
#       docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 -t <image_registry>:[port]/[group/]broadlink-mqtt-bridge:<version> .
#       docker push <image_registry>:[port]/[group/]broadlink-mqtt-bridge:<version>
#
#       For more information on multiplatofrm builds see: https://docs.docker.com/build/building/multi-platform/
#
#   To run the image (for development/test) use:
#       docker run --rm --name test -v "$PWD/config:/config" -v "$PWD/commands:/commands" --network host <image_registry>:[port]/[group/]broadlink-mqtt-bridge:<version>
#

# Start from the Offical Node image, see: https://hub.docker.com/_/node
FROM node:10.24.1
WORKDIR /app
VOLUME [ "/config", "/commands" ]
EXPOSE 3000 3001
ENV NODE_CONFIG_DIR=/app/config:/config

COPY package.json package.json
RUN npm install --production
COPY . .
RUN rm config/default.json
RUN mv config/docker.json config/default.json
RUN rm package-lock.json

ENTRYPOINT ["npm", "run", "production"]