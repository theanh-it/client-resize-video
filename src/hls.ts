/**
 * HLS/m3u8 video processing using FFmpeg.wasm
 * This module requires @ffmpeg/ffmpeg and @ffmpeg/util to be installed
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
    console.log("Loading FFmpeg.wasm...");

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    await ffmpegInstance.load({
      coreURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        "text/javascript"
      ),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });

    isFFmpegLoaded = true;
    console.log("FFmpeg.wasm loaded successfully");
  }

  return ffmpegInstance;
};

export type HLSOptions = {
  width?: number;
  height?: number;
  videoBitrate?: number; // in bps
  audioBitrate?: number; // in bps
  segmentDuration?: number; // in seconds, default: 10
  onProgress?: (progress: number) => void;
};

export type HLSOutput = {
  playlist: File; // m3u8 file
  segments: File[]; // ts files
  playlistBlob: Blob;
  playlistContent: string;
};

/**
 * Convert and resize video to HLS format using FFmpeg.wasm
 */
export const resizeVideoToHLS = async (
  file: File,
  options?: HLSOptions
): Promise<HLSOutput> => {
  console.log("Starting HLS conversion:", file.name);

  const { fetchFile } = await loadFFmpegDependencies();
  const ffmpeg = await getFFmpeg(options?.onProgress);

  // Write input file
  const inputName = "input.mp4";
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Build FFmpeg command
  const outputName = "output.m3u8";
  const segmentDuration = options?.segmentDuration || 10;
  const videoBitrate = options?.videoBitrate
    ? `${Math.round(options.videoBitrate / 1000)}k`
    : "2500k";
  const audioBitrate = options?.audioBitrate
    ? `${Math.round(options.audioBitrate / 1000)}k`
    : "128k";

  const ffmpegArgs = [
    "-i",
    inputName,
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-b:v",
    videoBitrate,
    "-b:a",
    audioBitrate,
  ];

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

  // HLS options
  ffmpegArgs.push(
    "-f",
    "hls",
    "-hls_time",
    segmentDuration.toString(),
    "-hls_playlist_type",
    "vod",
    "-hls_segment_filename",
    "segment_%03d.ts",
    outputName
  );

  console.log("FFmpeg command:", ffmpegArgs.join(" "));

  // Execute FFmpeg
  await ffmpeg.exec(ffmpegArgs);

  console.log("HLS conversion completed, reading output files...");

  // Read output files
  const playlistData = await ffmpeg.readFile(outputName);
  const playlistContent = new TextDecoder().decode(playlistData);

  // Parse segment filenames from playlist
  const segmentMatches = playlistContent.matchAll(/segment_\d+\.ts/g);
  const segmentNames = Array.from(new Set(Array.from(segmentMatches, (m) => m[0])));

  console.log(`Found ${segmentNames.length} segments`);

  // Read all segments
  const segments: File[] = [];
  for (const segmentName of segmentNames) {
    const segmentData = await ffmpeg.readFile(segmentName);
    const segmentFile = new File(
      [segmentData],
      segmentName,
      { type: "video/mp2t" }
    );
    segments.push(segmentFile);
  }

  // Create playlist file
  const playlistBlob = new Blob([playlistData], {
    type: "application/vnd.apple.mpegurl",
  });
  const playlistFile = new File([playlistBlob], "playlist.m3u8", {
    type: "application/vnd.apple.mpegurl",
  });

  // Cleanup
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  for (const segmentName of segmentNames) {
    await ffmpeg.deleteFile(segmentName);
  }

  console.log("HLS output ready");

  return {
    playlist: playlistFile,
    segments,
    playlistBlob,
    playlistContent,
  };
};

/**
 * Batch convert multiple videos to HLS
 */
export const resizeVideosToHLS = async (
  files: File[],
  options?: HLSOptions
): Promise<HLSOutput[]> => {
  const results: HLSOutput[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`Processing video ${i + 1}/${files.length}: ${file.name}`);

    const result = await resizeVideoToHLS(file, {
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

/**
 * Create a playable URL from HLS output for testing
 * Note: This creates a single Blob URL for the playlist, 
 * but segments won't be accessible. For full playback, 
 * serve files from a server or use a custom HLS player.
 */
export const createHLSBlobURL = (hlsOutput: HLSOutput): string => {
  return URL.createObjectURL(hlsOutput.playlistBlob);
};

/**
 * Download HLS output as a zip file (requires JSZip)
 * This is a helper to package all HLS files together
 */
export const downloadHLSAsZip = async (
  hlsOutput: HLSOutput,
  filename: string = "video-hls"
): Promise<void> => {
  // Check if JSZip is available
  if (typeof (window as any).JSZip === "undefined") {
    throw new Error(
      "JSZip is required for downloading HLS as zip. Include: <script src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'></script>"
    );
  }

  const JSZip = (window as any).JSZip;
  const zip = new JSZip();

  // Add playlist
  zip.file("playlist.m3u8", hlsOutput.playlistBlob);

  // Add segments
  for (const segment of hlsOutput.segments) {
    zip.file(segment.name, segment);
  }

  // Generate zip
  const blob = await zip.generateAsync({ type: "blob" });

  // Download
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};

