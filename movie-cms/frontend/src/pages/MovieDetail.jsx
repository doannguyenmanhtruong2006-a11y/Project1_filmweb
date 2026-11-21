import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import VideoPlayer from "../components/VideoPlayer";
import ProfileModal from "../components/ProfileModal";

function MovieDetail() {
  const { id } = useParams(); // Lấy ID phim từ URL: /movie/5 → id = "5"
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [initialSeekTime, setInitialSeekTime] = useState(0);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Quản lý Bookmark (Phim yêu thích)
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [bookmarkToast, setBookmarkToast] = useState("");

  // Trạng thái người dùng đã đăng nhập (lấy từ localStorage)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
    setIsBookmarked(false);
  };

  // Gọi API: chi tiết phim + danh sách tập + kiểm tra bookmark
  useEffect(() => {
    setLoading(true);
    setError(null);
    window.scrollTo(0, 0); // Cuộn về đầu trang

    // Kiểm tra lịch sử xem trong localStorage cho phim này
    let savedProgress = null;
    try {
      const historyRaw = localStorage.getItem("filmweb_watch_history");
      if (historyRaw) {
        const historyList = JSON.parse(historyRaw);
        savedProgress = historyList.find((h) => String(h.movieId) === String(id));
      }
    } catch (e) {
      console.warn("Lỗi đọc lịch sử xem:", e);
    }

    const token = localStorage.getItem("token");
    const checkBookmarkPromise = token
      ? axios
          .get(`http://localhost:5000/bookmarks/check/${id}`, {
            headers: { Authorization: token },
          })
          .catch(() => ({ data: { is_bookmarked: false } }))
      : Promise.resolve({ data: { is_bookmarked: false } });

    Promise.all([
      axios.get(`http://localhost:5000/movies/${id}`),
      axios.get(`http://localhost:5000/movies/${id}/episodes`),
      checkBookmarkPromise,
    ])
      .then(([movieRes, episodesRes, bookmarkRes]) => {
        setMovie(movieRes.data);
        const epData = episodesRes.data || [];
        setEpisodes(epData);

        // Khôi phục tập phim & thời gian đã xem trước đó
        if (savedProgress && epData.length > 0) {
          const matchedEp = epData.find(
            (ep) => ep.id === savedProgress.episodeId || ep.episode_number === savedProgress.episodeNumber
          );
          if (matchedEp) {
            setSelectedEpisode(matchedEp);
            setInitialSeekTime(savedProgress.currentTime || 0);
          } else {
            setSelectedEpisode(epData[0]);
          }
        } else if (epData.length > 0) {
          setSelectedEpisode(epData[0]);
        }

        setIsBookmarked(bookmarkRes.data?.is_bookmarked || false);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi khi lấy dữ liệu:", err);
        setError("Không tìm thấy phim hoặc lỗi kết nối server.");
        setLoading(false);
      });
  }, [id]); // Chạy lại khi id thay đổi

  // Xử lý Lưu / Bỏ lưu Bookmark
  const handleToggleBookmark = async () => {
    const token = localStorage.getItem("token");
    if (!token || !currentUser) {
      if (
        window.confirm(
          "Bạn cần đăng nhập để lưu phim vào danh sách yêu thích.\n\nBạn có muốn chuyển đến trang Đăng nhập ngay bây giờ không?"
        )
      ) {
        navigate("/login");
      }
      return;
    }

    try {
      setBookmarkLoading(true);
      const res = await axios.post(
        `http://localhost:5000/bookmarks/toggle/${id}`,
        {},
        { headers: { Authorization: token } }
      );

      const newStatus = res.data.is_bookmarked;
      setIsBookmarked(newStatus);
      setBookmarkToast(res.data.message);
      setTimeout(() => setBookmarkToast(""), 3500);
      setBookmarkLoading(false);
    } catch (err) {
      console.error("Lỗi khi toggle bookmark:", err);
      alert("Lỗi khi cập nhật bookmark: " + (err.response?.data?.error || err.message));
      setBookmarkLoading(false);
    }
  };

  // Xử lý Tăng lượt xem khi xem video
  const handleViewCount = async () => {
    try {
      const res = await axios.post(`http://localhost:5000/movies/${id}/view`);
      if (res.data?.view_count !== undefined) {
        setMovie((prev) => (prev ? { ...prev, view_count: res.data.view_count } : prev));
      }
    } catch (err) {
      console.warn("Lỗi khi cập nhật lượt xem:", err);
    }
  };

  // ===== LOADING SKELETON =====
  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white">
        <div className="animate-pulse">
          <div className="h-[55vh] bg-zinc-800" />
          <div className="max-w-6xl mx-auto px-6 py-10 flex gap-8">
            <div className="w-56 h-80 bg-zinc-800 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-4 pt-4">
              <div className="h-10 bg-zinc-800 rounded w-3/4" />
              <div className="h-5 bg-zinc-800 rounded w-1/4" />
              <div className="h-4 bg-zinc-800 rounded w-full" />
              <div className="h-4 bg-zinc-800 rounded w-full" />
              <div className="h-4 bg-zinc-800 rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== TRANG LỖI =====
  if (error || !movie) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex flex-col items-center justify-center gap-6">
        <div className="text-6xl">🎬</div>
        <h2 className="text-2xl font-bold text-gray-300">
          {error || "Không tìm thấy phim"}
        </h2>
        <button
          onClick={() => navigate("/")}
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded transition-colors"
        >
          ← Quay về trang chủ
        </button>
      </div>
    );
  }

  const posterUrl =
    movie.poster_url ||
    movie.thumbnail_url ||
    "https://via.placeholder.com/400x600?text=No+Image";

  // Ảnh độ phân giải cao cho background
  const backdropUrl = posterUrl.replace("/w500/", "/original/");

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-3xl font-extrabold tracking-wider text-red-600 hover:text-red-500 transition-colors"
          >
            FILMWEB
          </Link>
          <button
            onClick={() => navigate("/")}
            className="hidden sm:flex items-center gap-2 text-gray-300 hover:text-white text-xs font-semibold bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-full transition-colors"
          >
            ← Trang chủ
          </button>
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              {currentUser.role === "ADMIN" && (
                <Link
                  to="/admin"
                  className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <span>⚙️ Quản trị</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                title="Xem hồ sơ & Đổi mật khẩu"
                className="flex items-center gap-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-zinc-500 px-3 py-1 rounded-full transition-all group cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center font-bold text-white text-[11px] group-hover:scale-105 transition-transform">
                  {currentUser.username ? currentUser.username.slice(0, 2).toUpperCase() : "U"}
                </div>
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-white max-w-[110px] truncate">
                  {currentUser.username || currentUser.email}
                </span>
                <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200">⚙️</span>
              </button>

              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="text-xs text-zinc-400 hover:text-red-400 font-semibold px-2 py-1.5 transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/")}
                className="sm:hidden flex items-center gap-1 text-gray-300 hover:text-white text-xs font-semibold bg-white/10 px-3 py-1.5 rounded-full"
              >
                ← Về chủ
              </button>
              <Link
                to="/login"
                className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold px-4 py-1.5 rounded transition-colors"
              >
                Đăng nhập
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ===== HERO BANNER ===== */}
      <section className="relative h-[55vh] overflow-hidden">
        {/* Ảnh nền sắc nét kết hợp làm mờ và tối để tôn phần thông tin */}
        <img
          src={backdropUrl}
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover scale-105 blur-sm opacity-30"
        />
        {/* Gradient phủ lên ảnh nền */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/80 to-transparent" />
      </section>

      {/* ===== KHU VỰC THÔNG TIN CHÍNH ===== */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 -mt-48">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* ---- POSTER NHỎ BÊN TRÁI ---- */}
          <div className="flex-shrink-0 w-48 md:w-56">
            <img
              src={posterUrl}
              alt={movie.title}
              className="w-full rounded-xl shadow-2xl shadow-black/80 ring-2 ring-white/10 aspect-[2/3] object-cover"
            />
          </div>

          {/* ---- THÔNG TIN BÊN PHẢI ---- */}
          <div className="flex-1 pt-4">
            {/* Tên phim */}
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 drop-shadow-lg">
              {movie.title}
            </h1>

            {/* ===== HÀNG 1: Badge thông số thật từ Database ===== */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {/* Điểm IMDb thật */}
              {movie.imdb_score && (
                <span className="flex items-center gap-1 bg-yellow-400/20 border border-yellow-400/50 text-yellow-400 text-sm font-bold px-3 py-1 rounded-md">
                  ⭐ IMDb {movie.imdb_score}
                </span>
              )}

              {/* Nhãn phân loại độ tuổi thật */}
              {movie.age_rating && (
                <span className="bg-zinc-700/80 border border-zinc-500 text-gray-200 text-sm font-bold px-3 py-1 rounded-md tracking-wide">
                  {movie.age_rating}
                </span>
              )}

              {/* Năm phát hành thật */}
              {movie.release_year && (
                <span className="bg-zinc-800 border border-zinc-600 text-gray-300 text-sm font-semibold px-3 py-1 rounded-md">
                  📅 {movie.release_year}
                </span>
              )}

              {/* Thời lượng thật */}
              {movie.duration_min && (
                <span className="bg-zinc-800 border border-zinc-600 text-gray-300 text-sm font-semibold px-3 py-1 rounded-md">
                  🕐 {movie.duration_min} phút
                </span>
              )}

              {/* Quốc gia thật */}
              {movie.country && (
                <span className="bg-zinc-800 border border-zinc-600 text-gray-300 text-sm font-semibold px-3 py-1 rounded-md">
                  🌍 {movie.country}
                </span>
              )}

              {/* Đạo diễn thật */}
              {movie.director && (
                <span className="bg-zinc-800 border border-zinc-600 text-gray-300 text-sm font-semibold px-3 py-1 rounded-md">
                  🎬 ĐD: {movie.director}
                </span>
              )}

              {/* Lượt xem */}
              {movie.view_count !== undefined && (
                <span className="bg-zinc-800 border border-zinc-600 text-gray-400 text-sm px-3 py-1 rounded-md">
                  👁 {movie.view_count.toLocaleString()} lượt xem
                </span>
              )}

              {/* Số tập */}
              {episodes.length > 0 && (
                <span className="bg-red-600/20 border border-red-500/40 text-red-400 text-sm font-semibold px-3 py-1 rounded-md">
                  🎞 {episodes.length} tập
                </span>
              )}
            </div>

            {/* ===== HÀNG 2: Thể loại thật từ Database ===== */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {movie.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="bg-zinc-900 hover:bg-red-600/20 border border-zinc-700 hover:border-red-500/50
                               text-gray-300 hover:text-red-400 text-xs font-semibold px-3.5 py-1.5 rounded-full
                               transition-colors cursor-default"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            {/* Nút hành động */}
            <div className="flex flex-wrap gap-3">
              {/* Nút Xem Trailer */}
              <button
                onClick={() => setShowTrailer(true)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-7 py-3 rounded-lg transition-all hover:scale-105 shadow-lg shadow-red-600/30 text-base"
              >
                ▶ Xem Trailer
              </button>

              {/* Nút Xem phim */}
              <button
                onClick={() => {
                  if (!selectedEpisode && episodes.length > 0) {
                    setSelectedEpisode(episodes[0]);
                  }
                  document
                    .getElementById("episodes-section")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center gap-2 bg-white text-black font-bold px-7 py-3 rounded-lg transition-all hover:scale-105 hover:bg-gray-100 text-base shadow-lg"
              >
                🎞 Xem phim
              </button>

              {/* Nút Lưu Bookmark */}
              <button
                onClick={handleToggleBookmark}
                disabled={bookmarkLoading}
                className={`flex items-center gap-2 font-bold px-6 py-3 rounded-lg transition-all active:scale-95 text-base border ${
                  isBookmarked
                    ? "bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/50 shadow-lg shadow-red-600/20"
                    : "bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-600"
                }`}
              >
                {bookmarkLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isBookmarked ? (
                  <>
                    <svg className="w-5 h-5 text-red-500 fill-current" viewBox="0 0 24 24">
                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span>✓ Đã lưu yêu thích</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span>+ Lưu vào yêu thích</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== KHU VỰC PHÁT VIDEO PLAYER (VIDEO.JS) & DANH SÁCH TẬP ===== */}
      <section
        id="episodes-section"
        className={`mx-auto px-6 mt-14 scroll-mt-20 transition-all duration-300 ${
          isCinemaMode ? "max-w-full px-2 sm:px-8" : "max-w-6xl"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 border-l-4 border-red-600 pl-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span>Trình phát Video</span>
              {selectedEpisode && (
                <span className="text-sm font-semibold bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full">
                  Đang phát: Tập {selectedEpisode.episode_number}
                </span>
              )}
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Phát trực tiếp với Video.js Engine • Hỗ trợ Full HD 1080p, HLS Streaming (.m3u8), tua 10s & chế độ rạp
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCinemaMode((prev) => !prev)}
              className={`text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg border transition-all ${
                isCinemaMode
                  ? "bg-amber-500 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/20"
                  : "bg-zinc-800 hover:bg-zinc-700 text-gray-200 border-zinc-700"
              }`}
            >
              🎬 {isCinemaMode ? "Thu nhỏ chế độ rạp" : "Mở rộng chế độ Rạp phim"}
            </button>
          </div>
        </div>

        {/* Video Player Component */}
        {selectedEpisode ? (
          <div className="mb-8">
            <VideoPlayer
              key={`${selectedEpisode.id}-${initialSeekTime}`}
              src={selectedEpisode.video_url}
              poster={backdropUrl || posterUrl}
              title={movie.title}
              movieId={Number(id)}
              episodeId={selectedEpisode.id}
              episodeNumber={selectedEpisode.episode_number}
              initialTime={initialSeekTime}
              hasNextEpisode={Boolean(
                episodes.find(
                  (ep) => ep.episode_number === selectedEpisode.episode_number + 1
                )
              )}
              onNextEpisode={() => {
                const next = episodes.find(
                  (ep) => ep.episode_number === selectedEpisode.episode_number + 1
                );
                if (next) {
                  setSelectedEpisode(next);
                  setInitialSeekTime(0);
                }
              }}
              isCinemaMode={isCinemaMode}
              onToggleCinemaMode={() => setIsCinemaMode((prev) => !prev)}
              onViewCount={handleViewCount}
            />
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center mb-8">
            <p className="text-gray-400 mb-4">Chưa có tập phim chính thức cho phim này.</p>
            <button
              onClick={() =>
                setSelectedEpisode({
                  id: "demo",
                  episode_number: 1,
                  video_url: "https://vjs.zencdn.net/v/oceans.mp4",
                })
              }
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-lg transition-colors"
            >
              🎬 Trải nghiệm Video.js Player (Bản Demo)
            </button>
          </div>
        )}

        {/* Danh sách các tập phim */}
        {episodes.length > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                <span>🎞 Chọn tập phim ({episodes.length} tập)</span>
              </h3>
              <span className="text-xs text-gray-400">
                Click vào tập để chuyển video ngay lập tức
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {[...episodes]
                .sort((a, b) => a.episode_number - b.episode_number)
                .map((ep) => {
                  const isActive = selectedEpisode?.id === ep.id;
                  const isHls = ep.video_url && ep.video_url.includes(".m3u8");

                  return (
                    <button
                      key={ep.id}
                      onClick={() => {
                        setSelectedEpisode(ep);
                        setInitialSeekTime(0);
                      }}
                      className={`relative p-3.5 rounded-xl font-bold text-sm transition-all flex flex-col items-center justify-center gap-1 hover:scale-105 active:scale-95 ${
                        isActive
                          ? "bg-red-600 text-white shadow-xl shadow-red-600/40 ring-2 ring-red-400"
                          : "bg-zinc-800/90 hover:bg-zinc-700 text-gray-200 border border-zinc-700/80"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {isActive && <span className="animate-pulse">▶</span>}
                        <span>Tập {ep.episode_number}</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
                          isActive
                            ? "bg-black/30 text-white"
                            : isHls
                            ? "bg-purple-900/50 text-purple-300 border border-purple-500/30"
                            : "bg-blue-900/50 text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        {isHls ? "HLS" : "1080P"}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </section>

      {/* ===== NỘI DUNG ĐẦY ĐỦ ===== */}
      {movie.description && (
        <section className="max-w-6xl mx-auto px-6 mt-14">
          <h2 className="text-2xl font-bold mb-4 border-l-4 border-red-600 pl-4">
            Nội dung phim
          </h2>
          <p className="text-gray-300 text-base leading-relaxed bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            {movie.description}
          </p>
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-zinc-800 px-6 py-10 mt-16 text-gray-500 text-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p>© 2026 FILMWEB. Dự án học tập.</p>
          <Link to="/" className="hover:text-gray-300 transition-colors">
            ← Về trang chủ
          </Link>
        </div>
      </footer>

      {/* ===== MODAL TRAILER ===== */}
      {showTrailer && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowTrailer(false)}
        >
          <div
            className="relative w-full max-w-4xl bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng modal */}
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black text-white w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold transition-colors"
            >
              ✕
            </button>
            {/* Nhúng YouTube tìm Trailer theo tên phim */}
            <div className="aspect-video">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(
                  movie.title + " official trailer"
                )}&autoplay=1`}
                title={`${movie.title} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4 border-t border-zinc-700">
              <p className="text-gray-300 font-semibold">{movie.title} — Trailer</p>
              <p className="text-gray-500 text-sm mt-1">
                Bấm ra ngoài hoặc ✕ để đóng
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast thông báo Bookmark */}
      {bookmarkToast && (
        <div className="fixed bottom-8 right-8 z-50 bg-zinc-900 border border-zinc-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in border-amber-500/30">
          <span className="text-xl">{isBookmarked ? "💖" : "🗑️"}</span>
          <span className="text-sm font-semibold">{bookmarkToast}</span>
        </div>
      )}

      {/* Modal Hồ sơ Cá nhân & Đổi mật khẩu */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        onUserUpdated={(updated) => setCurrentUser(updated)}
      />
    </div>
  );
}

export default MovieDetail;

