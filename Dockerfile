FROM python:3.13-slim

WORKDIR /psmsimple

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/

COPY run.py .

VOLUME ["/data"]

ENV DATA_DIR=/data

ENV SECRET_KEY="my-secret-key"

EXPOSE 80

CMD ["gunicorn", "-b", "0.0.0.0:80", "run:app"]