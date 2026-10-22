"use client";

import { useEffect, useRef, useState } from "react";

type LinkState = {
  prompt: string | null;
  address: string | null;
  status: string;
  expires_at: string;
};

const MAX_EDGE = 1600;

function fitFrame(video: HTMLVideoElement) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

export function CaptureCamera({ token }: { token: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [link, setLink] = useState<LinkState | null>(null);
  const [missing, setMissing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [shot, setShot] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/capture-links/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!active) return;
        if (res.status === 404) {
          setMissing(true);
          return;
        }
        setLink(await res.json());
      })
      .catch(() => {
        if (active) setMissing(true);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!link || (link.status !== "open" && link.status !== "capturing")) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This link needs a camera. Open it on a phone.");
      return;
    }
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((next) => {
        stream = next;
        streamRef.current = next;
        if (videoRef.current) {
          videoRef.current.srcObject = next;
          void videoRef.current.play();
        }
      })
      .catch(() => setCameraError("This link needs a camera. Open it on a phone."));
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [link]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const take = async () => {
    const video = videoRef.current;
    if (!video) return;
    const blob = await fitFrame(video);
    if (!blob) {
      setError("The photo could not be taken. Try again.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setShot(blob);
    setPreviewUrl(URL.createObjectURL(blob));
    setError(null);
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setShot(null);
    setPreviewUrl(null);
    setError(null);
  };

  const send = async () => {
    if (!shot) return;
    setPending(true);
    setError(null);
    try {
      const session = await fetch(`/api/v1/capture-links/${encodeURIComponent(token)}/session`, { method: "POST" });
      const sessionBody = await session.json();
      if (!session.ok) {
        setError(sessionBody.error?.message ?? "This link can no longer be used.");
        if (sessionBody.status) setLink(sessionBody);
        return;
      }
      const body = new FormData();
      body.set("image", shot, "capture.jpg");
      body.set("nonce", sessionBody.nonce);
      body.set("camera_reported", "true");
      if (includeLocation && navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10_000 });
        }).catch(() => null);
        if (!position) {
          setError("Location was not available. Send the photo without it, or try again.");
          return;
        }
        body.set("latitude", String(position.coords.latitude));
        body.set("longitude", String(position.coords.longitude));
        body.set("accuracy_m", String(position.coords.accuracy));
      }
      const res = await fetch(`/api/v1/capture-links/${encodeURIComponent(token)}/frame`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error?.message ?? "The photo could not be sent. Try again.");
        return;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setDone(true);
    } catch {
      setError("The photo could not be sent. Try again.");
    } finally {
      setPending(false);
    }
  };

  if (missing) {
    return (
      <p role="alert">This link was not found.</p>
    );
  }
  if (!link) return <p>Loading…</p>;
  if (done) {
    return (
      <p role="status">Photo received. You can close this page.</p>
    );
  }
  if (link.status !== "open" && link.status !== "capturing") {
    const note =
      link.status === "expired"
        ? "This link has expired."
        : link.status === "completed"
          ? "This link has already been used."
          : "This link can no longer be used.";
    return <p role="status">{note}</p>;
  }

  return (
    <div>
      <p>{link.prompt}</p>
      {link.address ? <p>{link.address}</p> : null}
      <p>Take the photo in this browser. Uploads from your gallery are not part of this link.</p>
      {cameraError ? (
        <p role="alert">{cameraError}</p>
      ) : shot && previewUrl ? (
        <div className="capture-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Photo ready to send" />
        </div>
      ) : (
        <div className="capture-stage">
          <video ref={videoRef} playsInline muted autoPlay />
        </div>
      )}
      {error ? <p role="alert">{error}</p> : null}
      <p className="intake-actions">
        {shot ? (
          <>
            <button className="btn" type="button" onClick={retake} disabled={pending}>
              Retake
            </button>
            <button className="btn" type="button" onClick={() => void send()} disabled={pending}>
              {pending ? "Sending" : "Send photo"}
            </button>
          </>
        ) : (
          <button className="btn" type="button" onClick={() => void take()} disabled={Boolean(cameraError)}>
            Take photo
          </button>
        )}
      </p>
      {shot ? (
        <label>
          <input
            type="checkbox"
            checked={includeLocation}
            onChange={(e) => setIncludeLocation(e.target.checked)}
          />{" "}
          Include this device&apos;s location
        </label>
      ) : null}
    </div>
  );
}
