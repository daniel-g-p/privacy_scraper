FROM node:lts-alpine

WORKDIR /app

COPY package.json .
RUN npm install
RUN node ./node_modules/puppeteer/install.js

RUN apk update

COPY . .
RUN mkdir output
RUN echo 'NODE_ENV=production' > .env && echo 'PORT=3000' >> .env

CMD node index.js
EXPOSE 3000
