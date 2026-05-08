"""
DAG: etl_local_daily_dbot
Job Type: ETL
Worker Type: local
Description: Daily ETL to fetch DBOT stock data after market close
"""

import os
from datetime import datetime, timedelta

from airflow import DAG
from airflow.providers.docker.operators.docker import DockerOperator
from docker.types import Mount

dag_id = os.path.basename(__file__).replace(".py", "")

DEFAULT_ARGS = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=30),
}

NETWORK_NAME = "dbot-tracking_default"
IMAGE = "toilachuoituyet/dbot-backend:latest"
ENV_MOUNT = Mount(
    source="/opt/airflow/.env",
    target="/app/.env",
    type="bind",
    read_only=True,
)


with DAG(
    dag_id=dag_id,
    default_args=DEFAULT_ARGS,
    description="Daily ETL to fetch DBOT stock data after market close",
    schedule="0 15 * * 1-5",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["dbot", "etl", "daily"],
) as dag:
    task = DockerOperator(
        task_id="run_daily_etl",
        image=IMAGE,
        command="python scripts/etl_daily.py",
        docker_url="unix://var/run/docker.sock",
        network_mode=NETWORK_NAME,
        mounts=[ENV_MOUNT],
        auto_remove="success",
        execution_timeout=timedelta(minutes=30),
    )
    # Prevent Jinja from rendering mounts — absolute paths like '/app/.env'
    # are treated as template file paths and raise TemplateNotFound.
    task.template_fields = (
        "image",
        "command",
        "docker_url",
        "environment",
        "container_name",
    )
