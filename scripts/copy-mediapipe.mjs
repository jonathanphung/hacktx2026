// Copies MediaPipe's WebAssembly runtime into public/ so the app never depends on a CDN
// (hackathon Wi-Fi is unreliable). Runs automatically after `npm install`.
import { cpSync, existsSync } from "node:fs";

const src = "node_modules/@mediapipe/tasks-vision/wasm";
if (existsSync(src)) {
  cpSync(src, "public/mediapipe/wasm", { recursive: true });
}
