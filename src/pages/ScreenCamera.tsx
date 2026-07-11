import { useCallback, useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Camera,
  Circle,
  Square,
  ImageDown,
  Play,
  StopCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ScreenCamera = () => {
  const { toast } = useToast();

  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [screenOn, setScreenOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);

  const CANVAS_W = 1280;
  const CANVAS_H = 1440; // top half = screen (16:9), bottom half = camera
  const TOP_H = 720;

  // ---- Composite drawing loop: screen on top, camera on bottom ----
  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      rafRef.current = requestAnimationFrame(drawLoop);
      return;
    }

    ctx.fillStyle = "#0b0b0f";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const drawCover = (
      video: HTMLVideoElement | null,
      dx: number,
      dy: number,
      dw: number,
      dh: number
    ) => {
      if (!video || video.readyState < 2 || !video.videoWidth) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const scale = Math.max(dw / vw, dh / vh);
      const sw = dw / scale;
      const sh = dh / scale;
      const sx = (vw - sw) / 2;
      const sy = (vh - sh) / 2;
      ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
    };

    drawCover(screenVideoRef.current, 0, 0, CANVAS_W, TOP_H);
    drawCover(cameraVideoRef.current, 0, TOP_H, CANVAS_W, CANVAS_H - TOP_H);

    // divider line
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, TOP_H);
    ctx.lineTo(CANVAS_W, TOP_H);
    ctx.stroke();

    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawLoop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawLoop]);

  // ---- Start / stop screen ----
  const startScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
      screenStreamRef.current = stream;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        await screenVideoRef.current.play().catch(() => {});
      }
      // Stop when the user ends sharing from the browser UI
      stream.getVideoTracks()[0].addEventListener("ended", () => stopScreen());
      setScreenOn(true);
    } catch (err) {
      toast({
        title: "Screen capture blocked",
        description:
          "Could not start screen sharing. Please allow permission and try again.",
        variant: "destructive",
      });
    }
  };

  const stopScreen = () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    setScreenOn(false);
  };

  // ---- Start / stop camera ----
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: true,
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
    } catch (err) {
      toast({
        title: "Camera blocked",
        description:
          "Could not access the camera. Please allow permission and try again.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    setCameraOn(false);
  };

  // ---- Snapshot (combined PNG) ----
  const takeSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `capture-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Snapshot saved", description: "Combined image downloaded." });
    }, "image/png");
  };

  // ---- Record (combined WebM) ----
  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!screenOn && !cameraOn) {
      toast({
        title: "Nothing to record",
        description: "Start the screen or camera first.",
        variant: "destructive",
      });
      return;
    }

    const canvasStream = canvas.captureStream(30);
    // Mix in camera audio if available
    const audioTracks = cameraStreamRef.current?.getAudioTracks() ?? [];
    audioTracks.forEach((track) => canvasStream.addTrack(track));

    const mimeCandidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    const mimeType =
      mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";

    try {
      const recorder = new MediaRecorder(
        canvasStream,
        mimeType ? { mimeType } : undefined
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Recording saved", description: "Video downloaded." });
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      toast({
        title: "Recording failed",
        description: "Your browser could not start the recorder.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      stopScreen();
      stopCamera();
      recorderRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <section className="py-14 bg-gradient-hero">
        <div className="container-wide text-center text-primary-foreground">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Screen &amp; Camera Capture
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Capture your laptop screen on top and your camera on the bottom.
            Preview live, take a snapshot, or record it all as one video —
            everything stays in your browser.
          </p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container-tight">
          {/* Live preview: screen top, camera bottom */}
          <div className="rounded-xl overflow-hidden border border-border shadow-lg bg-black">
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <video
                ref={screenVideoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              {!screenOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 gap-2">
                  <Monitor size={40} />
                  <span className="text-sm">Screen preview (top)</span>
                </div>
              )}
              <span className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-medium text-white bg-black/50 px-2.5 py-1 rounded-full">
                <Monitor size={14} /> Screen
              </span>
            </div>

            <div className="relative aspect-video bg-neutral-900 flex items-center justify-center border-t border-white/10">
              <video
                ref={cameraVideoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              {!cameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 gap-2">
                  <Camera size={40} />
                  <span className="text-sm">Camera preview (bottom)</span>
                </div>
              )}
              <span className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-medium text-white bg-black/50 px-2.5 py-1 rounded-full">
                <Camera size={14} /> Camera
              </span>
              {recording && (
                <span className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-medium text-white bg-red-600 px-2.5 py-1 rounded-full animate-pulse">
                  <Circle size={10} className="fill-current" /> REC
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {!screenOn ? (
              <Button onClick={startScreen} className="bg-primary">
                <Monitor className="mr-2" size={16} /> Start Screen
              </Button>
            ) : (
              <Button onClick={stopScreen} variant="outline">
                <Square className="mr-2" size={16} /> Stop Screen
              </Button>
            )}

            {!cameraOn ? (
              <Button onClick={startCamera} className="bg-primary">
                <Camera className="mr-2" size={16} /> Start Camera
              </Button>
            ) : (
              <Button onClick={stopCamera} variant="outline">
                <Square className="mr-2" size={16} /> Stop Camera
              </Button>
            )}

            <Button
              onClick={takeSnapshot}
              variant="secondary"
              disabled={!screenOn && !cameraOn}
            >
              <ImageDown className="mr-2" size={16} /> Snapshot
            </Button>

            {!recording ? (
              <Button
                onClick={startRecording}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={!screenOn && !cameraOn}
              >
                <Play className="mr-2" size={16} /> Record
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive">
                <StopCircle className="mr-2" size={16} /> Stop &amp; Save
              </Button>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground max-w-xl mx-auto">
            Tip: Click <strong>Start Screen</strong> and pick the window or
            entire screen you want to share, then <strong>Start Camera</strong>.
            Snapshots and recordings combine both into a single file and download
            to your device.
          </p>

          {/* Hidden compositing canvas */}
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="hidden"
          />
        </div>
      </section>
    </Layout>
  );
};

export default ScreenCamera;
