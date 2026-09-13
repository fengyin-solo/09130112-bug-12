#!/bin/bash

python -m alembic upgrade head
python -m app.init_data
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
