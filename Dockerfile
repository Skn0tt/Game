FROM node:10.16.0

WORKDIR /app

COPY ./package.json .
COPY ./package-lock.json .

RUN npm ci

COPY ./tsconfig.json .
COPY ./baseTSConfig.json .

COPY ./source/app ./source/app
COPY ./source/utils ./source/utils

RUN npx tsc
