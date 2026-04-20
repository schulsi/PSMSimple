FROM python:3.13-slim

WORKDIR /psmsimple

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

RUN apt-get update && apt-get install curl -y

COPY app/ app/

COPY run.py .

VOLUME ["/data"]

ENV DATA_DIR=/data

ENV SECRET_KEY=""

ENV RATELIMIT_STORAGE_URI="redis://redis:6379/0"

ENV FLASK_APP=run:app

EXPOSE 80

COPY entrypoint.sh .

RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]