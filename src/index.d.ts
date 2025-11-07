export type OutputType = "file" | "base64" | "blob";

export const OUTPUT_TYPE: Record<OutputType, OutputType>;

export type MimeType = {
  mimeType: string;
  extension: string;
};

export const MIME_TYPE: Record<string, MimeType>;

/**
 * Check if a MIME type is supported by the browser's MediaRecorder
 */
export declare function isMimeTypeSupported(mimeType: string): boolean;

export type ResizeMode = "cover" | "contain" | "stretch";

export type ResizeVideoOptions = {
  width?: number;
  height?: number;
  mode?: ResizeMode;
  mimeType?: MimeType;
  videoBitrate?: number;
  audioBitrate?: number;
  fps?: number;
  playbackSpeed?: number;
  output?: OutputType;
  onProgress?: (progress: number) => void;
};

export declare function resizeVideo(
  video: File,
  options?: ResizeVideoOptions
): Promise<File | string | Blob>;

export declare function resizeVideos(
  videos: File[],
  options?: ResizeVideoOptions
): Promise<(File | string | Blob)[]>;

// HLS/m3u8 Support (requires @ffmpeg/ffmpeg)
export type HLSOptions = {
  width?: number;
  height?: number;
  videoBitrate?: number;
  audioBitrate?: number;
  segmentDuration?: number;
  onProgress?: (progress: number) => void;
};

export type HLSOutput = {
  playlist: File;
  segments: File[];
  playlistBlob: Blob;
  playlistContent: string;
};

export type QualityLevel = {
  name: string;
  width?: number;
  height?: number;
  videoBitrate: number;
  audioBitrate?: number;
};

export type MultiQualityHLSOutput = {
  masterPlaylist: File;
  masterPlaylistBlob: Blob;
  masterPlaylistContent: string;
  qualities: Array<{
    level: QualityLevel;
    playlist: File;
    segments: File[];
    playlistContent: string;
  }>;
};

export declare function resizeVideoToHLS(
  video: File,
  options?: HLSOptions
): Promise<HLSOutput>;

export declare function resizeVideosToHLS(
  videos: File[],
  options?: HLSOptions
): Promise<HLSOutput[]>;

export declare function resizeVideoToMultiQualityHLS(
  file: File,
  qualityLevels: QualityLevel[],
  options?: {
    segmentDuration?: number;
    onProgress?: (progress: number) => void;
    autoFilterQualities?: boolean; // default: true
    parallel?: boolean; // default: false - process in parallel (faster but uses more memory)
  }
): Promise<MultiQualityHLSOutput>;

export const HLS_QUALITY_PRESETS: {
  MOBILE: QualityLevel[];
  HD: QualityLevel[];
  FULL: QualityLevel[];
};

export declare function createHLSBlobURL(hlsOutput: HLSOutput): string;

export declare function downloadHLSAsZip(
  hlsOutput: HLSOutput,
  filename?: string
): Promise<void>;

export declare function downloadMultiQualityHLSAsZip(
  hlsOutput: MultiQualityHLSOutput,
  filename?: string
): Promise<void>;

// Fast Resize (requires @ffmpeg/ffmpeg) - 2-5x faster than MediaRecorder
export type FastResizeOptions = {
  width?: number;
  height?: number;
  videoBitrate?: number;
  audioBitrate?: number;
  format?: "mp4" | "webm";
  preset?: "ultrafast" | "superfast" | "fast" | "medium"; // encoding speed
  output?: OutputType;
  onProgress?: (progress: number) => void;
};

export declare function fastResizeVideo(
  video: File,
  options?: FastResizeOptions
): Promise<File | string | Blob>;

export declare function fastResizeVideos(
  videos: File[],
  options?: FastResizeOptions
): Promise<(File | string | Blob)[]>;

// Helper functions
export type ResizeMethodRecommendation = {
  method: "resizeVideo" | "fastResizeVideo" | "resizeVideoToHLS";
  reason: string;
  estimatedTime: string;
  pros: string[];
  cons: string[];
};

export declare function getVideoMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  size: number;
}>;

export declare function recommendResizeMethod(
  file: File,
  needsHLS?: boolean
): Promise<ResizeMethodRecommendation>;

export declare function smartResize(
  file: File,
  options?: {
    width?: number;
    height?: number;
    needsHLS?: boolean;
    onProgress?: (progress: number) => void;
  }
): Promise<any>;

