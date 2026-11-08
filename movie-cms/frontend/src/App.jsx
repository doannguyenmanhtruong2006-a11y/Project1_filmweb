import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Lấy 6 phim đầu tiên có ảnh làm slideshow banner
  const featuredMovies = movies.filter((m) => m.poster_url || m.thumbnail_url).slice(1, 7);

  // Chuyển ảnh sang độ phân giải cao cho banner (w500 → original)
  const getHiResImage = (url) => {
    if (!url) return "";
    return url.replace("/w500/", "/original/");
  };

  // Phim đang hiển thị trên banner
  const heroMovie = featuredMovies[currentSlide] || null;

  // Gọi API backend lấy danh sách phim khi component được mount
  useEffect(() => {
    axios
      .get("http://localhost:5000/movies")
      .then((res) => {
        // Lọc trùng lặp theo tiêu đề phim để đảm bảo an toàn
        const uniqueMovies = Array.from(
          new Map(res.data.map((m) => [m.title, m])).values()
        );
        setMovies(uniqueMovies);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi khi lấy dữ liệu phim:", err);
        setLoading(false);
      });
  }, []);

  // Tự động đổi banner mỗi 4 giây
  useEffect(() => {
    if (featuredMovies.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredMovies.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [featuredMovies.length]);

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent px-6 py-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-wider text-red-600">
          FILMWEB
        </h1>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Tìm kiếm phim..."
            className="bg-black/60 border border-gray-600 rounded px-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-red-500 transition-colors w-64"
          />
          <button className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded transition-colors">
            Đăng nhập
          </button>
        </div>
      </nav>

      {/* ===== HERO BANNER SLIDESHOW ===== */}
      <section className="relative h-[70vh] flex items-end pb-16 px-6 overflow-hidden">
        {/* Tất cả ảnh nền xếp chồng, chỉ ảnh hiện tại có opacity-100 */}
        {featuredMovies.map((movie, index) => (
          <img
            key={movie.id}
            src={getHiResImage(movie.poster_url || movie.thumbnail_url)}
            alt={movie.title}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
          />
        ))}

        {/* Gradient overlay để text đọc được */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/80 to-transparent" />

        {/* Nội dung text */}
        <div className="relative max-w-2xl z-10">
          <h2
            key={heroMovie?.id}
            className="text-5xl font-extrabold mb-4 drop-shadow-lg animate-fadeIn"
          >
            {heroMovie ? heroMovie.title : "Chào mừng đến FILMWEB"}
          </h2>
          <p
            key={`desc-${heroMovie?.id}`}
            className="text-gray-300 text-lg mb-6 line-clamp-3 animate-fadeIn"
          >
            {heroMovie
              ? heroMovie.description
              : "Khám phá kho phim khổng lồ với hàng trăm bộ phim hấp dẫn."}
          </p>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded hover:bg-gray-200 transition-colors">
              ▶ Xem ngay
            </button>
            <button className="flex items-center gap-2 bg-gray-600/70 text-white font-bold px-6 py-3 rounded hover:bg-gray-600 transition-colors">
              ℹ Thông tin thêm
            </button>
          </div>

          {/* Chấm chỉ slide hiện tại */}
          {featuredMovies.length > 1 && (
            <div className="flex gap-2 mt-6">
              {featuredMovies.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1 rounded-full transition-all duration-300 ${index === currentSlide
                      ? "w-8 bg-red-500"
                      : "w-4 bg-gray-500 hover:bg-gray-400"
                    }`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== DANH SÁCH PHIM ===== */}
      <main className="px-6 pb-16 -mt-10 relative z-10">
        <h3 className="text-2xl font-bold mb-6">🔥 Phim phổ biến</h3>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-800 rounded-lg aspect-[2/3] animate-pulse"
              />
            ))}
          </div>
        ) : (
          /* Grid danh sách phim */
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="group relative rounded-lg overflow-hidden cursor-pointer shadow-lg
                           transition-transform duration-300 ease-in-out hover:scale-105"
              >
                {/* Ảnh poster */}
                <img
                  src={movie.poster_url || movie.thumbnail_url || "https://via.placeholder.com/300x450?text=No+Image"}
                  alt={movie.title}
                  className="w-full aspect-[2/3] object-cover"
                />

                {/* Overlay gradient khi hover */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300
                              flex flex-col justify-end p-4"
                >
                  {/* Tên phim */}
                  <h4 className="text-white font-bold text-sm leading-tight mb-1 drop-shadow-md">
                    {movie.title}
                  </h4>

                  {/* Năm phát hành */}
                  {movie.release_year && (
                    <span className="text-gray-300 text-xs">
                      {movie.release_year}
                    </span>
                  )}

                  {/* Nút hành động */}
                  <div className="flex gap-2 mt-3">
                    <button className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded hover:bg-gray-200 transition-colors">
                      ▶ Xem
                    </button>
                    <button className="bg-gray-600/80 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-gray-500 transition-colors">
                      + Lưu
                    </button>
                  </div>
                </div>

                {/* Badge năm - hiện mặc định, ẩn khi hover */}
                {movie.release_year && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded group-hover:opacity-0 transition-opacity">
                    {movie.release_year}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-gray-800 px-6 py-10 text-gray-500 text-sm">
        <div className="max-w-6xl mx-auto">
          <p className="mb-4">© 2026 FILMWEB. Dự án học tập.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-300 transition-colors">Trang chủ</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Thể loại</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Liên hệ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
