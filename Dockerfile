#
# Description: This Dockerfile is used by Docker to build an image containing the Broadlink-mqtt-bridge app.
#
# Instructions:
#     
#   To build (and publish) on your default plaform (typically linux/amd64) run: 
#       docker build --no-cache -t <image_registry>:[port]/[group/]broadlink-mqtt-bridge:<version> .
#       docker push <image_registry>:[port]/[group/]broadlink-mqtt-bridge:<version>
#   
#   To build (and publish) multiplatform images run:
#       docker buildx create --use [--driver-opt network=host]
#       docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 --push -t <image_registry>:[port]/[group/]broadlink-mqtt-bridge:<version> .
#
#       For more information on multiplatform builds see: https://docs.docker.com/build/building/multi-platform/
#
#   To run the image (for development/testing):
#       Create a separte folder for your docker config (so that it is not confused with the default ones): 
#           mkdir tmp-conf
#       Copy your local.json into the folder:
#           cp ./config/local.json ./tmp-config/
#       Then run the image mapping in your tmp-config folder:
#           docker run --rm --name test -v "$PWD/tmp-config:/config" -v "$PWD/commands:/commands" -p 3000:3000 -p 50000:50000/udp [--dns <dns-server>] <image_registry>:[port]/[group/]broadlink-mqtt-bridge:<version>
#

# Start from the Offical Node image, see: https://hub.docker.com/_/node
FROM node:10.24.1
WORKDIR /app
VOLUME [ "/config", "/commands" ]
# Expose the UI, and the UDP port (used for device discovery)
EXPOSE 3000 3001 50000/udp
ENV NODE_CONFIG_DIR=/app/config:/config

COPY package.json package.json
RUN npm install --production
COPY . .
RUN rm config/default.json
RUN mv config/docker.json config/default.json
RUN rm package-lock.json

ENTRYPOINT ["npm", "run", "production"]