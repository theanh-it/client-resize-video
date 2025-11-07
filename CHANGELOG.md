# Changelog

All notable changes to this project will be documented in this file.

## [0.0.3] - 2025-11-07

### Added
- 🚀 **Multi-Quality HLS** (Adaptive Bitrate Streaming) support
- `resizeVideoToMultiQualityHLS()` function to create multiple quality levels from a single video
- `downloadMultiQualityHLSAsZip()` helper function to package multi-quality HLS output
- `HLS_QUALITY_PRESETS` with predefined quality configurations (MOBILE, HD, FULL)
- `QualityLevel` type for defining custom quality levels
- `MultiQualityHLSOutput` type with master playlist and quality variants
- Master playlist generation for HLS adaptive streaming
- Support for custom quality definitions (resolution, bitrate, etc.)
- 🎯 **Auto-detect video resolution** - automatically filter out quality levels higher than source
- ⚡ **Parallel processing mode** - process multiple qualities simultaneously (2-3x faster)
- 📊 **Advanced progress tracking** - accurate progress for each quality level
- 📱 **iPhone/iOS support documentation** - full support for MOV, HEVC, H.264 formats
- ⚡ **Fast Resize** using FFmpeg.wasm - 2-5x faster than MediaRecorder!
- `fastResizeVideo()` function for fast video processing
- `fastResizeVideos()` function for batch fast processing
- MP4 and WebM output for fast resize
- Performance comparison documentation
- Detailed debug logging system
- Watchdog mechanism to detect stuck videos
- Auto-recovery when video gets stuck

### Fixed
- 🐛 Fixed video stuck at random progress (readyState issue)
- 🐛 Fixed Blob URL being revoked too early
- 🐛 Changed preload from "metadata" to "auto" for better buffering
- 🐛 Added timeout fallback for MediaRecorder.onstart event
- 🐛 Better progress tracking (update every 0.05s instead of 0.1s)
- 🐛 Auto-stop when video reaches end (fixes stuck at 99%)

### Changed
- Improved logging with emojis and structured output
- Video objectUrl now kept until processing completes
- Added comprehensive documentation for multi-quality HLS in README
- Added Vietnamese documentation for multi-quality HLS
- Updated type definitions with new HLS types
- Added PERFORMANCE.md comparison guide
- Added DEBUG_GUIDE.md for troubleshooting
- Added LOGS_EXPLANATION.md for log interpretation

## [0.0.2] - 2025-11-04

### Added
- ✨ **HLS/m3u8 support** using FFmpeg.wasm
- `resizeVideoToHLS()` function to convert videos to HLS format
- `resizeVideosToHLS()` function for batch HLS conversion
- `downloadHLSAsZip()` helper function to package HLS output
- `createHLSBlobURL()` helper for HLS playback
- `MIME_TYPE.m3u8` constant
- Configurable HLS segment duration
- HLS progress callback support
- Full TypeScript support for HLS types (`HLSOptions`, `HLSOutput`)

### Changed
- Added `@ffmpeg/ffmpeg` and `@ffmpeg/util` as optional peer dependencies
- Package size increased from ~8KB to ~15KB (core library only, FFmpeg loads separately)
- Updated documentation with comprehensive HLS usage examples

### Notes
- FFmpeg.wasm (~31MB) will be downloaded on first HLS use
- HLS processing is slower than MediaRecorder-based formats
- HLS requires proper server setup or Service Worker for playback

## [0.0.1] - 2025-11-04

### Added
- Initial release
- `resizeVideo()` function to resize single video
- `resizeVideos()` function to resize multiple videos
- Support for multiple output formats:
  - WebM (default, best browser support)
  - WebM VP9 codec
  - WebM VP8 codec
  - MP4 (limited support)
  - MKV (limited support)
- Support for multiple output types:
  - File object
  - Blob
  - Base64 string
- Support for multiple resize modes:
  - `contain` (default) - fit inside target dimensions
  - `cover` - fill target dimensions with crop
  - `stretch` - stretch to exact dimensions
- Configurable video and audio bitrate
- Progress callback support
- `isMimeTypeSupported()` function to check format support
- TypeScript support with full type definitions
- Comprehensive documentation (English and Vietnamese)
- Demo application with Vue 3

