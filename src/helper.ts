/**
 * Helper functions to choose the best resize method
 */

/**
 * Get video metadata without processing
 */
export const getVideoMetadata = (file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  size: number;
}> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";
    video.muted = true;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        size: file.size,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load video metadata"));
    };

    video.src = objectUrl;
  });
};

export type ResizeMethodRecommendation = {
  method: "resizeVideo" | "fastResizeVideo" | "resizeVideoToHLS";
  reason: string;
  estimatedTime: string;
  pros: string[];
  cons: string[];
};

/**
 * Recommend best resize method based on video properties
 */
export const recommendResizeMethod = async (
  file: File,
  needsHLS: boolean = false
): Promise<ResizeMethodRecommendation> => {
  console.log("=".repeat(60));
  console.log("🔍 Analyzing video to recommend best method...");
  console.log("=".repeat(60));

  const metadata = await getVideoMetadata(file);

  console.log("📊 Video metadata:");
  console.log(`  - File: ${file.name}`);
  console.log(`  - Duration: ${metadata.duration.toFixed(1)}s`);
  console.log(`  - Resolution: ${metadata.width}x${metadata.height}`);
  console.log(`  - Size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
  console.log("");

  // If needs HLS, recommend HLS method
  if (needsHLS) {
    console.log("🎞️ RECOMMENDATION: resizeVideoToHLS()");
    console.log("  Reason: User needs HLS/m3u8 streaming format");
    console.log(`  Estimated time: ~${Math.round(metadata.duration / 3)}-${Math.round(metadata.duration / 2)}s`);
    console.log("  ✅ Creates HLS playlist + segments");
    console.log("  ✅ Good for streaming/CDN");
    console.log("  ❌ Requires FFmpeg.wasm (+31MB)");
    console.log("=".repeat(60));

    return {
      method: "resizeVideoToHLS",
      reason: "HLS streaming format required",
      estimatedTime: `${Math.round(metadata.duration / 3)}-${Math.round(metadata.duration / 2)}s`,
      pros: ["HLS format", "Streaming ready", "Multiple quality levels"],
      cons: ["Requires FFmpeg", "Multiple output files"],
    };
  }

  // For short videos (< 30s), recommend Standard method
  if (metadata.duration < 30) {
    const estimatedTime = Math.round(metadata.duration / 2); // With 2x playbackSpeed

    console.log("📹 RECOMMENDATION: resizeVideo() - Standard method");
    console.log("  Reason: Short video (< 30s)");
    console.log(`  Estimated time: ~${estimatedTime}s (with 2x playbackSpeed)`);
    console.log("  ✅ No dependencies needed");
    console.log("  ✅ Package only 21KB");
    console.log("  ✅ Supports resize modes (cover, contain, stretch)");
    console.log("  💡 TIP: Use playbackSpeed=4 for max speed (~" + Math.round(metadata.duration / 4) + "s)");
    console.log("=".repeat(60));

    return {
      method: "resizeVideo",
      reason: `Short video (${metadata.duration.toFixed(1)}s < 30s)`,
      estimatedTime: `~${estimatedTime}s (2x speed) or ~${Math.round(metadata.duration / 4)}s (4x speed)`,
      pros: [
        "No FFmpeg needed",
        "Small package (21KB)",
        "Resize modes support",
        "Fast enough for short videos",
      ],
      cons: [
        "Slower for long videos",
        "Real-time processing",
      ],
    };
  }

  // For long videos (>= 30s), recommend Fast method
  const estimatedTime = Math.round(metadata.duration / 3);

  console.log("⚡ RECOMMENDATION: fastResizeVideo() - FFmpeg method");
  console.log(`  Reason: Long video (${metadata.duration.toFixed(1)}s >= 30s)`);
  console.log(`  Estimated time: ~${estimatedTime}s`);
  console.log("  ✅ 2-5x faster than Standard");
  console.log("  ✅ Very stable, won't get stuck");
  console.log("  ✅ Good quality with preset='fast'");
  console.log("  ❌ Requires FFmpeg.wasm (+31MB)");
  console.log("  💡 TIP: Use preset='ultrafast' for max speed (~" + Math.round(metadata.duration / 5) + "s)");
  console.log("=".repeat(60));

  return {
    method: "fastResizeVideo",
    reason: `Long video (${metadata.duration.toFixed(1)}s >= 30s) - Fast method is 2-5x faster`,
    estimatedTime: `~${estimatedTime}s (or ~${Math.round(metadata.duration / 5)}s with ultrafast preset)`,
    pros: [
      "2-5x faster than Standard",
      "Very stable",
      "No playback issues",
      "Good quality",
    ],
    cons: [
      "Requires FFmpeg (+31MB)",
      "No resize modes",
    ],
  };
};

/**
 * Smart resize - automatically choose best method
 */
export const smartResize = async (
  file: File,
  options?: {
    width?: number;
    height?: number;
    needsHLS?: boolean;
    onProgress?: (progress: number) => void;
  }
) => {
  const recommendation = await recommendResizeMethod(file, options?.needsHLS);

  console.log(`🎯 Using recommended method: ${recommendation.method}`);
  console.log(`   Estimated time: ${recommendation.estimatedTime}`);
  console.log("");

  // Dynamically import and use the recommended method
  if (recommendation.method === "fastResizeVideo") {
    const { fastResizeVideo } = await import("./ffmpeg-resize");
    return await fastResizeVideo(file, {
      width: options?.width,
      height: options?.height,
      format: "mp4",
      preset: "fast",
      onProgress: options?.onProgress,
    });
  } else if (recommendation.method === "resizeVideoToHLS") {
    const { resizeVideoToHLS } = await import("./hls");
    return await resizeVideoToHLS(file, {
      width: options?.width,
      height: options?.height,
      onProgress: options?.onProgress,
    });
  } else {
    const { resizeVideo } = await import("./index");
    return await resizeVideo(file, {
      width: options?.width,
      height: options?.height,
      playbackSpeed: 2.0,
      fps: 24,
      onProgress: options?.onProgress,
    });
  }
};

