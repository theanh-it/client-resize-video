export type OutputType = "file" | "base64" | "blob";

export const OUTPUT_TYPE: Record<OutputType, OutputType> = {
  file: "file",
  blob: "blob",
  base64: "base64",
};

export type MimeType = {
  mimeType: string;
  extension: string;
};

export const MIME_TYPE: Record<string, MimeType> = {
  mp4: {
    mimeType: "video/mp4",
    extension: "mp4",
  },
  webm: {
    mimeType: "video/webm",
    extension: "webm",
  },
  webm_vp9: {
    mimeType: "video/webm;codecs=vp9,opus",
    extension: "webm",
  },
  webm_vp8: {
    mimeType: "video/webm;codecs=vp8,opus",
    extension: "webm",
  },
  mkv: {
    mimeType: "video/x-matroska;codecs=avc1",
    extension: "mkv",
  },
  m3u8: {
    mimeType: "application/vnd.apple.mpegurl",
    extension: "m3u8",
  },
};

export type ResizeMode = "cover" | "contain" | "stretch";

/**
 * Calculate dimensions based on resize mode
 */
const calculateDimensions = (
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  mode: ResizeMode
): {
  canvasWidth: number;
  canvasHeight: number;
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
} => {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  if (mode === "stretch") {
    return {
      canvasWidth: targetWidth,
      canvasHeight: targetHeight,
      drawX: 0,
      drawY: 0,
      drawWidth: targetWidth,
      drawHeight: targetHeight,
    };
  }

  if (mode === "cover") {
    // Fill entire target area, crop if needed
    let drawWidth, drawHeight, drawX, drawY;

    if (sourceRatio > targetRatio) {
      // Source is wider, fit by height
      drawHeight = targetHeight;
      drawWidth = targetHeight * sourceRatio;
      drawX = (targetWidth - drawWidth) / 2;
      drawY = 0;
    } else {
      // Source is taller, fit by width
      drawWidth = targetWidth;
      drawHeight = targetWidth / sourceRatio;
      drawX = 0;
      drawY = (targetHeight - drawHeight) / 2;
    }

    return {
      canvasWidth: targetWidth,
      canvasHeight: targetHeight,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    };
  }

  // mode === "contain" - fit inside target area, maintain aspect ratio
  let canvasWidth, canvasHeight;

  if (sourceRatio > targetRatio) {
    // Source is wider, fit by width
    canvasWidth = targetWidth;
    canvasHeight = targetWidth / sourceRatio;
  } else {
    // Source is taller, fit by height
    canvasHeight = targetHeight;
    canvasWidth = targetHeight * sourceRatio;
  }

  return {
    canvasWidth,
    canvasHeight,
    drawX: 0,
    drawY: 0,
    drawWidth: canvasWidth,
    drawHeight: canvasHeight,
  };
};

/**
 * Check if a MIME type is supported by the browser's MediaRecorder
 */
export const isMimeTypeSupported = (mimeType: string): boolean => {
  return MediaRecorder.isTypeSupported(mimeType);
};

/**
 * Get best supported MIME type for video recording
 */
const getSupportedMimeType = (preferredMimeType?: MimeType): string => {
  const mimeTypes = [
    preferredMimeType?.mimeType,
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ].filter(Boolean) as string[];

  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      console.log("Using MIME type:", mimeType);
      return mimeType;
    }
  }

  throw new Error("No supported video MIME type found");
};

/**
 * Convert blob to File
 */
const blobToFile = (blob: Blob, mimeType: MimeType) => {
  const prefix = new Date().getTime();
  const suffix = Math.random().toString(36).slice(2);

  return new File([blob], `video-${prefix}-${suffix}.${mimeType.extension}`, {
    type: mimeType.mimeType,
  });
};

/**
 * Convert blob to Base64
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Load video file and get video element
 */
const loadVideo = (file: File): Promise<HTMLVideoElement> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "auto"; // Changed from "metadata" to "auto"
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // DON'T revoke URL - video needs it to load data during playback
      // Store objectUrl to revoke later
      (video as any).__objectUrl = objectUrl;

      resolve(video);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load video"));
    };

    video.src = objectUrl;
  });
};

export type ResizeVideoOptions = {
  width?: number;
  height?: number;
  mode?: ResizeMode;
  mimeType?: MimeType;
  videoBitrate?: number; // in bps, default: 2.5Mbps
  audioBitrate?: number; // in bps, default: 128kbps
  fps?: number; // frames per second, default: 30
  playbackSpeed?: number; // playback speed for processing, default: 2.0
  output?: OutputType;
  onProgress?: (progress: number) => void;
};

/**
 * Resize a single video
 */
export const resizeVideo = async (
  file: File,
  options?: ResizeVideoOptions
): Promise<File | Blob | string> => {
  console.log("Starting video resize:", file.name);

  // Load video
  const video = await loadVideo(file);
  console.log(
    `Video loaded: ${video.videoWidth}x${video.videoHeight}, duration: ${video.duration}s`
  );

  // Calculate target dimensions
  let targetWidth = options?.width || video.videoWidth;
  let targetHeight = options?.height || video.videoHeight;

  // If only width or height is specified, calculate the other to maintain aspect ratio
  if (options?.width && !options?.height) {
    const ratio = video.videoHeight / video.videoWidth;
    targetHeight = Math.round(options.width * ratio);
  } else if (options?.height && !options?.width) {
    const ratio = video.videoWidth / video.videoHeight;
    targetWidth = Math.round(options.height * ratio);
  }

  const mode = options?.mode || "contain";
  const dimensions = calculateDimensions(
    video.videoWidth,
    video.videoHeight,
    targetWidth,
    targetHeight,
    mode
  );

  console.log("Target dimensions:", dimensions);

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.canvasWidth;
  canvas.height = dimensions.canvasHeight;
  const ctx = canvas.getContext("2d", { alpha: false })!;

  // Get canvas stream
  const fps = options?.fps || 30;
  const stream = canvas.captureStream(fps);

  // Add audio track from original video if available
  try {
    // Create temporary audio context to get audio stream
    const audioContext = new AudioContext();
    const sourceElement = document.createElement("video");
    sourceElement.src = URL.createObjectURL(file);
    sourceElement.muted = false;
    await sourceElement.play();

    const source = audioContext.createMediaElementSource(sourceElement);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);

    const audioTracks = destination.stream.getAudioTracks();
    if (audioTracks.length > 0) {
      stream.addTrack(audioTracks[0]);
      console.log("Audio track added");
    }

    sourceElement.pause();
    sourceElement.src = "";
  } catch (error) {
    console.log("No audio track or failed to add audio:", error);
  }

  // Setup MediaRecorder
  const mimeType = options?.mimeType || MIME_TYPE.webm;
  const supportedMimeType = getSupportedMimeType(mimeType);
  const videoBitrate = options?.videoBitrate || 2500000; // 2.5 Mbps
  const audioBitrate = options?.audioBitrate || 128000; // 128 kbps

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: supportedMimeType,
    videoBitsPerSecond: videoBitrate,
    audioBitsPerSecond: audioBitrate,
  });

  const chunks: Blob[] = [];

  // Collect recorded chunks
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  // Start recording
  return new Promise((resolve, reject) => {
    mediaRecorder.onstart = async () => {
      console.log("Recording started");

      try {
        video.currentTime = 0;

        // Set playback speed for faster processing
        const playbackSpeed = options?.playbackSpeed || 2.0;
        video.playbackRate = playbackSpeed;

        // Try to play video
        console.log(
          "Attempting to play video at",
          playbackSpeed + "x speed..."
        );
        const playPromise = video.play();

        if (playPromise !== undefined) {
          await playPromise;
          console.log("Video playing successfully");
        }

        let lastTime = 0;
        const duration = video.duration;
        let frameCount = 0;

        // Draw frames
        const drawFrame = () => {
          const currentTime = video.currentTime;

          // Check if video is finished (within 0.1s of duration)
          if (currentTime >= duration - 0.1 || video.ended || video.paused) {
            if (currentTime >= duration - 0.1) {
              console.log("Video reached end, stopping MediaRecorder");
              mediaRecorder.stop();
              return;
            }

            if (video.paused || video.ended) {
              console.log(
                "Video stopped - paused:",
                video.paused,
                "ended:",
                video.ended
              );
              return;
            }
          }

          frameCount++;
          if (frameCount % 30 === 0) {
            console.log(
              "Drawing frame",
              frameCount,
              "at time",
              video.currentTime
            );
          }

          // Clear canvas
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw video frame
          ctx.drawImage(
            video,
            dimensions.drawX,
            dimensions.drawY,
            dimensions.drawWidth,
            dimensions.drawHeight
          );

          // Report progress
          if (options?.onProgress && duration > 0) {
            if (
              currentTime - lastTime > 0.05 ||
              currentTime >= duration - 0.1
            ) {
              const progress = Math.min((currentTime / duration) * 100, 100);
              options.onProgress(Math.round(progress));
              lastTime = currentTime;
            }
          }

          requestAnimationFrame(drawFrame);
        };

        // Wait a bit for video to start playing
        setTimeout(() => {
          console.log("Starting frame drawing loop");
          drawFrame();
        }, 100);
      } catch (error) {
        console.error("Error during video processing:", error);
        mediaRecorder.stop();
        reject(error);
      }
    };

    mediaRecorder.onstop = async () => {
      console.log("Recording stopped");

      try {
        // Create final blob
        const blob = new Blob(chunks, { type: supportedMimeType });
        console.log(`Resize completed. Size: ${blob.size} bytes`);

        // Cleanup
        video.pause();

        // Revoke object URL now that we're done
        const objectUrl = (video as any).__objectUrl;
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }

        video.src = "";
        stream.getTracks().forEach((track) => track.stop());

        // Final progress update
        if (options?.onProgress) {
          options.onProgress(100);
        }

        // Return result based on output type
        const output = options?.output || OUTPUT_TYPE.file;
        switch (output) {
          case OUTPUT_TYPE.file:
            resolve(blobToFile(blob, mimeType));
            break;
          case OUTPUT_TYPE.base64:
            resolve(await blobToBase64(blob));
            break;
          case OUTPUT_TYPE.blob:
            resolve(blob);
            break;
        }
      } catch (error) {
        reject(error);
      }
    };

    mediaRecorder.onerror = (event: any) => {
      console.error("MediaRecorder error:", event.error);
      reject(event.error);
    };

    // When video ends, stop recording
    video.onended = () => {
      console.log("Video playback ended");
      mediaRecorder.stop();
    };

    // Start recording
    console.log("Starting MediaRecorder...");
    try {
      mediaRecorder.start();
      console.log("MediaRecorder started successfully");
    } catch (error) {
      console.error("Failed to start MediaRecorder:", error);
      reject(error);
    }
  });
};

/**
 * Resize multiple videos
 */
export const resizeVideos = async (
  files: File[],
  options?: ResizeVideoOptions
): Promise<(File | Blob | string)[]> => {
  const results: (File | Blob | string)[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`Processing video ${i + 1}/${files.length}: ${file.name}`);

    const result = await resizeVideo(file, {
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

// Export HLS functions (requires @ffmpeg/ffmpeg to be installed)
export {
  resizeVideoToHLS,
  resizeVideosToHLS,
  resizeVideoToMultiQualityHLS,
  createHLSBlobURL,
  downloadHLSAsZip,
  downloadMultiQualityHLSAsZip,
  HLS_QUALITY_PRESETS,
  type HLSOptions,
  type HLSOutput,
  type QualityLevel,
  type MultiQualityHLSOutput,
} from "./hls";

// Export fast resize functions (requires @ffmpeg/ffmpeg to be installed)
export {
  fastResizeVideo,
  fastResizeVideos,
  type FastResizeOptions,
} from "./ffmpeg-resize";

// Export helper functions
export {
  getVideoMetadata,
  recommendResizeMethod,
  smartResize,
  type ResizeMethodRecommendation,
} from "./helper";
