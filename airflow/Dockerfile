FROM apache/airflow:2.11.2-python3.12

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

USER airflow
RUN pip install --no-cache-dir \
    "apache-airflow-providers-docker>=3.13.0"

ENV PYTHONPATH="/opt/airflow/plugins"
