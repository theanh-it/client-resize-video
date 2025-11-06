/**
 * Fast video resize using FFmpeg.wasm
 * This is MUCH faster than MediaRecorder approach but requires FFmpeg dependency
 */

import type { MimeType, OutputType } from "./index";

// Dynamic import to avoid issues when ffmpeg is not installed
let FFmpeg: any = null;
let fetchFile: any = null;
let toBlobURL: any = null;

/**
 * Load FFmpeg dependencies dynamically
 */
const loadFFmpegDependencies = async () => {
  if (FFmpeg && fetchFile && toBlobURL) {
    return { FFmpeg, fetchFile, toBlobURL };
  }

  try {
    const ffmpegModule = await import("@ffmpeg/ffmpeg");
    const utilModule = await import("@ffmpeg/util");

    FFmpeg = ffmpegModule.FFmpeg;
    fetchFile = utilModule.fetchFile;
    toBlobURL = utilModule.toBlobURL;

    return { FFmpeg, fetchFile, toBlobURL };
  } catch (error) {
    throw new Error(
      "FFmpeg.wasm not found. Please install: npm install @ffmpeg/ffmpeg @ffmpeg/util"
    );
  }
};

/**
 * Initialize FFmpeg instance
 */
let ffmpegInstance: any = null;
let isFFmpegLoaded = false;

const getFFmpeg = async (onProgress?: (progress: number) => void) => {
  const { FFmpeg, toBlobURL } = await loadFFmpegDependencies();

  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();

    // Setup progress handler
    if (onProgress) {
      ffmpegInstance.on("progress", ({ progress }: any) => {
        onProgress(Math.round(progress * 100));
      });
    }

    // Setup log handler
    ffmpegInstance.on("log", ({ message }: any) => {
      console.log("[FFmpeg]", message);
    });
  }

  if (!isFFmpegLoaded) {
    console.log("⏳ Loading FFmpeg.wasm (~31MB)...");
    console.log("⏳ This may take 10-30 seconds depending on your connection...");

    try {
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
      
      console.log("📥 Downloading ffmpeg-core.js...");
      const coreURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        "text/javascript"
      );
      console.log("✅ ffmpeg-core.js downloaded");
      
      console.log("📥 Downloading ffmpeg-core.wasm (~31MB)...");
      const wasmURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      );
      console.log("✅ ffmpeg-core.wasm downloaded");
      
      console.log("🔧 Loading FFmpeg into memory...");
      await ffmpegInstance.load({
        coreURL,
        wasmURL,
      });

      isFFmpegLoaded = true;
      console.log("✅ FFmpeg.wasm loaded successfully!");
    } catch (error) {
      console.error("❌ Failed to load FFmpeg.wasm:", error);
      throw new Error(
        "Không thể tải FFmpeg.wasm. Vui lòng kiểm tra kết nối mạng và thử lại. Error: " + error
      );
    }
  }

  return ffmpegInstance;
};

const blobToFile = (blob: Blob, filename: string, mimeType: string) => {
  return new File([blob], filename, { type: mimeType });
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export type FastResizeOptions = {
  width?: number;
  height?: number;
  videoBitrate?: number; // in bps, default: 2.5Mbps
  audioBitrate?: number; // in bps, default: 128kbps
  format?: "mp4" | "webm"; // output format, default: mp4
  preset?: "ultrafast" | "superfast" | "fast" | "medium"; // encoding speed, default: "fast"
  output?: OutputType;
  onProgress?: (progress: number) => void;
};

/**
 * Fast resize video using FFmpeg.wasm
 * This is MUCH faster than MediaRecorder - typically 2-5x faster
 * Works by processing video without real-time playback
 */
export const fastResizeVideo = async (
  file: File,
  options?: FastResizeOptions
): Promise<File | Blob | string> => {
  console.log("=".repeat(60));
  console.log("⚡ Fast resize starting:", file.name);
  console.log("📦 File size:", (file.size / 1024 / 1024).toFixed(2), "MB");
  console.log("=".repeat(60));

  const { fetchFile } = await loadFFmpegDependencies();
  const ffmpeg = await getFFmpeg(options?.onProgress);

  // Write input file
  const inputName = "input.mp4";
  console.log("📝 Writing input file to FFmpeg...");
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Build FFmpeg command
  const format = options?.format || "mp4";
  const outputName = `output.${format}`;
  const videoBitrate = options?.videoBitrate
    ? `${Math.round(options.videoBitrate / 1000)}k`
    : "2500k";
  const audioBitrate = options?.audioBitrate
    ? `${Math.round(options.audioBitrate / 1000)}k`
    : "128k";

  const ffmpegArgs = ["-i", inputName];

  // Add codec based on format
  if (format === "mp4") {
    ffmpegArgs.push("-c:v", "libx264", "-c:a", "aac");
  } else {
    ffmpegArgs.push("-c:v", "libvpx-vp9", "-c:a", "libopus");
  }

  ffmpegArgs.push("-b:v", videoBitrate, "-b:a", audioBitrate);

  // Add resize if specified
  if (options?.width || options?.height) {
    let scale = "";
    if (options.width && options.height) {
      scale = `${options.width}:${options.height}`;
    } else if (options.width) {
      scale = `${options.width}:-2`;
    } else if (options.height) {
      scale = `-2:${options.height}`;
    }
    ffmpegArgs.push("-vf", `scale=${scale}`);
  }

  ffmpegArgs.push(outputName);

  console.log("🎬 FFmpeg command:", ffmpegArgs.join(" "));

  // Execute FFmpeg
  console.log("⚙️ Processing video with FFmpeg...");
  await ffmpeg.exec(ffmpegArgs);

  console.log("✅ FFmpeg processing completed");

  // Read output file
  const data = await ffmpeg.readFile(outputName);
  const mimeType =
    format === "mp4" ? "video/mp4" : "video/webm";

  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  // Create blob
  const blob = new Blob([data], { type: mimeType });
  console.log(`✅ Resize completed. Size: ${blob.size} bytes`);

  // Return result based on output type
  const output = options?.output || "file";
  switch (output) {
    case "file":
      const extension = format;
      const filename = `video-${Date.now()}.${extension}`;
      return blobToFile(blob, filename, mimeType);
    case "base64":
      return await blobToBase64(blob);
    case "blob":
      return blob;
    default:
      return blobToFile(blob, `video-${Date.now()}.${format}`, mimeType);
  }
};

/**
 * Fast resize multiple videos
 */
export const fastResizeVideos = async (
  files: File[],
  options?: FastResizeOptions
): Promise<(File | Blob | string)[]> => {
  const results: (File | Blob | string)[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`Processing video ${i + 1}/${files.length}: ${file.name}`);

    const result = await fastResizeVideo(file, {
      ...options,
      onProgress: (progress) => {
        if (options?.onProgress) {
          const totalProgress = ((i + progress / 100) / files.length) * 100;
          options.onProgress(Math.round(totalProgress));
        }
      },
    });

    results.push(result);
  }

  return results;
};

