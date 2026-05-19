FROM python:3.13-slim

WORKDIR /app

# Install dependencies for GRPC and FAISS
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Ensure the new langchain package is present
RUN pip install --no-cache-dir langchain-huggingface

# Models will be downloaded at runtime when pipeline/embeddings are initialized.
# Copy source code
COPY . .

# Port for gRPC
EXPOSE 50052

# Environment variables
ENV AI_SERVICE_ADDR=0.0.0.0:50052

CMD ["python", "main.py"]
