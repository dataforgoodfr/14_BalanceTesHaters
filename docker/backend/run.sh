#!/bin/bash

source .venv/bin/activate
alembic upgrade head
fastapi run server.py