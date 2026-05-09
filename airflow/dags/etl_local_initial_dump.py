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

_dag_id = os.path.basename(__file__).replace(".py", "")

_DEFAULT_ARGS = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=30),
}

_NETWORK_NAME = os.environ.get("DBOT_DOCKER_NETWORK", "dbot-tracking_default")
_IMAGE = os.environ.get("DBOT_BACKEND_IMAGE", "toilachuoituyet/dbot-backend:latest")
_ETL_ENV = {
    "DATABASE_URL": os.environ.get("DATABASE_URL", ""),
    "SECRET_KEY": os.environ.get("SECRET_KEY", ""),
}


with DAG(
    dag_id=_dag_id,
    default_args=_DEFAULT_ARGS,
    description="Initial historical stock data dump from DBOT",
    schedule=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["dbot", "etl", "initial"],
) as dag:
    run_etl = DockerOperator(
        task_id="run_initial_dump",
        image=_IMAGE,
        command="python scripts/etl_initial.py",
        docker_url="unix://var/run/docker.sock",
        network_mode=_NETWORK_NAME,
        environment=_ETL_ENV,
        auto_remove="success",
        mount_tmp_dir=False,
        execution_timeout=timedelta(hours=2),
    )
    run_etl.template_fields = (
        "image",
        "command",
        "docker_url",
        "environment",
        "container_name",
    )

    validate = DockerOperator(
        task_id="validate_overview",
        image=_IMAGE,
        command="python scripts/validate_overview.py",
        docker_url="unix://var/run/docker.sock",
        network_mode=_NETWORK_NAME,
        environment=_ETL_ENV,
        auto_remove="success",
        mount_tmp_dir=False,
        execution_timeout=timedelta(minutes=5),
    )
    validate.template_fields = run_etl.template_fields

    run_etl >> validate
