FROM python:3.13-slim

WORKDIR /app

# Copy both backend packages
COPY api/ ./api/
COPY financial_data_collector/ ./financial_data_collector/

# Install dependencies (api/requirements.txt covers everything)
RUN pip install --no-cache-dir -r api/requirements.txt

# Run from the api directory so server.py can find financial_data_collector
WORKDIR /app/api

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
