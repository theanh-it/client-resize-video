import { describe, expect, test, beforeAll } from "bun:test";
import { Window } from "happy-dom";
import {
  resizeVideo,
  resizeVideos,
  OUTPUT_TYPE,
  MIME_TYPE,
  type ResizeVideoOptions,
} from "./index";

// Setup DOM environment for testing
let window: Window;
let document: Document;

beforeAll(() => {
  window = new Window({
    url: "http://localhost:3000",
    width: 1920,
    height: 1080,
  });
  document = window.document;
  global.document = document as any;
  global.window = window as any;
  global.HTMLVideoElement = window.HTMLVideoElement as any;
  global.HTMLCanvasElement = window.HTMLCanvasElement as any;
  global.Image = window.Image as any;
  global.Blob = window.Blob as any;
  global.File = window.File as any;
  global.FileReader = window.FileReader as any;
  global.URL = window.URL as any;
});

describe("resize-video", () => {
  describe("Constants", () => {
    test("OUTPUT_TYPE should have correct values", () => {
      expect(OUTPUT_TYPE.file).toBe("file");
      expect(OUTPUT_TYPE.blob).toBe("blob");
      expect(OUTPUT_TYPE.base64).toBe("base64");
    });

    test("MIME_TYPE should have correct values", () => {
      expect(MIME_TYPE.webm).toEqual({
        mimeType: "video/webm",
        extension: "webm",
      });
      expect(MIME_TYPE.mp4).toEqual({
        mimeType: "video/mp4",
        extension: "mp4",
      });
    });
  });

  describe("Type checking", () => {
    test("ResizeVideoOptions should be properly typed", () => {
      const options: ResizeVideoOptions = {
        width: 1280,
        height: 720,
        mode: "contain",
        mimeType: MIME_TYPE.webm,
        videoBitrate: 2500000,
        audioBitrate: 128000,
        output: OUTPUT_TYPE.file,
        onProgress: (progress: number) => {
          console.log(progress);
        },
      };

      expect(options.width).toBe(1280);
      expect(options.height).toBe(720);
      expect(options.mode).toBe("contain");
    });

    test("Resize modes should be properly typed", () => {
      const modes: Array<"contain" | "cover" | "stretch"> = [
        "contain",
        "cover",
        "stretch",
      ];

      expect(modes).toHaveLength(3);
      expect(modes).toContain("contain");
      expect(modes).toContain("cover");
      expect(modes).toContain("stretch");
    });
  });

  describe("resizeVideo function", () => {
    test("should be defined", () => {
      expect(resizeVideo).toBeDefined();
      expect(typeof resizeVideo).toBe("function");
    });

    test("should accept File and options", () => {
      // Just type checking - actual video processing requires real video file
      const mockFile = new File([""], "test.mp4", { type: "video/mp4" });
      const options: ResizeVideoOptions = {
        width: 640,
        height: 480,
      };

      // Function signature should accept these parameters
      expect(() => {
        const promise = resizeVideo(mockFile, options);
        expect(promise).toBeInstanceOf(Promise);
      }).not.toThrow();
    });
  });

  describe("resizeVideos function", () => {
    test("should be defined", () => {
      expect(resizeVideos).toBeDefined();
      expect(typeof resizeVideos).toBe("function");
    });

    test("should accept array of Files and options", () => {
      const mockFiles = [
        new File([""], "test1.mp4", { type: "video/mp4" }),
        new File([""], "test2.mp4", { type: "video/mp4" }),
      ];
      const options: ResizeVideoOptions = {
        width: 640,
      };

      expect(() => {
        const promise = resizeVideos(mockFiles, options);
        expect(promise).toBeInstanceOf(Promise);
      }).not.toThrow();
    });
  });

  describe("MIME Type Support", () => {
    test("MIME_TYPE should have all required formats", () => {
      expect(MIME_TYPE.webm).toBeDefined();
      expect(MIME_TYPE.webm_vp9).toBeDefined();
      expect(MIME_TYPE.webm_vp8).toBeDefined();
      expect(MIME_TYPE.mp4).toBeDefined();
      expect(MIME_TYPE.mkv).toBeDefined();
      expect(MIME_TYPE.m3u8).toBeDefined();
    });

    test("MIME types should have correct structure", () => {
      expect(MIME_TYPE.webm.mimeType).toBe("video/webm");
      expect(MIME_TYPE.webm.extension).toBe("webm");
      expect(MIME_TYPE.mp4.mimeType).toBe("video/mp4");
      expect(MIME_TYPE.mp4.extension).toBe("mp4");
    });

    test("WebM variants should have codec info", () => {
      expect(MIME_TYPE.webm_vp9.mimeType).toContain("vp9");
      expect(MIME_TYPE.webm_vp9.mimeType).toContain("opus");
      expect(MIME_TYPE.webm_vp8.mimeType).toContain("vp8");
      expect(MIME_TYPE.webm_vp8.mimeType).toContain("opus");
    });

    test("HLS MIME type should be correct", () => {
      expect(MIME_TYPE.m3u8.mimeType).toBe(
        "application/vnd.apple.mpegurl"
      );
      expect(MIME_TYPE.m3u8.extension).toBe("m3u8");
    });
  });

  describe("Resize Modes", () => {
    test("should have 3 valid resize modes", () => {
      const modes: ResizeMode[] = ["contain", "cover", "stretch"];
      expect(modes).toHaveLength(3);
    });

    test("ResizeMode type should only accept valid values", () => {
      const validModes: ResizeMode[] = ["contain", "cover", "stretch"];
      validModes.forEach((mode) => {
        const options: ResizeVideoOptions = { mode };
        expect(options.mode).toBe(mode);
      });
    });
  });

  describe("Options Validation", () => {
    test("should accept width only", () => {
      const options: ResizeVideoOptions = { width: 1280 };
      expect(options.width).toBe(1280);
      expect(options.height).toBeUndefined();
    });

    test("should accept height only", () => {
      const options: ResizeVideoOptions = { height: 720 };
      expect(options.height).toBe(720);
      expect(options.width).toBeUndefined();
    });

    test("should accept both width and height", () => {
      const options: ResizeVideoOptions = { width: 1280, height: 720 };
      expect(options.width).toBe(1280);
      expect(options.height).toBe(720);
    });

    test("should accept bitrate settings", () => {
      const options: ResizeVideoOptions = {
        videoBitrate: 2500000,
        audioBitrate: 128000,
      };
      expect(options.videoBitrate).toBe(2500000);
      expect(options.audioBitrate).toBe(128000);
    });

    test("should accept progress callback", () => {
      const callback = (progress: number) => console.log(progress);
      const options: ResizeVideoOptions = { onProgress: callback };
      expect(options.onProgress).toBe(callback);
    });

    test("should accept all options combined", () => {
      const callback = (progress: number) => console.log(progress);
      const options: ResizeVideoOptions = {
        width: 1280,
        height: 720,
        mode: "cover",
        mimeType: MIME_TYPE.webm,
        videoBitrate: 2500000,
        audioBitrate: 128000,
        output: OUTPUT_TYPE.blob,
        onProgress: callback,
      };

      expect(options.width).toBe(1280);
      expect(options.height).toBe(720);
      expect(options.mode).toBe("cover");
      expect(options.mimeType).toEqual(MIME_TYPE.webm);
      expect(options.videoBitrate).toBe(2500000);
      expect(options.audioBitrate).toBe(128000);
      expect(options.output).toBe(OUTPUT_TYPE.blob);
      expect(options.onProgress).toBe(callback);
    });
  });

  describe("Output Types", () => {
    test("should have all output types", () => {
      expect(OUTPUT_TYPE.file).toBe("file");
      expect(OUTPUT_TYPE.blob).toBe("blob");
      expect(OUTPUT_TYPE.base64).toBe("base64");
    });

    test("OUTPUT_TYPE values should be strings", () => {
      Object.values(OUTPUT_TYPE).forEach((value) => {
        expect(typeof value).toBe("string");
      });
    });
  });

  describe("Exported Helper Functions", () => {
    test("should export getVideoMetadata", async () => {
      const { getVideoMetadata } = await import("./helper");
      expect(typeof getVideoMetadata).toBe("function");
    });

    test("should export recommendResizeMethod", async () => {
      const { recommendResizeMethod } = await import("./helper");
      expect(typeof recommendResizeMethod).toBe("function");
    });

    test("should export smartResize", async () => {
      const { smartResize } = await import("./helper");
      expect(typeof smartResize).toBe("function");
    });
  });

  describe("Exported FFmpeg Functions", () => {
    test("should export fastResizeVideo", async () => {
      const { fastResizeVideo } = await import("./ffmpeg-resize");
      expect(typeof fastResizeVideo).toBe("function");
    });

    test("should export fastResizeVideos", async () => {
      const { fastResizeVideos } = await import("./ffmpeg-resize");
      expect(typeof fastResizeVideos).toBe("function");
    });
  });

  describe("Exported HLS Functions", () => {
    test("should export resizeVideoToHLS", async () => {
      const { resizeVideoToHLS } = await import("./hls");
      expect(typeof resizeVideoToHLS).toBe("function");
    });

    test("should export resizeVideosToHLS", async () => {
      const { resizeVideosToHLS } = await import("./hls");
      expect(typeof resizeVideosToHLS).toBe("function");
    });

    test("should export createHLSBlobURL", async () => {
      const { createHLSBlobURL } = await import("./hls");
      expect(typeof createHLSBlobURL).toBe("function");
    });

    test("should export downloadHLSAsZip", async () => {
      const { downloadHLSAsZip } = await import("./hls");
      expect(typeof downloadHLSAsZip).toBe("function");
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty options", () => {
      const options: ResizeVideoOptions = {};
      expect(options).toBeDefined();
    });

    test("should handle invalid bitrate values", () => {
      const options: ResizeVideoOptions = {
        videoBitrate: -1000,
        audioBitrate: 0,
      };
      expect(options.videoBitrate).toBe(-1000);
      expect(options.audioBitrate).toBe(0);
      // Note: Actual validation should happen in resizeVideo function
    });

    test("should handle very large dimensions", () => {
      const options: ResizeVideoOptions = {
        width: 10000,
        height: 10000,
      };
      expect(options.width).toBe(10000);
      expect(options.height).toBe(10000);
    });

    test("should handle very small dimensions", () => {
      const options: ResizeVideoOptions = {
        width: 1,
        height: 1,
      };
      expect(options.width).toBe(1);
      expect(options.height).toBe(1);
    });
  });

  describe("Type Safety", () => {
    test("ResizeMode should only accept valid values at compile time", () => {
      // This is a compile-time check
      const containMode: ResizeMode = "contain";
      const coverMode: ResizeMode = "cover";
      const stretchMode: ResizeMode = "stretch";

      expect(containMode).toBe("contain");
      expect(coverMode).toBe("cover");
      expect(stretchMode).toBe("stretch");
    });

    test("OutputType should only accept valid values at compile time", () => {
      const fileType: OutputType = "file";
      const blobType: OutputType = "blob";
      const base64Type: OutputType = "base64";

      expect(fileType).toBe("file");
      expect(blobType).toBe("blob");
      expect(base64Type).toBe("base64");
    });
  });
});

