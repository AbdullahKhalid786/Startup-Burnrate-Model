.PHONY: dev test fmt lint

dev:
	cd backend && uvicorn runwayos.app:app --app-dir src --host 127.0.0.1 --port 8000 --reload

test:
	cd backend && pytest

fmt:
	cd backend && ruff format . && ruff check --fix .

lint:
	cd backend && ruff check .
