FROM python:3.14-slim

WORKDIR /psmsimple

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

RUN apt-get update && apt-get install curl -y

COPY app/ app/

COPY migrations/ migrations/

COPY run.py .

VOLUME ["/data"]

ENV DATA_DIR=/data

ENV SECRET_KEY=""
ENV LLM_PROVIDER=""
ENV LLM_MODEL=""
ENV OPENAI_API_KEY=""
ENV ANTHROPIC_API_KEY=""
ENV OPENAI_BASE_URL="https://api.openai.com/v1"
ENV RATELIMIT_STORAGE_URI="redis://redis:6379/0"

ENV FLASK_APP=run:app

EXPOSE 80

CMD ["gunicorn", "-b", "0.0.0.0:80", "run:app"]