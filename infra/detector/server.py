import io
import json
import os
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

PORT = int(os.environ.get("PORT", "8080"))
TOKEN = os.environ.get("DETECTOR_AUTH_TOKEN", "")
MODEL_VERSION = "cf-vit-s-384-onnx-v1.1"
MEAN = np.array([0.4815, 0.4578, 0.4082], dtype=np.float32)
STD = np.array([0.2686, 0.2613, 0.2758], dtype=np.float32)
MAX_BYTES = 26 * 1024 * 1024

session = ort.InferenceSession(os.environ.get("MODEL_PATH", "/app/model.onnx"), providers=["CPUExecutionProvider"])
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name


def pixels(buf: bytes) -> np.ndarray:
    image = ImageOps.exif_transpose(Image.open(io.BytesIO(buf))).convert("RGB")
    width, height = image.size
    if not width or not height:
        raise ValueError("image has no dimensions")
    scale = 440 / min(width, height)
    resized = image.resize((max(384, round(width * scale)), max(384, round(height * scale))), Image.Resampling.BICUBIC)
    left = (resized.width - 384) // 2
    top = (resized.height - 384) // 2
    crop = resized.crop((left, top, left + 384, top + 384))
    arr = np.asarray(crop, dtype=np.float32) / 255.0
    arr = (arr - MEAN) / STD
    return np.transpose(arr, (2, 0, 1))[None, ...]


def score(buf: bytes) -> float:
    logit = float(session.run([output_name], {input_name: pixels(buf)})[0].reshape(-1)[0])
    return 1.0 / (1.0 + np.exp(-logit))


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send(self, status: int, body: bytes, content_type: str = "application/json") -> None:
        self.send_response(status)
        self.send_header("content-type", content_type)
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path.split("?", 1)[0] == "/health":
            self._send(200, json.dumps({"ok": True, "model_version": MODEL_VERSION}).encode())
            return
        self._send(404, b"")

    def do_POST(self) -> None:
        if self.path.split("?", 1)[0] != "/analyze":
            self._send(404, b"")
            return
        if TOKEN and self.headers.get("authorization") != f"Bearer {TOKEN}":
            self._send(401, b"")
            return
        length = int(self.headers.get("content-length", "0"))
        if length <= 0 or length > MAX_BYTES:
            self._send(400, b"")
            return
        try:
            raw = score(self.rfile.read(length))
        except Exception as err:
            print(json.dumps({"msg": "detect_failed", "error": str(err)[:200]}), flush=True)
            self._send(400, b"")
            return
        self._send(200, json.dumps({"raw_score": raw, "model_version": MODEL_VERSION}).encode())

    def log_message(self, fmt: str, *args) -> None:
        return


class Server(ThreadingHTTPServer):
    address_family = socket.AF_INET6
    daemon_threads = True

    def server_bind(self) -> None:
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


if __name__ == "__main__":
    print(json.dumps({"msg": "detector_listen", "port": PORT, "input": input_name}), flush=True)
    Server(("::", PORT), Handler).serve_forever()
