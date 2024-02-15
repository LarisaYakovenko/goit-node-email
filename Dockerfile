FROM node 

WORKDIR  /app

COPY . .

RUN npm install

RUN npm rebuild bcrypt 

EXPOSE  3000

CMD ["node", "server"]