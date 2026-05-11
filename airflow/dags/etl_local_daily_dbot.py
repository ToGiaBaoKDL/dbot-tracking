"""
DAG: etl_local_daily_dbot
Job Type: ETL
Worker Type: local
Description: Daily ETL to fetch DBOT stock data after market close.
Schedule: Mon-Fri at 15:00 (does NOT run on Saturday or Sunday).
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
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=30),
}

_NETWORK_NAME = os.environ.get("DBOT_DOCKER_NETWORK", "dbot-tracking_default")
_IMAGE = os.environ.get("DBOT_BACKEND_IMAGE", "toilachuoituyet/dbot-backend:latest")
_ETL_ENV = {
    "DATABASE_URL": os.environ.get("DATABASE_URL", ""),
    "SECRET_KEY": os.environ.get("SECRET_KEY", ""),
    "SMTP_HOST": os.environ.get("SMTP_HOST", "smtp.gmail.com"),
    "SMTP_PORT": os.environ.get("SMTP_PORT", "465"),
    "SMTP_USER": os.environ.get("SMTP_USER", ""),
    "SMTP_PASSWORD": os.environ.get("SMTP_PASSWORD", ""),
    "EMAIL_FROM": os.environ.get("EMAIL_FROM", ""),
    "EMAIL_TO": os.environ.get("EMAIL_TO", ""),
}


with DAG(
    dag_id=_dag_id,
    default_args=_DEFAULT_ARGS,
    description="Daily ETL to fetch DBOT stock data after market close",
    schedule="0 15 * * 1-5",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["dbot", "etl", "daily"],
) as dag:
    run_etl = DockerOperator(
        task_id="run_daily_etl",
        image=_IMAGE,
        command="python scripts/etl_daily.py",
        docker_url="unix://var/run/docker.sock",
        network_mode=_NETWORK_NAME,
        environment=_ETL_ENV,
        auto_remove="success",
        mount_tmp_dir=False,
        execution_timeout=timedelta(minutes=30),
    )
    # Prevent Jinja from rendering mounts — absolute paths are treated
    # as template file paths and raise TemplateNotFound.
    run_etl.template_fields = (
        "image",
        "command",
        "docker_url",
        "environment",
        "container_name",
    )

    validate = DockerOperator(
        task_id="validate_daily_data",
        image=_IMAGE,
        command="python scripts/validate_daily.py",
        docker_url="unix://var/run/docker.sock",
        network_mode=_NETWORK_NAME,
        environment=_ETL_ENV,
        auto_remove="success",
        mount_tmp_dir=False,
        execution_timeout=timedelta(minutes=5),
    )
    validate.template_fields = run_etl.template_fields

    notify = DockerOperator(
        task_id="send_daily_report",
        image=_IMAGE,
        command="python scripts/daily_report.py",
        docker_url="unix://var/run/docker.sock",
        network_mode=_NETWORK_NAME,
        environment=_ETL_ENV,
        auto_remove="success",
        mount_tmp_dir=False,
        execution_timeout=timedelta(minutes=5),
    )
    notify.template_fields = run_etl.template_fields

    run_etl >> validate >> notify
