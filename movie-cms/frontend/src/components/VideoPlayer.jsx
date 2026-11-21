import React, { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

/**
 * Modern VideoPlayer Component built on video.js
 * Supports MP4, WebM and HLS (.m3u8) streams.
 * Features Cinema Mode, 10s skip controls, playback speed selector, and dark cinema theme.
 */
export function VideoPlayer({
  src,
  poster,
  title,
  episodeNumber,
  hasNextEpisode = false,
  onNextEpisode,
  isCinemaMode = false,
  onToggleCinemaMode,
}) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Helper function to detect MIME type from URL
  const getVideoType = (url) => {
    if (!url) return "video/mp4";
    if (url.includes(".m3u8")) return "application/x-mpegURL";
    if (url.includes(".webm")) return "video/webm";
    if (url.includes(".ogg")) return "video/ogg";
    return "video/mp4";
  };

  // Initialize Video.js Player on mount
  useEffect(() => {
    if (!videoRef.current) return;

    // Create a video-js element inside the wrapper
    const videoElement = document.createElement("video-js");
    videoElement.classList.add(
      "vjs-default-skin",
      "vjs-big-play-centered",
      "vjs-theme-filmweb"
    );
    videoRef.current.appendChild(videoElement);

    const initialType = getVideoType(src);

    const playerOptions = {
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: true,
      preload: "auto",
      poster: poster || "",
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      sources: src
        ? [
            {
              src: src,
              type: initialType,
            },
          ]
        : [],
      controlBar: {
        playToggle: true,
        volumePanel: { inline: false },
        currentTimeDisplay: true,
        timeDivider: true,
        durationDisplay: true,
        progressControl: true,
        fullscreenToggle: true,
      },
    };

    let player = null;
    try {
      player = playerRef.current = videojs(videoElement, playerOptions, () => {
        setLoadError(null);
      });

      // Event listeners
      player.on("play", () => setIsPlaying(true));
      player.on("pause", () => setIsPlaying(false));
      player.on("ended", () => {
        setIsPlaying(false);
        if (hasNextEpisode && onNextEpisode) {
          onNextEpisode();
        }
      });
      player.on("error", () => {
        const err = player.error();
        console.warn("Video.js playback error:", err);
        setLoadError("Không thể phát video từ nguồn này. Vui lòng thử lại hoặc chọn tập khác.");
      });
    } catch (err) {
      console.error("Lỗi khởi tạo Video.js:", err);
      setLoadError("Không thể khởi tạo trình phát video: " + err.message);
    }

    // Cleanup on unmount
    return () => {
      if (player && !player.isDisposed()) {
        try {
          player.dispose();
        } catch (e) {
          console.warn("Lỗi khi dispose player:", e);
        }
        playerRef.current = null;
      }
    };
  }, []); // Run once on mount

  // React to dynamic changes in src or poster (e.g. changing episodes)
  useEffect(() => {
    const player = playerRef.current;
    if (player && !player.isDisposed() && src) {
      setLoadError(null);
      const type = getVideoType(src);
      player.pause();
      player.src({ src, type });
      if (poster) {
        player.poster(poster);
      }
      player.load();
    }
  }, [src, poster]);

  // Fast forward / Rewind 10 seconds
  const handleSeek = (seconds) => {
    const player = playerRef.current;
    if (player && !player.isDisposed()) {
      const current = player.currentTime() || 0;
      player.currentTime(Math.max(0, current + seconds));
    }
  };

  return (
    <div className="relative group bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 select-none aspect-video flex flex-col justify-center">
      {/* Top Header Overlay inside Player */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-90 transition-opacity hover:opacity-100 pointer-events-auto">
        <div className="flex items-center gap-3">
          <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded shadow-md tracking-wider">
            {src && src.includes(".m3u8") ? "HLS STREAM" : "FULL HD"}
          </span>
          <span className="text-sm font-semibold text-gray-200 drop-shadow">
            {title} {episodeNumber ? `• Tập ${episodeNumber}` : ""}
          </span>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-2">
          {/* Tua lại 10s */}
          <button
            onClick={() => handleSeek(-10)}
            title="Lùi lại 10 giây (Phím ←)"
            className="bg-black/60 hover:bg-black/80 text-white/90 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border border-white/10 transition-all hover:scale-105"
          >
            ↺ 10s
          </button>

          {/* Tua đi 10s */}
          <button
            onClick={() => handleSeek(10)}
            title="Tua tới 10 giây (Phím →)"
            className="bg-black/60 hover:bg-black/80 text-white/90 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border border-white/10 transition-all hover:scale-105"
          >
            10s ↻
          </button>

          {/* Nút Tập tiếp theo */}
          {hasNextEpisode && onNextEpisode && (
            <button
              onClick={onNextEpisode}
              title="Chuyển sang tập tiếp theo"
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg shadow-red-600/30 transition-all hover:scale-105"
            >
              Tập kế ⏭️
            </button>
          )}

          {/* Nút Bật/Tắt Rạp chiếu phim (Cinema Mode) */}
          {onToggleCinemaMode && (
            <button
              onClick={onToggleCinemaMode}
              title={isCinemaMode ? "Thu nhỏ chế độ rạp" : "Mở rộng chế độ rạp chiếu phim"}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all hover:scale-105 ${
                isCinemaMode
                  ? "bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20"
                  : "bg-black/60 hover:bg-black/80 text-white/90 border-white/10"
              }`}
            >
              🎬 {isCinemaMode ? "Thu nhỏ" : "Chế độ Rạp"}
            </button>
          )}
        </div>
      </div>

      {/* Video.js Container Element */}
      <div data-vjs-player className="w-full">
        <div ref={videoRef} />
      </div>

      {/* Thông báo lỗi phát video nếu có */}
      {loadError && (
        <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h4 className="text-lg font-bold text-white mb-2">Lỗi tải luồng video</h4>
          <p className="text-sm text-gray-300 max-w-md mb-4">{loadError}</p>
          <button
            onClick={() => {
              setLoadError(null);
              if (playerRef.current) {
                playerRef.current.load();
                playerRef.current.play().catch(() => {});
              }
            }}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
          >
            Thử lại ngay
          </button>
        </div>
      )}

      {/* Phím tắt tiện ích góc dưới */}
      <div className="hidden group-hover:flex absolute bottom-14 left-4 z-20 items-center gap-3 text-[11px] text-gray-400 bg-black/70 px-3 py-1 rounded-full border border-white/10 pointer-events-none">
        <span>Space: Phát/Tạm dừng</span>
        <span>•</span>
        <span>← / →: Tua 10s</span>
        <span>•</span>
        <span>F: Toàn màn hình</span>
      </div>
    </div>
  );
}

export default VideoPlayer;

