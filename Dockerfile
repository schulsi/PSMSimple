FROM python:3.13-slim

WORKDIR /psmsimple

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY templates/ templates/

COPY app.py .

VOLUME ["/data"]

ENV DATA_DIR=/data

EXPOSE 80

CMD ["flask", "run", "--host=0.0.0.0", "--port=80"]