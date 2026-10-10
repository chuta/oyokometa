FROM python:3.12-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl libgomp1 \
  && rm -rf /var/lib/apt/lists/* \
  && pip install --no-cache-dir onnxruntime pillow \
  && mkdir -p /app \
  && curl -fsSL -o /app/model.onnx \
    "https://huggingface.co/buildborderless/CommunityForensics-DeepfakeDet-ViT/resolve/main/onnx/model.onnx" \
  && test -s /app/model.onnx

WORKDIR /app
COPY server.py ./
ENV MODEL_PATH=/app/model.onnx PORT=8080
EXPOSE 8080
CMD ["python", "-u", "server.py"]
