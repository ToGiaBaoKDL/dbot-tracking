"""
DAG: etl_local_initial_dump
Job Type: ETL
Worker Type: local
Description: Initial historical data dump from DBOT
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
    "retries": 2,
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
    description="Initial historical stock data dump from DBOT",
    schedule=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["dbot", "etl", "initial"],
) as dag:
    DockerOperator(
        task_id="run_initial_dump",
        image=IMAGE,
        command="python scripts/etl_initial.py",
        docker_url="unix://var/run/docker.sock",
        network_mode=NETWORK_NAME,
        mounts=[ENV_MOUNT],
        auto_remove="success",
        execution_timeout=timedelta(hours=2),
    )
