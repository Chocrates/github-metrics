FROM ubuntu:latest

RUN apt-get update && apt-get install -y gnupg software-properties-common curl
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-key C99B11DEB97541F0
RUN apt-add-repository -u https://cli.github.com/packages 
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get update && apt-get install -y zip gh nodejs


COPY . .

RUN npm install

ENTRYPOINT ["/entrypoint.sh"]

