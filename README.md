# client-resize-video

[![npm version](https://img.shields.io/npm/v/client-resize-video.svg)](https://www.npmjs.com/package/client-resize-video)
[![npm downloads](https://img.shields.io/npm/dm/client-resize-video.svg)](https://www.npmjs.com/package/client-resize-video)
[![license](https://img.shields.io/npm/l/client-resize-video.svg)](https://github.com/theanh-it/client-resize-video/blob/main/LICENSE)

**Version: 0.0.3**

**[English](#) | [Tiếng Việt](./README.vi.md)**

A high-quality video resize and compression library for browser using Canvas API and MediaRecorder API.

## Features

- ✅ High-quality video resizing in browser
- ✅ Support multiple output formats (WebM, MP4, **HLS/m3u8**)
- ✅ **HLS/m3u8 support** - Convert videos to HTTP Live Streaming format
- ✅ Support multiple output types (File, Blob, Base64)
- ✅ Multiple resize modes (contain, cover, stretch)
- ✅ Configurable video/audio bitrate
- ✅ Progress callback support
- ✅ Batch processing - resize multiple videos
- ✅ TypeScript support
- ✅ Works entirely in browser - no server needed

## Installation

### Basic Installation (WebM/MP4)

```bash
npm install client-resize-video
```

### Installation with HLS/m3u8 support

```bash
npm install client-resize-video @ffmpeg/ffmpeg @ffmpeg/util
```

or with yarn:

```bash
yarn add client-resize-video @ffmpeg/ffmpeg @ffmpeg/util
```

or with bun:

```bash
bun add client-resize-video @ffmpeg/ffmpeg @ffmpeg/util
```

**Note:** `@ffmpeg/ffmpeg` (~31MB) is only required if you want to use HLS/m3u8 features.

## Usage

### Basic Usage

```typescript
import { resizeVideo, MIME_TYPE } from "client-resize-video";

const file = /* File from input[type="file"] */;

const resized = await resizeVideo(file, {
  width: 1280,
  height: 720,
  mimeType: MIME_TYPE.webm,
  videoBitrate: 2500000, // 2.5 Mbps
});

console.log(resized); // File object
```

### Resize by Width (maintain aspect ratio)

```typescript
const resized = await resizeVideo(file, {
  width: 1280,
});
```

### Resize by Height (maintain aspect ratio)

```typescript
const resized = await resizeVideo(file, {
  height: 720,
});
```

### Resize Modes

```typescript
// Contain mode (default) - fit inside target dimensions
const contained = await resizeVideo(file, {
  width: 1280,
  height: 720,
  mode: "contain",
});

// Cover mode - fill target dimensions, crop if needed
const covered = await resizeVideo(file, {
  width: 1280,
  height: 720,
  mode: "cover",
});

// Stretch mode - stretch to exact dimensions
const stretched = await resizeVideo(file, {
  width: 1280,
  height: 720,
  mode: "stretch",
});
```

### With Progress Callback

```typescript
const resized = await resizeVideo(file, {
  width: 1280,
  onProgress: (progress) => {
    console.log(`Progress: ${progress}%`);
  },
});
```

### Output as Base64

```typescript
import { OUTPUT_TYPE } from "client-resize-video";

const base64 = await resizeVideo(file, {
  width: 1280,
  output: OUTPUT_TYPE.base64,
});

console.log(base64); // "data:video/webm;base64,..."
```

### Output as Blob

```typescript
const blob = await resizeVideo(file, {
  width: 1280,
  output: OUTPUT_TYPE.blob,
});

console.log(blob); // Blob { size: 12345, type: "video/webm" }
```

### Custom Bitrate

```typescript
const resized = await resizeVideo(file, {
  width: 1280,
  videoBitrate: 5000000, // 5 Mbps
  audioBitrate: 192000, // 192 kbps
});
```

### Batch Processing

```typescript
import { resizeVideos } from "client-resize-video";

const files = /* File[] from input[type="file"] multiple */;

const resized = await resizeVideos(files, {
  width: 1280,
  height: 720,
  videoBitrate: 2500000,
  onProgress: (progress) => {
    console.log(`Total progress: ${progress}%`);
  },
});

console.log(resized); // File[]
```

### 🎉 Resize to HLS/m3u8 (New!)

```typescript
import { resizeVideoToHLS, downloadHLSAsZip } from "client-resize-video";

const file = /* File from input[type="file"] */;

// Convert to HLS
const hlsOutput = await resizeVideoToHLS(file, {
  width: 1280,
  height: 720,
  videoBitrate: 2500000, // 2.5 Mbps
  segmentDuration: 10, // 10 seconds per segment
  onProgress: (progress) => {
    console.log(`Processing: ${progress}%`);
  },
});

// Output includes:
console.log(hlsOutput.playlist); // File: playlist.m3u8
console.log(hlsOutput.segments); // File[]: segment_000.ts, segment_001.ts, ...
console.log(hlsOutput.playlistContent); // m3u8 content

// Download complete HLS as ZIP
await downloadHLSAsZip(hlsOutput, "my-video");
```

### 🚀 Multi-Quality HLS (Adaptive Bitrate Streaming)

Create multiple quality levels from a single video for adaptive streaming:

```typescript
import {
  resizeVideoToMultiQualityHLS,
  downloadMultiQualityHLSAsZip,
  HLS_QUALITY_PRESETS,
} from "client-resize-video";

const file = /* File from input[type="file"] */;

// Option 1: Use predefined quality presets
const hlsOutput = await resizeVideoToMultiQualityHLS(
  file,
  HLS_QUALITY_PRESETS.HD, // or MOBILE, FULL
  {
    segmentDuration: 10,
    onProgress: (progress) => {
      console.log(`Progress: ${progress}%`);
    },
  }
);

// Option 2: Define custom quality levels
const customQualities = [
  {
    name: "360p",
    width: 640,
    height: 360,
    videoBitrate: 800000, // 800 kbps
    audioBitrate: 96000, // 96 kbps
  },
  {
    name: "720p",
    width: 1280,
    height: 720,
    videoBitrate: 2800000, // 2.8 Mbps
    audioBitrate: 128000, // 128 kbps
  },
  {
    name: "1080p",
    width: 1920,
    height: 1080,
    videoBitrate: 5000000, // 5 Mbps
    audioBitrate: 192000, // 192 kbps
  },
];

const customHLSOutput = await resizeVideoToMultiQualityHLS(file, customQualities, {
  segmentDuration: 10,
  onProgress: (progress) => console.log(`Progress: ${progress}%`),
});

// Output structure
console.log(hlsOutput.masterPlaylist); // master.m3u8 file
console.log(hlsOutput.qualities); // Array of quality objects
// Each quality contains: { level, playlist, segments, playlistContent }

// Download complete multi-quality HLS as ZIP
await downloadMultiQualityHLSAsZip(hlsOutput, "my-video-adaptive");

// ZIP structure:
// ├── master.m3u8
// ├── 360p/
// │   ├── playlist.m3u8
// │   ├── segment_000.ts
// │   ├── segment_001.ts
// │   └── ...
// ├── 720p/
// │   ├── playlist.m3u8
// │   └── ...
// └── 1080p/
//     ├── playlist.m3u8
//     └── ...
```

**Available Quality Presets:**

```typescript
// Mobile-friendly (360p, 480p)
HLS_QUALITY_PRESETS.MOBILE;

// Standard HD (360p, 480p, 720p)
HLS_QUALITY_PRESETS.HD;

// Full quality (360p, 480p, 720p, 1080p)
HLS_QUALITY_PRESETS.FULL;
```

### Using HLS output with HLS.js player

```html
<video id="video" controls></video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<script type="module">
  import { resizeVideoToHLS } from "client-resize-video";

  const file = /* File */;
  const hlsOutput = await resizeVideoToHLS(file, { width: 1280 });

  // To play HLS in browser, need to upload to server
  // or use service worker to serve segments
  // This is a simple demo:
  const playlistURL = URL.createObjectURL(hlsOutput.playlist);

  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(playlistURL);
    hls.attachMedia(video);
  }
</script>
```

## API

### `resizeVideo(video, options?)`

Resize a single video.

**Parameters:**

- `video: File` - Video file to resize
- `options?: ResizeVideoOptions` - Resize options

**Returns:** `Promise<File | Blob | string>` - Resized video

### `resizeVideos(videos, options?)`

Resize multiple videos sequentially.

**Parameters:**

- `videos: File[]` - Array of video files
- `options?: ResizeVideoOptions` - Resize options

**Returns:** `Promise<(File | Blob | string)[]>` - Array of resized videos

### `ResizeVideoOptions`

```typescript
type ResizeVideoOptions = {
  width?: number; // Target width in pixels
  height?: number; // Target height in pixels
  mode?: ResizeMode; // Resize mode: "contain" | "cover" | "stretch" (default: "contain")
  mimeType?: MimeType; // Output format (default: webm)
  videoBitrate?: number; // Video bitrate in bps (default: 2500000 = 2.5Mbps)
  audioBitrate?: number; // Audio bitrate in bps (default: 128000 = 128kbps)
  output?: OutputType; // Output type (default: "file")
  onProgress?: (progress: number) => void; // Progress callback (0-100)
};
```

### Constants

```typescript
// Output types
OUTPUT_TYPE.file; // File object
OUTPUT_TYPE.blob; // Blob object
OUTPUT_TYPE.base64; // Base64 string

// MIME types
MIME_TYPE.webm; // video/webm (default, best browser support)
MIME_TYPE.webm_vp9; // video/webm with VP9 codec
MIME_TYPE.webm_vp8; // video/webm with VP8 codec
MIME_TYPE.mp4; // video/mp4 (limited support)
MIME_TYPE.mkv; // video/x-matroska (limited support)

// Check if MIME type is supported
isMimeTypeSupported("video/webm"); // true/false
```

### Resize Modes

- **`contain`** (default): Fit video inside target dimensions while maintaining aspect ratio. Output dimensions may be smaller than target.
- **`cover`**: Fill entire target dimensions while maintaining aspect ratio. Video may be cropped.
- **`stretch`**: Stretch video to exact target dimensions. Aspect ratio may change.

## Examples

### Example 1: Video Upload with Preview

```html
<input type="file" id="upload" accept="video/*" />
<video id="preview" controls></video>

<script type="module">
  import { resizeVideo, OUTPUT_TYPE } from "client-resize-video";

  document.getElementById("upload").addEventListener("change", async (e) => {
    const file = e.target.files[0];

    const blob = await resizeVideo(file, {
      width: 640,
      output: OUTPUT_TYPE.blob,
      onProgress: (p) => console.log(`${p}%`),
    });

    document.getElementById("preview").src = URL.createObjectURL(blob);
  });
</script>
```

### Example 2: Compress Video Before Upload

```javascript
import { resizeVideo, MIME_TYPE } from "client-resize-video";

async function uploadVideo(file) {
  // Compress video before upload to reduce bandwidth
  const compressed = await resizeVideo(file, {
    width: 1920,
    height: 1080,
    mimeType: MIME_TYPE.webm,
    videoBitrate: 3000000, // 3 Mbps
    onProgress: (progress) => {
      console.log(`Compressing: ${progress}%`);
    },
  });

  const formData = new FormData();
  formData.append("video", compressed);

  await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
}
```

### Example 3: Create Video Thumbnails

```javascript
import { resizeVideo, OUTPUT_TYPE } from "client-resize-video";

async function createThumbnail(videoFile) {
  // Create small version for thumbnail
  const thumbnail = await resizeVideo(videoFile, {
    width: 320,
    height: 180,
    mode: "cover",
    videoBitrate: 500000, // 500 kbps - very low quality
    output: OUTPUT_TYPE.blob,
  });

  return URL.createObjectURL(thumbnail);
}
```

## Browser Compatibility

- Chrome 49+
- Firefox 29+
- Safari 14+
- Edge 79+

**Requirements:**

- MediaRecorder API support
- Canvas API support
- HTMLVideoElement support

### 📱 iPhone/iOS Support

**Video từ iPhone được hỗ trợ đầy đủ!**

iPhone thường quay video với:
- **Format**: MOV (QuickTime)
- **Codec**: HEVC (H.265) trên iPhone 7+ hoặc H.264 trên iPhone cũ
- **Resolution**: 720p, 1080p, 4K (tùy model)

**Khuyến nghị cho video iPhone:**

✅ **Dùng FFmpeg methods** (khuyên dùng):
```typescript
import { fastResizeVideo, resizeVideoToHLS, resizeVideoToMultiQualityHLS } from "client-resize-video";

// Video từ iPhone (MOV, HEVC/H.265)
const iphoneVideo = /* File từ input[type="file"] */;

// Option 1: Fast resize (2-5x faster)
const resized = await fastResizeVideo(iphoneVideo, {
  width: 1280,
  format: "mp4", // Convert MOV → MP4
});

// Option 2: Multi-quality HLS (best for streaming)
const hls = await resizeVideoToMultiQualityHLS(
  iphoneVideo, 
  HLS_QUALITY_PRESETS.HD,
  { parallel: true } // Faster processing
);
```

⚠️ **MediaRecorder có giới hạn trên iOS Safari**:
```typescript
// May not work properly on iOS Safari < 14.5
const resized = await resizeVideo(iphoneVideo, {
  mimeType: MIME_TYPE.webm, // Safari có thể không support WebM output
});
```

**Tóm tắt:**
- ✅ **Input**: Mọi format iPhone (MOV, HEVC, H.264) đều OK
- ✅ **FFmpeg methods**: Hoạt động hoàn hảo trên mọi iPhone/iPad
- ⚠️ **MediaRecorder**: Hạn chế trên iOS Safari (khuyên dùng FFmpeg thay thế)

## Performance

| Operation           | File Size | Resolution                | Time (approx) |
| ------------------- | --------- | ------------------------- | ------------- |
| Resize 1080p → 720p | 10MB      | 1920x1080 → 1280x720      | 5-15s         |
| Resize 4K → 1080p   | 50MB      | 3840x2160 → 1920x1080     | 20-60s        |
| Compress 1080p      | 10MB      | 1920x1080 (lower bitrate) | 5-15s         |

_Performance depends on video duration, browser, and device hardware._

## Limitations

- Processing happens in real-time - a 30-second video takes ~30 seconds to process
- Large videos may consume significant memory
- Audio processing support varies by browser
- MP4 output support is limited (WebM is recommended)
- **No HLS/m3u8 support**: MediaRecorder API does not directly support m3u8/HLS format. To create HLS, you need to use external libraries like `mux.js` or `hls.js`

## About HLS/m3u8

**Why no m3u8 support?**

M3U8 (HLS - HTTP Live Streaming) is a complex streaming format that includes:

- Playlist file `.m3u8` (text file containing segment list)
- Multiple video segments (`.ts` files - MPEG Transport Stream)
- Metadata about duration, bitrate, resolution, etc.

MediaRecorder API (core of this library) only supports output formats:

- WebM (VP8/VP9 codec)
- MP4 (H.264 codec, limited support)
- MKV (Matroska, limited support)

**Solutions if you need HLS:**

If you really need HLS output, here are some options:

1. **Server-side conversion**: Upload resized video (WebM/MP4) to server, use FFmpeg to convert to HLS

   ```bash
   ffmpeg -i input.webm -c:v libx264 -c:a aac -hls_time 10 -hls_playlist_type vod output.m3u8
   ```

2. **Client-side with mux.js**: Use libraries like `mux.js` to create HLS directly in browser (much more complex)

3. **Hybrid approach**: Resize video with this library, then use cloud service like AWS MediaConvert to create HLS

**Check supported formats:**

```typescript
import { isMimeTypeSupported, MIME_TYPE } from "client-resize-video";

// Check each format
console.log("WebM VP9:", isMimeTypeSupported(MIME_TYPE.webm_vp9.mimeType));
console.log("WebM VP8:", isMimeTypeSupported(MIME_TYPE.webm_vp8.mimeType));
console.log("MP4:", isMimeTypeSupported(MIME_TYPE.mp4.mimeType));
console.log("MKV:", isMimeTypeSupported(MIME_TYPE.mkv.mimeType));

// Example output on Chrome:
// WebM VP9: true
// WebM VP8: true
// MP4: false
// MKV: false
```

## TypeScript

Full TypeScript support included.

```typescript
import {
  resizeVideo,
  resizeVideos,
  isMimeTypeSupported,
  type ResizeVideoOptions,
  type OutputType,
  type MimeType,
  type ResizeMode,
  MIME_TYPE,
  OUTPUT_TYPE,
} from "client-resize-video";

// Check if MIME type is supported
if (isMimeTypeSupported(MIME_TYPE.webm_vp9.mimeType)) {
  console.log("VP9 is supported!");
}
```

## Testing

```bash
# Run tests
npm test

# or
bun test
```

## License

MIT

## Links

- [GitHub](https://github.com/theanh-it/client-resize-video)
- [NPM](https://www.npmjs.com/package/client-resize-video)

## Credits

Built with browser native APIs:

- Canvas API
- MediaRecorder API
- HTMLVideoElement API
