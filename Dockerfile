FROM node:lts-alpine

WORKDIR /app

COPY package.json .
RUN npm install

RUN apk update
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY . .
RUN mkdir output
RUN echo 'NODE_ENV=production' > .env && echo 'PORT=3000' >> .env

CMD node index.js
EXPOSE 3000
