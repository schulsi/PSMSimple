FROM python:3.13-slim

WORKDIR /psmsimple

COPY requirements.txt .

COPY templates/ templates/

COPY app.py .

RUN pip install --no-cache-dir -r requirements.txt

RUN mkdir -p /psmsimple/databases

RUN mkdir -p /psmsimple/exports

ENV DB_PATH=/psmsimple/databases

ENV EXPORT_PATH=/psmsimple/exports

EXPOSE 80

CMD [ "python3", "-m" , "flask", "run" , "--host=0.0.0.0", "--port=80" ]