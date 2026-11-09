import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";

function MovieDetail() {
  const { id } = useParams(); // Lấy ID phim từ URL: /movie/5 → id = "5"
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);

  // Gọi song song 2 API cùng lúc: chi tiết phim + danh sách tập
  useEffect(() => {
    setLoading(true);
    setError(null);
    window.scrollTo(0, 0); // Cuộn về đầu trang

    Promise.all([
      axios.get(`http://localhost:5000/movies/${id}`),
      axios.get(`http://localhost:5000/movies/${id}/episodes`),
    ])
      .then(([movieRes, episodesRes]) => {
        setMovie(movieRes.data);
        setEpisodes(episodesRes.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi khi lấy dữ liệu:", err);
        setError("Không tìm thấy phim hoặc lỗi kết nối server.");
        setLoading(false);
      });
  }, [id]); // Chạy lại khi id thay đổi

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

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="text-3xl font-extrabold tracking-wider text-red-600 hover:text-red-500 transition-colors"
        >
          FILMWEB
        </Link>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-300 hover:text-white text-sm font-semibold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors"
        >
          ← Trang chủ
        </button>
      </nav>

      {/* ===== HERO BANNER ===== */}
      <section className="relative h-[55vh] overflow-hidden">
        {/* Ảnh nền mờ — phóng to và làm mờ để tạo chiều sâu */}
        <img
          src={posterUrl}
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm opacity-30"
        />
        {/* Gradient phủ lên ảnh nền */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/50 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/60 to-transparent" />
      </section>

      {/* ===== KHU VỰC THÔNG TIN CHÍNH ===== */}
      {/* Kéo lên đè lên Banner bằng margin âm */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 -mt-48">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* ---- POSTER NHỎ BÊN TRÁI ---- */}
          <div className="flex-shrink-0 w-48 md:w-56">
            <img
              src={posterUrl}
              alt={movie.title}
              className="w-full rounded-xl shadow-2xl shadow-black/70 ring-2 ring-white/10"
            />
          </div>

          {/* ---- THÔNG TIN BÊN PHẢI ---- */}
          <div className="flex-1 pt-4">
            {/* Tên phim */}
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 drop-shadow-lg">
              {movie.title}
            </h1>

            {/* ===== HÀNG 1: Badge thông tin nhanh ===== */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {/* Điểm IMDb */}
              <span className="flex items-center gap-1 bg-yellow-400/20 border border-yellow-400/50 text-yellow-400 text-sm font-bold px-3 py-1 rounded-md">
                ⭐ IMDb {movie.imdb_rating ?? "8.5"}
              </span>

              {/* Nhãn phân loại */}
              <span className="bg-zinc-700 border border-zinc-500 text-gray-200 text-sm font-bold px-3 py-1 rounded-md tracking-wide">
                {movie.rating_label ?? "P"}
              </span>

              {/* Năm phát hành */}
              {movie.release_year && (
                <span className="bg-zinc-800 border border-zinc-600 text-gray-300 text-sm font-semibold px-3 py-1 rounded-md">
                  {movie.release_year}
                </span>
              )}

              {/* Thời lượng */}
              <span className="bg-zinc-800 border border-zinc-600 text-gray-300 text-sm font-semibold px-3 py-1 rounded-md">
                🕐 {movie.duration ?? "2h 32m"}
              </span>

              {/* Lượt xem */}
              {movie.view_count !== undefined && (
                <span className="bg-zinc-800 border border-zinc-600 text-gray-400 text-sm px-3 py-1 rounded-md">
                  👁 {movie.view_count.toLocaleString()} lượt xem
                </span>
              )}

              {/* Số tập (nếu có) */}
              {episodes.length > 0 && (
                <span className="bg-red-600/20 border border-red-500/40 text-red-400 text-sm font-semibold px-3 py-1 rounded-md">
                  🎬 {episodes.length} tập
                </span>
              )}
            </div>

            {/* ===== HÀNG 2: Nút Thể loại ===== */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {/* Nếu movie có genres thì map, tạm thời hardcode mẫu */}
              {(movie.genres && movie.genres.length > 0
                ? movie.genres
                : [
                    { id: 1, name: "Hành động" },
                    { id: 2, name: "Khoa học viễn tưởng" },
                    { id: 3, name: "Kinh dị" },
                  ]
              ).map((genre) => (
                <button
                  key={genre.id}
                  className="bg-zinc-900 hover:bg-red-600/20 border border-zinc-600 hover:border-red-500/60
                             text-gray-300 hover:text-red-400 text-sm font-medium px-4 py-1.5 rounded-full
                             transition-all duration-200"
                >
                  {genre.name}
                </button>
              ))}
            </div>

            {/* Nút hành động */}
            <div className="flex flex-wrap gap-3">
              {/* Nút Xem Trailer — nổi bật nhất */}
              <button
                onClick={() => setShowTrailer(true)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-7 py-3 rounded-lg transition-all hover:scale-105 shadow-lg shadow-red-600/30 text-base"
              >
                ▶ Xem Trailer
              </button>

              {/* Nút Xem phim — nếu có tập */}
              {episodes.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedEpisode(episodes[0]);
                    document
                      .getElementById("episodes-section")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex items-center gap-2 bg-white text-black font-bold px-7 py-3 rounded-lg transition-all hover:scale-105 hover:bg-gray-100 text-base"
                >
                  🎞 Xem phim
                </button>
              )}

              {/* Nút Lưu */}
              <button className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-5 py-3 rounded-lg transition-colors text-base border border-zinc-600">
                + Lưu phim
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DANH SÁCH TẬP PHIM ===== */}
      {episodes.length > 0 && (
        <section
          id="episodes-section"
          className="max-w-6xl mx-auto px-6 mt-14 scroll-mt-20"
        >
          <h2 className="text-2xl font-bold mb-5 border-l-4 border-red-600 pl-4">
            Danh sách tập phim
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
            {episodes
              .slice()
              .sort((a, b) => a.episode_number - b.episode_number)
              .map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => setSelectedEpisode(ep)}
                  className={`py-3 rounded-lg font-bold text-sm transition-all hover:scale-105 ${
                    selectedEpisode?.id === ep.id
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/40"
                      : "bg-zinc-800 hover:bg-zinc-700 text-gray-200 border border-zinc-700"
                  }`}
                >
                  Tập {ep.episode_number}
                </button>
              ))}
          </div>

          {/* Video Player khi đã chọn tập */}
          {selectedEpisode && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-300">
                Đang xem:{" "}
                <span className="text-white">
                  Tập {selectedEpisode.episode_number}
                </span>
              </h3>
              {selectedEpisode.video_url ? (
                <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
                  <video
                    key={selectedEpisode.id}
                    controls
                    autoPlay
                    className="w-full h-full"
                    src={selectedEpisode.video_url}
                  >
                    Trình duyệt không hỗ trợ phát video.
                  </video>
                </div>
              ) : (
                <div className="aspect-video rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-700">
                  <p className="text-gray-500 text-lg">
                    🎬 Chưa có link video cho tập này
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

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
    </div>
  );
}

export default MovieDetail;

