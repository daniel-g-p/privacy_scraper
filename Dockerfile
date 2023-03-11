FROM ubuntu

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && apt install -y nodejs

RUN npm i -g pm2

RUN mkdir -p /opt/privacy_scanner

WORKDIR /opt/privacy_scanner

RUN mkdir output

COPY package.json .

RUN npm i

COPY . .

RUN echo 'NODE_ENV=production' > .env && echo 'PORT=3000' >> .env

RUN apt update

RUN apt install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils

EXPOSE 3000

RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser

RUN pwd | chown -R pptruser:pptruser

USER pptruser

CMD npm run start
