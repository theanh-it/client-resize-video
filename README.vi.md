# client-resize-video

[![npm version](https://img.shields.io/npm/v/client-resize-video.svg)](https://www.npmjs.com/package/client-resize-video)
[![npm downloads](https://img.shields.io/npm/dm/client-resize-video.svg)](https://www.npmjs.com/package/client-resize-video)
[![license](https://img.shields.io/npm/l/client-resize-video.svg)](https://github.com/theanh-it/client-resize-video/blob/main/LICENSE)

**Phiên bản: 0.0.3**

**[English](./README.md) | [Tiếng Việt](#)**

Thư viện resize và nén video chất lượng cao trên trình duyệt sử dụng Canvas API và MediaRecorder API.

## Tính năng

- ✅ **2 phương pháp resize**: Standard (MediaRecorder) và Fast (FFmpeg)
- ✅ **Fast resize**: Nhanh hơn 2-5x với FFmpeg.wasm
- ✅ Resize video chất lượng cao ngay trên trình duyệt
- ✅ Hỗ trợ nhiều định dạng đầu ra (WebM, MP4, **HLS/m3u8**)
- ✅ **HLS/m3u8 support** - Convert video sang HTTP Live Streaming format
- ✅ Hỗ trợ nhiều kiểu output (File, Blob, Base64)
- ✅ Nhiều chế độ resize (contain, cover, stretch) - Standard mode
- ✅ Tùy chỉnh video/audio bitrate
- ✅ Hỗ trợ callback tiến trình
- ✅ Xử lý hàng loạt - resize nhiều video
- ✅ Hỗ trợ TypeScript
- ✅ Hoạt động hoàn toàn trên trình duyệt - không cần server

## Cài đặt

### Cài đặt cơ bản (Standard Resize)

```bash
npm install client-resize-video
```

### Cài đặt với Fast Resize + HLS

```bash
npm install client-resize-video @ffmpeg/ffmpeg @ffmpeg/util
```

hoặc với yarn:

```bash
yarn add client-resize-video @ffmpeg/ffmpeg @ffmpeg/util
```

hoặc với bun:

```bash
bun add client-resize-video @ffmpeg/ffmpeg @ffmpeg/util
```

**Lưu ý:** `@ffmpeg/ffmpeg` (~31MB) cần thiết cho:

- ⚡ `fastResizeVideo()` - Resize nhanh hơn 2-5x
- 🎞️ `resizeVideoToHLS()` - Convert sang HLS/m3u8

## Cách sử dụng

### 🤖 Smart Resize - Tự động chọn method tốt nhất (Khuyến nghị!)

```typescript
import { smartResize } from "client-resize-video";

const file = /* File từ input[type="file"] */;

// Library tự động analyze và chọn method tối ưu!
const resized = await smartResize(file, {
  width: 1280,
  height: 720,
  onProgress: (p) => console.log(`${p}%`),
});

// Console sẽ log:
// 🔍 Analyzing video...
// ⚡ RECOMMENDATION: fastResizeVideo() - Long video (60s >= 30s)
// 🎯 Using recommended method: fastResizeVideo
// ✅ Done!
```

### 🔍 Kiểm tra nên dùng method nào

```typescript
import { recommendResizeMethod } from "client-resize-video";

const recommendation = await recommendResizeMethod(file);

console.log("Method:", recommendation.method);
console.log("Lý do:", recommendation.reason);
console.log("Thời gian:", recommendation.estimatedTime);
console.log("Ưu điểm:", recommendation.pros);
console.log("Nhược điểm:", recommendation.cons);

// Output ví dụ:
// Method: fastResizeVideo
// Lý do: Long video (120.0s >= 30s) - Fast method is 2-5x faster
// Thời gian: ~40s (or ~24s with ultrafast preset)
// Ưu điểm: ["2-5x faster", "Very stable", ...]
// Nhược điểm: ["Requires FFmpeg (+31MB)", ...]
```

### ⚡ Fast Resize (Khuyến nghị cho video > 30s)

```typescript
import { fastResizeVideo } from "client-resize-video";

const file = /* File từ input[type="file"] */;

const resized = await fastResizeVideo(file, {
  width: 1280,
  height: 720,
  format: "mp4", // hoặc "webm"
  videoBitrate: 2500000, // 2.5 Mbps
  onProgress: (p) => console.log(`${p}%`),
});

console.log(resized); // File object
// ⚡ Nhanh hơn 2-5x so với resizeVideo()!
```

### Sử dụng cơ bản (Standard)

```typescript
import { resizeVideo, MIME_TYPE } from "client-resize-video";

const file = /* File từ input[type="file"] */;

const resized = await resizeVideo(file, {
  width: 1280,
  height: 720,
  mimeType: MIME_TYPE.webm,
  videoBitrate: 2500000, // 2.5 Mbps
});

console.log(resized); // File object
// ⏱️ Thời gian resize = độ dài video
```

### Resize theo chiều rộng (giữ tỷ lệ)

```typescript
const resized = await resizeVideo(file, {
  width: 1280,
});
```

### Resize theo chiều cao (giữ tỷ lệ)

```typescript
const resized = await resizeVideo(file, {
  height: 720,
});
```

### Các chế độ Resize

```typescript
// Chế độ contain (mặc định) - vừa khít trong khung target
const contained = await resizeVideo(file, {
  width: 1280,
  height: 720,
  mode: "contain",
});

// Chế độ cover - lấp đầy khung target, cắt bớt nếu cần
const covered = await resizeVideo(file, {
  width: 1280,
  height: 720,
  mode: "cover",
});

// Chế độ stretch - kéo giãn đúng kích thước
const stretched = await resizeVideo(file, {
  width: 1280,
  height: 720,
  mode: "stretch",
});
```

### Với callback tiến trình

```typescript
const resized = await resizeVideo(file, {
  width: 1280,
  onProgress: (progress) => {
    console.log(`Tiến trình: ${progress}%`);
  },
});
```

### Output dạng Base64

```typescript
import { OUTPUT_TYPE } from "client-resize-video";

const base64 = await resizeVideo(file, {
  width: 1280,
  output: OUTPUT_TYPE.base64,
});

console.log(base64); // "data:video/webm;base64,..."
```

### Output dạng Blob

```typescript
const blob = await resizeVideo(file, {
  width: 1280,
  output: OUTPUT_TYPE.blob,
});

console.log(blob); // Blob { size: 12345, type: "video/webm" }
```

### Tùy chỉnh Bitrate

```typescript
const resized = await resizeVideo(file, {
  width: 1280,
  videoBitrate: 5000000, // 5 Mbps
  audioBitrate: 192000, // 192 kbps
});
```

### Xử lý hàng loạt

```typescript
import { resizeVideos } from "client-resize-video";

const files = /* File[] từ input[type="file"] multiple */;

const resized = await resizeVideos(files, {
  width: 1280,
  height: 720,
  videoBitrate: 2500000,
  onProgress: (progress) => {
    console.log(`Tổng tiến trình: ${progress}%`);
  },
});

console.log(resized); // File[]
```

### 🎉 Resize sang HLS/m3u8 (Mới!)

```typescript
import { resizeVideoToHLS, downloadHLSAsZip } from "client-resize-video";

const file = /* File từ input[type="file"] */;

// Convert sang HLS
const hlsOutput = await resizeVideoToHLS(file, {
  width: 1280,
  height: 720,
  videoBitrate: 2500000, // 2.5 Mbps
  segmentDuration: 10, // 10 giây mỗi segment
  onProgress: (progress) => {
    console.log(`Đang xử lý: ${progress}%`);
  },
});

// Kết quả bao gồm:
console.log(hlsOutput.playlist); // File: playlist.m3u8
console.log(hlsOutput.segments); // File[]: segment_000.ts, segment_001.ts, ...
console.log(hlsOutput.playlistContent); // Nội dung m3u8

// Download toàn bộ HLS dưới dạng ZIP
await downloadHLSAsZip(hlsOutput, "my-video");
```

### 🚀 Multi-Quality HLS (Adaptive Bitrate Streaming)

Tạo nhiều mức chất lượng từ một video duy nhất cho adaptive streaming:

```typescript
import {
  resizeVideoToMultiQualityHLS,
  downloadMultiQualityHLSAsZip,
  HLS_QUALITY_PRESETS,
} from "client-resize-video";

const file = /* File từ input[type="file"] */;

// Cách 1: Sử dụng quality presets có sẵn
const hlsOutput = await resizeVideoToMultiQualityHLS(
  file,
  HLS_QUALITY_PRESETS.HD, // hoặc MOBILE, FULL
  {
    segmentDuration: 10,
    onProgress: (progress) => {
      console.log(`Tiến trình: ${progress}%`);
    },
  }
);

// Cách 2: Tự định nghĩa các mức chất lượng
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
  onProgress: (progress) => console.log(`Tiến trình: ${progress}%`),
});

// Cấu trúc output
console.log(hlsOutput.masterPlaylist); // file master.m3u8
console.log(hlsOutput.qualities); // Mảng các quality objects
// Mỗi quality bao gồm: { level, playlist, segments, playlistContent }

// Download toàn bộ multi-quality HLS dưới dạng ZIP
await downloadMultiQualityHLSAsZip(hlsOutput, "my-video-adaptive");

// Cấu trúc ZIP:
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

**Các Quality Presets có sẵn:**

```typescript
// Mobile-friendly (360p, 480p)
HLS_QUALITY_PRESETS.MOBILE;

// Standard HD (360p, 480p, 720p)
HLS_QUALITY_PRESETS.HD;

// Full quality (360p, 480p, 720p, 1080p)
HLS_QUALITY_PRESETS.FULL;
```

### Sử dụng HLS output với HLS.js player

```html
<video id="video" controls></video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
<script type="module">
  import { resizeVideoToHLS, createHLSBlobURL } from "client-resize-video";

  const file = /* File */;
  const hlsOutput = await resizeVideoToHLS(file, { width: 1280 });

  // Để play HLS trên browser, cần upload lên server
  // hoặc sử dụng service worker để serve segments
  // Đây là demo đơn giản:
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

Resize một video.

**Tham số:**

- `video: File` - File video cần resize
- `options?: ResizeVideoOptions` - Tùy chọn resize

**Trả về:** `Promise<File | Blob | string>` - Video đã resize

### `resizeVideos(videos, options?)`

Resize nhiều video tuần tự.

**Tham số:**

- `videos: File[]` - Mảng các file video
- `options?: ResizeVideoOptions` - Tùy chọn resize

**Trả về:** `Promise<(File | Blob | string)[]>` - Mảng các video đã resize

### `resizeVideoToHLS(video, options?)` 🎉 Mới!

Resize và convert video sang định dạng HLS/m3u8.

**Tham số:**

- `video: File` - File video cần convert
- `options?: HLSOptions` - Tùy chọn HLS

**Trả về:** `Promise<HLSOutput>` - Object chứa playlist và segments

### `resizeVideosToHLS(videos, options?)`

Convert nhiều video sang HLS tuần tự.

**Tham số:**

- `videos: File[]` - Mảng các file video
- `options?: HLSOptions` - Tùy chọn HLS

**Trả về:** `Promise<HLSOutput[]>` - Mảng các HLS outputs

### `downloadHLSAsZip(hlsOutput, filename?)`

Download HLS output (playlist + segments) dưới dạng file ZIP.

**Tham số:**

- `hlsOutput: HLSOutput` - Output từ `resizeVideoToHLS()`
- `filename?: string` - Tên file (mặc định: "video-hls")

**Yêu cầu:** JSZip library phải được load trước (qua CDN hoặc npm)

### `ResizeVideoOptions`

```typescript
type ResizeVideoOptions = {
  width?: number; // Chiều rộng mục tiêu (pixels)
  height?: number; // Chiều cao mục tiêu (pixels)
  mode?: ResizeMode; // Chế độ resize: "contain" | "cover" | "stretch" (mặc định: "contain")
  mimeType?: MimeType; // Định dạng đầu ra (mặc định: webm)
  videoBitrate?: number; // Video bitrate (bps) (mặc định: 2500000 = 2.5Mbps)
  audioBitrate?: number; // Audio bitrate (bps) (mặc định: 128000 = 128kbps)
  output?: OutputType; // Kiểu output (mặc định: "file")
  onProgress?: (progress: number) => void; // Callback tiến trình (0-100)
};
```

### `HLSOptions`

```typescript
type HLSOptions = {
  width?: number; // Chiều rộng mục tiêu (pixels)
  height?: number; // Chiều cao mục tiêu (pixels)
  videoBitrate?: number; // Video bitrate (bps) (mặc định: 2500000 = 2.5Mbps)
  audioBitrate?: number; // Audio bitrate (bps) (mặc định: 128000 = 128kbps)
  segmentDuration?: number; // Độ dài mỗi segment (giây) (mặc định: 10)
  onProgress?: (progress: number) => void; // Callback tiến trình (0-100)
};
```

### `HLSOutput`

```typescript
type HLSOutput = {
  playlist: File; // File playlist.m3u8
  segments: File[]; // Mảng các file segment (.ts)
  playlistBlob: Blob; // Playlist dạng Blob
  playlistContent: string; // Nội dung playlist (text)
};
```

### Hằng số

```typescript
// Kiểu output
OUTPUT_TYPE.file; // File object
OUTPUT_TYPE.blob; // Blob object
OUTPUT_TYPE.base64; // Base64 string

// MIME types
MIME_TYPE.webm; // video/webm (mặc định, hỗ trợ tốt nhất)
MIME_TYPE.webm_vp9; // video/webm với VP9 codec
MIME_TYPE.webm_vp8; // video/webm với VP8 codec
MIME_TYPE.mp4; // video/mp4 (hỗ trợ hạn chế)
MIME_TYPE.mkv; // video/x-matroska (hỗ trợ hạn chế)
MIME_TYPE.m3u8; // application/vnd.apple.mpegurl (HLS) 🎉

// Kiểm tra MIME type có được hỗ trợ không
isMimeTypeSupported("video/webm"); // true/false
```

### Chế độ Resize

- **`contain`** (mặc định): Video vừa khít trong khung target, giữ nguyên tỷ lệ. Kích thước đầu ra có thể nhỏ hơn target.
- **`cover`**: Lấp đầy toàn bộ khung target, giữ nguyên tỷ lệ. Video có thể bị cắt bớt.
- **`stretch`**: Kéo giãn video đúng kích thước target. Tỷ lệ có thể thay đổi.

## Ví dụ

### Ví dụ 1: Upload video với preview

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

### Ví dụ 2: Nén video trước khi upload

```javascript
import { resizeVideo, MIME_TYPE } from "client-resize-video";

async function uploadVideo(file) {
  // Nén video trước khi upload để giảm băng thông
  const compressed = await resizeVideo(file, {
    width: 1920,
    height: 1080,
    mimeType: MIME_TYPE.webm,
    videoBitrate: 3000000, // 3 Mbps
    onProgress: (progress) => {
      console.log(`Đang nén: ${progress}%`);
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

### Ví dụ 3: Tạo thumbnail video

```javascript
import { resizeVideo, OUTPUT_TYPE } from "client-resize-video";

async function createThumbnail(videoFile) {
  // Tạo phiên bản nhỏ cho thumbnail
  const thumbnail = await resizeVideo(videoFile, {
    width: 320,
    height: 180,
    mode: "cover",
    videoBitrate: 500000, // 500 kbps - chất lượng rất thấp
    output: OUTPUT_TYPE.blob,
  });

  return URL.createObjectURL(thumbnail);
}
```

## Trình duyệt hỗ trợ

- Chrome 49+
- Firefox 29+
- Safari 14+
- Edge 79+

**Yêu cầu:**

- Hỗ trợ MediaRecorder API
- Hỗ trợ Canvas API
- Hỗ trợ HTMLVideoElement

## ⚡ So sánh Performance

### Standard vs Fast Resize

| Video       | Standard (`resizeVideo`) | Fast (`fastResizeVideo`) | Tốc độ             |
| ----------- | ------------------------ | ------------------------ | ------------------ |
| 10s, 720p   | ~10-12s                  | ~2-4s                    | **3-5x** nhanh hơn |
| 30s, 1080p  | ~30-35s                  | ~6-12s                   | **3-5x** nhanh hơn |
| 5min, 1080p | ~5-6 phút                | ~1-2 phút                | **3-5x** nhanh hơn |

### Trade-offs

| Tính năng        | `resizeVideo()`          | `fastResizeVideo()` |
| ---------------- | ------------------------ | ------------------- |
| **Tốc độ**       | Chậm (real-time)         | ⚡ Nhanh (2-5x)     |
| **Package size** | 16KB                     | +31MB (FFmpeg)      |
| **Resize modes** | ✅ contain/cover/stretch | ❌ Chỉ scale        |
| **Dependencies** | None                     | FFmpeg.wasm         |
| **Ổn định**      | Có thể stuck             | Rất ổn định         |

### Khuyến nghị

- **Video < 30s**: Dùng `resizeVideo()` - Không cần FFmpeg
- **Video > 30s**: Dùng `fastResizeVideo()` - Nhanh hơn nhiều!
- **Cần streaming**: Dùng `resizeVideoToHLS()`

_Xem chi tiết: [PERFORMANCE.md](./PERFORMANCE.md)_

## Giới hạn

- Xử lý diễn ra theo thời gian thực - video 30 giây mất ~30 giây để xử lý
- Video lớn có thể tiêu tốn nhiều bộ nhớ
- Hỗ trợ xử lý audio khác nhau tùy trình duyệt
- Hỗ trợ output MP4 bị hạn chế (nên dùng WebM)
- **HLS/m3u8** yêu cầu cài đặt `@ffmpeg/ffmpeg` (~31MB) và sẽ chậm hơn do phải load WebAssembly

## Về HLS/m3u8

**✅ Đã hỗ trợ!**

Thư viện hiện đã hỗ trợ HLS/m3u8 thông qua **FFmpeg.wasm**. M3U8 (HLS - HTTP Live Streaming) là format streaming phức tạp bao gồm:

- File playlist `.m3u8` (text file chứa danh sách segments)
- Nhiều video segments (các file `.ts` - MPEG Transport Stream)
- Metadata về duration, bitrate, resolution, v.v.

### Sử dụng HLS

```typescript
import { resizeVideoToHLS } from "client-resize-video";

const hlsOutput = await resizeVideoToHLS(file, {
  width: 1280,
  height: 720,
  videoBitrate: 2500000,
  segmentDuration: 10, // 10 giây mỗi segment
});

// Truy cập files
console.log(hlsOutput.playlist); // playlist.m3u8
console.log(hlsOutput.segments); // [segment_000.ts, segment_001.ts, ...]
```

### Lưu ý quan trọng

1. **Kích thước**: `@ffmpeg/ffmpeg` (~31MB) sẽ được download khi lần đầu sử dụng HLS
2. **Hiệu năng**: Xử lý HLS chậm hơn WebM/MP4 do phải load và chạy WebAssembly
3. **Playback**: Để play HLS trên browser, cần:
   - Upload files lên server
   - Hoặc dùng HLS.js player với custom loader
   - Hoặc dùng Service Worker để serve segments

### Kiểm tra format được hỗ trợ

```typescript
import { isMimeTypeSupported, MIME_TYPE } from "client-resize-video";

// Các format qua MediaRecorder
console.log("WebM VP9:", isMimeTypeSupported(MIME_TYPE.webm_vp9.mimeType));
console.log("WebM VP8:", isMimeTypeSupported(MIME_TYPE.webm_vp8.mimeType));

// HLS luôn available nếu đã cài @ffmpeg/ffmpeg
console.log("HLS:", MIME_TYPE.m3u8); // ✅
```

## TypeScript

Hỗ trợ đầy đủ TypeScript.

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

// Kiểm tra MIME type có được hỗ trợ không
if (isMimeTypeSupported(MIME_TYPE.webm_vp9.mimeType)) {
  console.log("VP9 được hỗ trợ!");
}
```

## Testing

```bash
# Chạy tests
npm test

# hoặc
bun test
```

## Giấy phép

MIT

## Liên kết

- [GitHub](https://github.com/theanh-it/client-resize-video)
- [NPM](https://www.npmjs.com/package/client-resize-video)

## Credits

Xây dựng với các API native của trình duyệt:

- Canvas API
- MediaRecorder API
- HTMLVideoElement API
