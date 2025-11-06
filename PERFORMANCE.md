# ⚡ Performance Comparison

## So sánh 3 phương pháp resize video

### 1. 📹 `resizeVideo()` - Standard (MediaRecorder + Canvas)

**Cách hoạt động:**

- Play video theo real-time
- Capture từng frame với Canvas
- Record bằng MediaRecorder API

**Ưu điểm:**

- ✅ Không cần dependencies nặng
- ✅ Package nhỏ gọn (~16KB)
- ✅ Hỗ trợ WebM, MP4, MKV
- ✅ Support nhiều resize modes (contain, cover, stretch)

**Nhược điểm:**

- ❌ **Chậm**: Video 30s mất ~30-35s
- ❌ **Real-time processing**: Thời gian = độ dài video
- ❌ Có thể stuck với video lớn/codec đặc biệt

**Khi nào dùng:**

- Video ngắn (< 1 phút)
- Không cần FFmpeg
- Cần package nhỏ

### 2. ⚡ `fastResizeVideo()` - Fast (FFmpeg.wasm)

**Cách hoạt động:**

- Dùng FFmpeg WebAssembly
- Xử lý video trực tiếp (không play)
- Encode lại với codec mới

**Ưu điểm:**

- ✅ **Nhanh hơn 2-5x**: Video 30s chỉ mất ~6-15s
- ✅ **Không phụ thuộc playback**: Xử lý offline
- ✅ Ổn định hơn với file lớn
- ✅ Output MP4 hoặc WebM chất lượng cao

**Nhược điểm:**

- ❌ Cần cài `@ffmpeg/ffmpeg` (~31MB)
- ❌ Load time lần đầu: ~3-5s (download FFmpeg)
- ❌ Không có resize modes (contain/cover/stretch)

**Khi nào dùng:**

- Video dài (> 1 phút)
- Cần resize nhanh
- Chấp nhận package lớn hơn

### 3. 🎞️ `resizeVideoToHLS()` - HLS Streaming (FFmpeg.wasm)

**Cách hoạt động:**

- Giống `fastResizeVideo()`
- Nhưng output HLS format (m3u8 + segments)

**Ưu điểm:**

- ✅ Tạo HLS cho streaming
- ✅ Nhanh (giống fastResizeVideo)
- ✅ Adaptive bitrate ready

**Nhược điểm:**

- ❌ Output nhiều files
- ❌ Cần server để play
- ❌ Phức tạp hơn

**Khi nào dùng:**

- Cần streaming format
- Deploy lên CDN/server
- Adaptive streaming

## 📊 Performance Benchmark

| Video              | Method              | Time    | Speed    |
| ------------------ | ------------------- | ------- | -------- |
| 10s, 1080p, 5MB    | `resizeVideo()`     | ~10-12s | 1x       |
| 10s, 1080p, 5MB    | `fastResizeVideo()` | ~2-4s   | **3-5x** |
| 30s, 1080p, 15MB   | `resizeVideo()`     | ~30-35s | 1x       |
| 30s, 1080p, 15MB   | `fastResizeVideo()` | ~6-12s  | **3-5x** |
| 5min, 1080p, 100MB | `resizeVideo()`     | ~5-6min | 1x       |
| 5min, 1080p, 100MB | `fastResizeVideo()` | ~1-2min | **3-5x** |

## 💡 Recommendation

### Dùng `resizeVideo()` khi:

```typescript
import { resizeVideo } from "resize-video";

// Video ngắn, không cần FFmpeg
const resized = await resizeVideo(file, {
  width: 640,
  height: 360,
  mode: "cover", // ← Cần resize modes
});
```

### Dùng `fastResizeVideo()` khi:

```typescript
import { fastResizeVideo } from "resize-video";

// Video dài, cần nhanh
const resized = await fastResizeVideo(file, {
  width: 1280,
  height: 720,
  format: "mp4", // ← Output MP4 hoặc WebM
  onProgress: (p) => console.log(`${p}%`),
});
```

### Dùng `resizeVideoToHLS()` khi:

```typescript
import { resizeVideoToHLS } from "resize-video";

// Cần streaming format
const hls = await resizeVideoToHLS(file, {
  width: 1920,
  height: 1080,
  segmentDuration: 10,
});
```

## 🎯 Trade-offs Summary

| Feature        | resizeVideo     | fastResizeVideo      | resizeVideoToHLS     |
| -------------- | --------------- | -------------------- | -------------------- |
| Speed          | ⭐ Slow         | ⭐⭐⭐⭐⭐ Fast      | ⭐⭐⭐⭐⭐ Fast      |
| Package Size   | ⭐⭐⭐⭐⭐ 16KB | ⭐⭐ +31MB           | ⭐⭐ +31MB           |
| Resize Modes   | ⭐⭐⭐⭐⭐ Yes  | ❌ No                | ❌ No                |
| Output Formats | WebM, MP4       | MP4, WebM            | HLS (m3u8)           |
| Stability      | ⭐⭐⭐ OK       | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐⭐ Excellent |
| Dependencies   | None            | FFmpeg               | FFmpeg               |

## 🔄 Migration Path

Nếu đang dùng `resizeVideo()` và thấy chậm:

```typescript
// Before
import { resizeVideo } from "resize-video";
const resized = await resizeVideo(file, {
  width: 1280,
  height: 720,
});

// After - Faster!
import { fastResizeVideo } from "resize-video";
const resized = await fastResizeVideo(file, {
  width: 1280,
  height: 720,
  format: "mp4",
});

// Don't forget to install FFmpeg
// npm install @ffmpeg/ffmpeg @ffmpeg/util
```

## 💰 Cost Analysis

### resizeVideo() - Free

- No external dependencies
- Fast initial load
- Slow processing

### fastResizeVideo() - One-time cost

- 31MB download (first time only)
- Cached by browser
- Much faster processing
- **Worth it for videos > 30s**

## 🎓 Conclusion

- **Short videos (< 30s)**: Dùng `resizeVideo()`
- **Long videos (> 30s)**: Dùng `fastResizeVideo()`
- **Streaming**: Dùng `resizeVideoToHLS()`
