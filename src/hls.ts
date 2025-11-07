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
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
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

export type QualityLevel = {
  name: string; // e.g., "360p", "480p", "720p", "1080p"
  width?: number;
  height?: number;
  videoBitrate: number; // in bps
  audioBitrate?: number; // in bps
};

export type MultiQualityHLSOutput = {
  masterPlaylist: File; // master m3u8 file
  masterPlaylistBlob: Blob;
  masterPlaylistContent: string;
  qualities: Array<{
    level: QualityLevel;
    playlist: File; // media m3u8 file
    segments: File[]; // ts files
    playlistContent: string;
  }>;
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
  const segmentNames = Array.from(
    new Set(Array.from(segmentMatches, (m) => m[0]))
  );

  console.log(`Found ${segmentNames.length} segments`);

  // Read all segments
  const segments: File[] = [];
  for (const segmentName of segmentNames) {
    const segmentData = await ffmpeg.readFile(segmentName);
    const segmentFile = new File([segmentData], segmentName, {
      type: "video/mp2t",
    });
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
 * Get video metadata (resolution, duration, etc.)
 */
const getVideoMetadata = (file: File): Promise<{
  width: number;
  height: number;
  duration: number;
}> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";
    video.muted = true;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load video metadata"));
    };

    video.src = objectUrl;
  });
};

/**
 * Filter quality levels to avoid upscaling
 * Only keep qualities that are equal or smaller than source video
 */
const filterQualityLevels = (
  qualityLevels: QualityLevel[],
  sourceWidth: number,
  sourceHeight: number
): QualityLevel[] => {
  const filtered = qualityLevels.filter((level) => {
    // If quality doesn't specify dimensions, keep it
    if (!level.width && !level.height) {
      return true;
    }

    // Check if quality is smaller or equal to source
    const targetWidth = level.width || sourceWidth;
    const targetHeight = level.height || sourceHeight;

    // Keep quality only if both dimensions are smaller or equal
    return targetWidth <= sourceWidth && targetHeight <= sourceHeight;
  });

  return filtered;
};

/**
 * Convert video to multiple quality levels for HLS Adaptive Bitrate Streaming
 * Creates a master playlist and multiple media playlists with different qualities
 */
export const resizeVideoToMultiQualityHLS = async (
  file: File,
  qualityLevels: QualityLevel[],
  options?: {
    segmentDuration?: number; // in seconds, default: 10
    onProgress?: (progress: number) => void;
    autoFilterQualities?: boolean; // default: true - automatically filter out qualities higher than source
    parallel?: boolean; // default: false - process qualities in parallel (uses more memory)
  }
): Promise<MultiQualityHLSOutput> => {
  console.log(
    `Starting multi-quality HLS conversion: ${file.name} with ${qualityLevels.length} qualities`
  );

  if (qualityLevels.length === 0) {
    throw new Error("At least one quality level must be specified");
  }

  // Get video metadata
  console.log("📊 Detecting video resolution...");
  const metadata = await getVideoMetadata(file);
  console.log(
    `✅ Source video: ${metadata.width}x${metadata.height} (${metadata.duration.toFixed(1)}s)`
  );

  // Filter quality levels to avoid upscaling (unless disabled)
  const autoFilter = options?.autoFilterQualities !== false; // default true
  let filteredQualityLevels = qualityLevels;

  if (autoFilter) {
    filteredQualityLevels = filterQualityLevels(
      qualityLevels,
      metadata.width,
      metadata.height
    );

    const removed = qualityLevels.length - filteredQualityLevels.length;
    if (removed > 0) {
      console.log(
        `⚠️ Filtered out ${removed} quality level(s) higher than source resolution`
      );
      console.log("Removed qualities:", 
        qualityLevels
          .filter(q => !filteredQualityLevels.includes(q))
          .map(q => `${q.name} (${q.width}x${q.height})`)
          .join(", ")
      );
    }

    if (filteredQualityLevels.length === 0) {
      throw new Error(
        `No suitable quality levels found for source resolution ${metadata.width}x${metadata.height}. ` +
        `All specified qualities are higher than the source.`
      );
    }

    console.log(
      `✅ Using ${filteredQualityLevels.length} quality level(s):`,
      filteredQualityLevels.map((q) => q.name).join(", ")
    );
  }

  const { fetchFile, toBlobURL } = await loadFFmpegDependencies();
  const segmentDuration = options?.segmentDuration || 10;
  const useParallel = options?.parallel === true;

  // Helper function to process a single quality
  const processQuality = async (
    level: QualityLevel,
    index: number,
    total: number,
    progressTracker?: {
      qualities: Map<number, number>;
      onUpdate: () => void;
    }
  ): Promise<MultiQualityHLSOutput["qualities"][0]> => {
    const startTime = Date.now();
    console.log(`🔵 [${level.name}] Starting processing (${index + 1}/${total})`);

    // Calculate progress range for this quality (each quality contributes equal share)
    const progressRange = 100 / total;

    // Create separate FFmpeg instance for parallel processing
    const { FFmpeg } = await loadFFmpegDependencies();
    const ffmpeg = new FFmpeg();

    // Setup progress tracking for this quality
    if (progressTracker) {
      let lastLoggedProgress = 0;
      ffmpeg.on("progress", ({ progress }: any) => {
        // progress is 0-1, calculate this quality's contribution to overall progress
        const qualityContribution = progress * progressRange;
        progressTracker.qualities.set(index, qualityContribution);
        progressTracker.onUpdate();
        
        // Log progress every 10% for this quality
        const currentPercent = Math.floor(progress * 100);
        if (currentPercent - lastLoggedProgress >= 10) {
          console.log(`  📊 [${level.name}] ${currentPercent}% (Contributing: ${qualityContribution.toFixed(1)}% to overall)`);
          lastLoggedProgress = currentPercent;
        }
      });
    }

    // Load FFmpeg for this instance
    console.log(`⏳ [${level.name}] Loading FFmpeg.wasm...`);
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });
      console.log(`✅ [${level.name}] FFmpeg loaded successfully`);
    } catch (error) {
      console.error(`❌ [${level.name}] Failed to load FFmpeg:`, error);
      throw error;
    }

    // Write input file
    const inputName = `input_${level.name}.mp4`;
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    const qualityPrefix = level.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const outputName = `playlist_${qualityPrefix}.m3u8`;
    const segmentPattern = `segment_${qualityPrefix}_%03d.ts`;

    const videoBitrate = `${Math.round(level.videoBitrate / 1000)}k`;
    const audioBitrate = level.audioBitrate
      ? `${Math.round(level.audioBitrate / 1000)}k`
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
    if (level.width || level.height) {
      let scale = "";
      if (level.width && level.height) {
        scale = `${level.width}:${level.height}`;
      } else if (level.width) {
        scale = `${level.width}:-2`;
      } else if (level.height) {
        scale = `-2:${level.height}`;
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
      segmentPattern,
      outputName
    );

    console.log(`FFmpeg command for ${level.name}:`, ffmpegArgs.join(" "));

    // Execute FFmpeg
    await ffmpeg.exec(ffmpegArgs);

    // Read output files
    const playlistData = await ffmpeg.readFile(outputName);
    const playlistContent = new TextDecoder().decode(playlistData);

    // Parse segment filenames
    const segmentMatches = playlistContent.matchAll(
      new RegExp(`segment_${qualityPrefix}_\\d+\\.ts`, "g")
    );
    const segmentNames = Array.from(
      new Set(Array.from(segmentMatches, (m) => m[0]))
    );

    console.log(`✅ [${level.name}] Found ${segmentNames.length} segments`);

    // Read all segments
    const segments: File[] = [];
    for (const segmentName of segmentNames) {
      const segmentData = await ffmpeg.readFile(segmentName);
      const segmentFile = new File([segmentData], segmentName, {
        type: "video/mp2t",
      });
      segments.push(segmentFile);
    }

    // Create playlist file
    const playlistBlob = new Blob([playlistData], {
      type: "application/vnd.apple.mpegurl",
    });
    const playlistFile = new File(
      [playlistBlob],
      `${level.name}_playlist.m3u8`,
      {
        type: "application/vnd.apple.mpegurl",
      }
    );

    // Cleanup this FFmpeg instance
    try {
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
      for (const segmentName of segmentNames) {
        await ffmpeg.deleteFile(segmentName);
      }
    } catch (e) {
      console.warn(`⚠️ [${level.name}] Failed to cleanup:`, e);
    }

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ [${level.name}] Completed in ${elapsedTime}s`);

    return {
      level,
      playlist: playlistFile,
      segments,
      playlistContent,
    };
  };

  // Process qualities
  let qualities: MultiQualityHLSOutput["qualities"] = [];
  const processingStartTime = Date.now();

  // Setup progress tracker
  let lastReportedProgress = 0;
  const progressTracker = options?.onProgress
    ? {
        qualities: new Map<number, number>(),
        onUpdate: () => {
          // Calculate total progress from all qualities
          let totalProgress = 0;
          progressTracker.qualities.forEach((progress) => {
            totalProgress += progress;
          });
          
          const overallProgress = Math.min(Math.round(totalProgress), 100);
          if (options?.onProgress) {
            options.onProgress(overallProgress);
            
            // Log overall progress every 5%
            if (overallProgress - lastReportedProgress >= 5) {
              console.log(`🎯 Overall Progress: ${overallProgress}%`);
              lastReportedProgress = overallProgress;
            }
          }
        },
      }
    : undefined;

  if (useParallel) {
    console.log("🚀 Processing qualities in PARALLEL mode (faster but uses more memory)");
    console.log(`📊 Progress will be tracked across ${filteredQualityLevels.length} qualities simultaneously`);
    
    // Initialize progress for all qualities
    if (progressTracker) {
      filteredQualityLevels.forEach((_, index) => {
        progressTracker.qualities.set(index, 0);
      });
    }
    
    // Process all qualities in parallel with progress tracking
    const qualityPromises = filteredQualityLevels.map(async (level, index) => {
      const quality = await processQuality(
        level,
        index,
        filteredQualityLevels.length,
        progressTracker
      );
      
      // Mark this quality as 100% complete (contributes full range)
      if (progressTracker) {
        const progressRange = 100 / filteredQualityLevels.length;
        progressTracker.qualities.set(index, progressRange);
        progressTracker.onUpdate();
      }
      
      return quality;
    });

    qualities = await Promise.all(qualityPromises);
    
    const totalTime = ((Date.now() - processingStartTime) / 1000).toFixed(1);
    console.log(`🎉 All qualities processed in ${totalTime}s (PARALLEL mode)`);
  } else {
    console.log("⏱️ Processing qualities in SEQUENTIAL mode (slower but stable)");
    console.log(`📊 Each quality will use ${(100 / filteredQualityLevels.length).toFixed(1)}% of progress`);
    
    // Initialize progress for all qualities
    if (progressTracker) {
      filteredQualityLevels.forEach((_, index) => {
        progressTracker.qualities.set(index, 0);
      });
    }
    
    // Process one by one (sequential)
    for (let i = 0; i < filteredQualityLevels.length; i++) {
      const level = filteredQualityLevels[i];
      const quality = await processQuality(
        level,
        i,
        filteredQualityLevels.length,
        progressTracker
      );
      qualities.push(quality);

      // Mark this quality as 100% complete (contributes full range)
      if (progressTracker) {
        const progressRange = 100 / filteredQualityLevels.length;
        progressTracker.qualities.set(i, progressRange);
        progressTracker.onUpdate();
      }
    }
    
    const totalTime = ((Date.now() - processingStartTime) / 1000).toFixed(1);
    console.log(`🎉 All qualities processed in ${totalTime}s (SEQUENTIAL mode)`);
  }

  // Create master playlist
  let masterPlaylistContent = "#EXTM3U\n#EXT-X-VERSION:3\n\n";

  for (const quality of qualities) {
    const level = quality.level;
    const bandwidth = level.videoBitrate + (level.audioBitrate || 128000);

    // Add stream info
    let streamInfo = `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth}`;

    if (level.width && level.height) {
      streamInfo += `,RESOLUTION=${level.width}x${level.height}`;
    }

    streamInfo += `,NAME="${level.name}"`;
    masterPlaylistContent += `${streamInfo}\n`;

    // Add playlist reference
    const playlistRef = quality.playlist.name;
    masterPlaylistContent += `${playlistRef}\n\n`;
  }

  console.log("Master playlist content:\n", masterPlaylistContent);

  // Create master playlist file
  const masterPlaylistBlob = new Blob([masterPlaylistContent], {
    type: "application/vnd.apple.mpegurl",
  });
  const masterPlaylistFile = new File([masterPlaylistBlob], "master.m3u8", {
    type: "application/vnd.apple.mpegurl",
  });

  // Note: Each FFmpeg instance already cleaned up its own files
  console.log("✅ Multi-quality HLS output ready");

  return {
    masterPlaylist: masterPlaylistFile,
    masterPlaylistBlob,
    masterPlaylistContent,
    qualities,
  };
};

/**
 * Predefined quality presets for common use cases
 */
export const HLS_QUALITY_PRESETS = {
  // Mobile-friendly presets
  MOBILE: [
    {
      name: "360p",
      width: 640,
      height: 360,
      videoBitrate: 800000, // 800 kbps
      audioBitrate: 96000, // 96 kbps
    },
    {
      name: "480p",
      width: 854,
      height: 480,
      videoBitrate: 1400000, // 1.4 Mbps
      audioBitrate: 128000, // 128 kbps
    },
  ] as QualityLevel[],

  // Standard HD presets
  HD: [
    {
      name: "360p",
      width: 640,
      height: 360,
      videoBitrate: 800000,
      audioBitrate: 96000,
    },
    {
      name: "480p",
      width: 854,
      height: 480,
      videoBitrate: 1400000,
      audioBitrate: 128000,
    },
    {
      name: "720p",
      width: 1280,
      height: 720,
      videoBitrate: 2800000, // 2.8 Mbps
      audioBitrate: 128000,
    },
  ] as QualityLevel[],

  // Full quality presets
  FULL: [
    {
      name: "360p",
      width: 640,
      height: 360,
      videoBitrate: 800000,
      audioBitrate: 96000,
    },
    {
      name: "480p",
      width: 854,
      height: 480,
      videoBitrate: 1400000,
      audioBitrate: 128000,
    },
    {
      name: "720p",
      width: 1280,
      height: 720,
      videoBitrate: 2800000,
      audioBitrate: 128000,
    },
    {
      name: "1080p",
      width: 1920,
      height: 1080,
      videoBitrate: 5000000, // 5 Mbps
      audioBitrate: 192000, // 192 kbps
    },
  ] as QualityLevel[],
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

/**
 * Download multi-quality HLS output as a zip file (requires JSZip)
 */
export const downloadMultiQualityHLSAsZip = async (
  hlsOutput: MultiQualityHLSOutput,
  filename: string = "video-hls-multi"
): Promise<void> => {
  // Check if JSZip is available
  if (typeof (window as any).JSZip === "undefined") {
    throw new Error(
      "JSZip is required for downloading HLS as zip. Include: <script src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'></script>"
    );
  }

  const JSZip = (window as any).JSZip;
  const zip = new JSZip();

  // Add master playlist
  zip.file("master.m3u8", hlsOutput.masterPlaylistBlob);

  // Add each quality (organize in folders for easier structure)
  for (const quality of hlsOutput.qualities) {
    const qualityDir = quality.level.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");

    // Add playlist (rename to standard name in folder)
    zip.file(`${qualityDir}/playlist.m3u8`, quality.playlist);

    // Add segments (keep original names which include quality prefix)
    for (const segment of quality.segments) {
      zip.file(`${qualityDir}/${segment.name}`, segment);
    }
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
