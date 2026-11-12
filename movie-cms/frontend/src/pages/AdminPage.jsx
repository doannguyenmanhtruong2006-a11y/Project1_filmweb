import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function AdminPage() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("movies");
  const [moviesList, setMoviesList] = useState([]);
  const [genresList, setGenresList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Thông tin Admin đăng nhập
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedMovies, setSelectedMovies] = useState([]);

  // Phân trang bảng
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Gọi API lấy dữ liệu thật từ Backend
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [moviesRes, genresRes] = await Promise.all([
        axios.get("http://localhost:5000/movies"),
        axios.get("http://localhost:5000/genres"),
      ]);

      setMoviesList(moviesRes.data);
      setGenresList(genresRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
      setError("Không thể kết nối đến máy chủ Backend (http://localhost:5000). Vui lòng đảm bảo backend đang chạy.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Xóa 1 phim qua API Backend
  const handleDeleteMovie = async (id, title) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bộ phim "${title}" khỏi cơ sở dữ liệu?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/movies/${id}`, {
        headers: token ? { Authorization: token } : {},
      });

      // Cập nhật lại danh sách trên giao diện
      setMoviesList((prev) => prev.filter((m) => m.id !== id));
      setSelectedMovies((prev) => prev.filter((item) => item !== id));
      alert(`Đã xóa thành công phim: "${title}"`);
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        alert("⚠️ Bạn chưa có thẻ Token Admin hợp lệ hoặc chưa đăng nhập. Vui lòng đăng nhập tài khoản ADMIN để thực hiện thao tác xóa!");
      } else {
        alert("Lỗi khi xóa phim: " + (err.response?.data?.error || err.message));
      }
    }
  };

  // Chọn / Bỏ chọn tất cả phim ở trang hiện tại
  const handleSelectAll = (e, currentVisibleMovies) => {
    if (e.target.checked) {
      const idsToAdd = currentVisibleMovies.map((m) => m.id);
      setSelectedMovies((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    } else {
      const idsToRemove = currentVisibleMovies.map((m) => m.id);
      setSelectedMovies((prev) => prev.filter((id) => !idsToRemove.includes(id)));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedMovies((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Lọc và sắp xếp dữ liệu thật
  const filteredMovies = moviesList
    .filter((m) => {
      const matchSearch =
        m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.director?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.country?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchGenre =
        selectedGenre === "all" ||
        m.genres?.some((g) => g.id.toString() === selectedGenre.toString() || g.name === selectedGenre);

      return matchSearch && matchGenre;
    })
    .sort((a, b) => {
      if (sortBy === "score") {
        return (b.imdb_score || 0) - (a.imdb_score || 0);
      }
      if (sortBy === "year") {
        return (b.release_year || 0) - (a.release_year || 0);
      }
      if (sortBy === "views") {
        return (b.view_count || 0) - (a.view_count || 0);
      }
      // "newest" theo ID giảm dần
      return b.id - a.id;
    });

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMovies = filteredMovies.slice(indexOfFirstItem, indexOfLastItem);

  // Tính toán số liệu thống kê thật từ Database
  const totalViews = moviesList.reduce((acc, m) => acc + (m.view_count || 0), 0);
  const scoredMovies = moviesList.filter((m) => m.imdb_score);
  const avgScore = scoredMovies.length > 0
    ? (scoredMovies.reduce((acc, m) => acc + m.imdb_score, 0) / scoredMovies.length).toFixed(1)
    : "8.0";

  return (
    <div className="flex h-screen bg-[#0f0f12] text-zinc-100 font-sans overflow-hidden antialiased">
      {/* ============================================================== */}
      {/* SIDEBAR BÊN TRÁI                                              */}
      {/* ============================================================== */}
      <aside className="w-64 flex-shrink-0 bg-[#16161c] border-r border-zinc-800/80 flex flex-col justify-between">
        <div>
          {/* Logo & Brand */}
          <div className="h-18 px-6 flex items-center gap-3 border-b border-zinc-800/80 py-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-600/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-wider text-lg text-white">
                  FILM<span className="text-red-500">WEB</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                  CMS
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">Bảng điều hành quản trị</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="px-3 py-6 space-y-1.5">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Quản lý hệ thống
            </div>

            {/* Menu 1: Bảng điều khiển */}
            <button
              onClick={() => setActiveMenu("dashboard")}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeMenu === "dashboard"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Bảng điều khiển</span>
            </button>

            {/* Menu 2: Quản lý Phim */}
            <button
              onClick={() => setActiveMenu("movies")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeMenu === "movies"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Quản lý Phim</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeMenu === "movies" ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {moviesList.length}
              </span>
            </button>

            {/* Menu 3: Quản lý Thể loại */}
            <button
              onClick={() => setActiveMenu("genres")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeMenu === "genres"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>Quản lý Thể loại</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-zinc-800 text-zinc-400">
                {genresList.length}
              </span>
            </button>

            {/* Menu 4: Người dùng */}
            <button
              onClick={() => setActiveMenu("users")}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeMenu === "users"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Người dùng</span>
            </button>
          </div>
        </div>

        {/* User Card & Action Bottom */}
        <div className="p-4 border-t border-zinc-800/80 space-y-3">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800/40 hover:bg-zinc-800 transition-colors border border-zinc-700/50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Xem trang Web (Trang chủ)</span>
          </Link>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center font-bold text-white text-xs">
                  {currentUser?.username
                    ? currentUser.username.slice(0, 2).toUpperCase()
                    : "AD"}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#16161c] rounded-full"></span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate max-w-[110px]">
                  {currentUser?.username || "Admin"}
                </p>
                <p className="text-[10px] text-zinc-400 truncate max-w-[110px]">
                  {currentUser?.email || "admin@filmweb.vn"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                alert("Đã đăng xuất phiên làm việc!");
                navigate("/login");
              }}
              title="Đăng xuất"
              className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MAIN CONTENT BÊN PHẢI                                          */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-18 px-8 border-b border-zinc-800/80 bg-[#16161c]/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-20 py-4">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Quản lý Phim
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                {moviesList.length} phim trong cơ sở dữ liệu thật
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Dữ liệu trực tiếp từ PostgreSQL Database & TMDB API
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              title="Tải lại dữ liệu"
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 hover:text-white rounded-xl transition-all"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={() => alert("Chức năng thêm phim mới đang chuẩn bị tích hợp form Modal!")}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-red-600/30 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Thêm phim mới</span>
            </button>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="p-8 space-y-6">
          {/* Thông báo lỗi nếu không kết nối được backend */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-between text-red-400 text-xs">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
              <button
                onClick={fetchData}
                className="px-3 py-1 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* 4 Thẻ Thống kê Nhanh (Dữ liệu thật từ Database) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#16161c] border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Tổng số phim
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-black text-white mt-2">
                {loading ? "..." : `${moviesList.length} phim`}
              </p>
              <span className="text-[11px] text-emerald-400 font-semibold mt-1 inline-block">
                ✓ Đã đồng bộ với Database
              </span>
            </div>

            <div className="bg-[#16161c] border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Tổng lượt xem
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-black text-white mt-2">
                {loading ? "..." : totalViews.toLocaleString()}
              </p>
              <span className="text-[11px] text-zinc-400 font-medium mt-1 inline-block">
                Tích lũy từ người xem
              </span>
            </div>

            <div className="bg-[#16161c] border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Điểm IMDb TB
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-black text-white mt-2">
                {loading ? "..." : `${avgScore} / 10`}
              </p>
              <span className="text-[11px] text-amber-400 font-medium mt-1 inline-block">
                ★ {scoredMovies.length} phim đã chấm điểm
              </span>
            </div>

            <div className="bg-[#16161c] border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Thể loại phim
                </span>
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-black text-white mt-2">
                {loading ? "..." : `${genresList.length} thể loại`}
              </p>
              <span className="text-[11px] text-zinc-400 font-medium mt-1 inline-block">
                Được lưu trong Database
              </span>
            </div>
          </div>

          {/* Thanh công cụ Bảng (Search & Filter Bar) */}
          <div className="bg-[#16161c] border border-zinc-800/80 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm phim theo tên, đạo diễn, quốc gia..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              {/* Nút Xóa hàng loạt */}
              {selectedMovies.length > 0 && (
                <button
                  onClick={() => {
                    alert(`Tính năng xóa hàng loạt (${selectedMovies.length} phim) yêu cầu xác thực quyền ADMIN.`);
                  }}
                  className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Xóa ({selectedMovies.length})</span>
                </button>
              )}

              {/* Lọc thể loại thật */}
              <select
                value={selectedGenre}
                onChange={(e) => {
                  setSelectedGenre(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
              >
                <option value="all">Tất cả thể loại ({genresList.length})</option>
                {genresList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              {/* Sắp xếp */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
              >
                <option value="newest">Mới thêm (ID giảm dần)</option>
                <option value="score">Điểm IMDb cao nhất</option>
                <option value="year">Năm phát hành mới nhất</option>
                <option value="views">Lượt xem nhiều nhất</option>
              </select>
            </div>
          </div>

          {/* ========================================================== */}
          {/* BẢNG DANH SÁCH PHIM (DATA TABLE THẬT)                       */}
          {/* ========================================================== */}
          <div className="bg-[#16161c] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                {/* Table Header */}
                <thead className="bg-[#1b1b22] text-zinc-400 font-bold uppercase tracking-wider text-[11px] border-b border-zinc-800">
                  <tr>
                    <th className="py-4 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        onChange={(e) => handleSelectAll(e, currentMovies)}
                        checked={
                          currentMovies.length > 0 &&
                          currentMovies.every((m) => selectedMovies.includes(m.id))
                        }
                        className="rounded border-zinc-700 text-red-600 focus:ring-0 focus:ring-offset-0 bg-zinc-800 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="py-4 px-4 w-20">Poster</th>
                    <th className="py-4 px-6">Tên phim</th>
                    <th className="py-4 px-4">Thể loại</th>
                    <th className="py-4 px-4 text-center">Năm</th>
                    <th className="py-4 px-4 text-center">Điểm số</th>
                    <th className="py-4 px-4 text-center">Độ tuổi</th>
                    <th className="py-4 px-6 text-right">Hành động</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-16 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-xs text-zinc-400">Đang tải dữ liệu từ máy chủ...</p>
                        </div>
                      </td>
                    </tr>
                  ) : currentMovies.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-16 text-center text-zinc-500">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p>Không tìm thấy bộ phim nào phù hợp với bộ lọc.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentMovies.map((movie) => {
                      const isSelected = selectedMovies.includes(movie.id);

                      return (
                        <tr
                          key={movie.id}
                          className={`hover:bg-zinc-800/40 transition-colors ${
                            isSelected ? "bg-red-500/5" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(movie.id)}
                              className="rounded border-zinc-700 text-red-600 focus:ring-0 focus:ring-offset-0 bg-zinc-800 w-4 h-4 cursor-pointer"
                            />
                          </td>

                          {/* Poster mini thật */}
                          <td className="py-3 px-4">
                            <div className="relative group/poster w-11 h-16 rounded-lg overflow-hidden bg-zinc-800 shadow-md flex-shrink-0">
                              <img
                                src={
                                  movie.thumbnail_url ||
                                  movie.poster_url ||
                                  "https://via.placeholder.com/150x220?text=No+Image"
                                }
                                alt={movie.title}
                                className="w-full h-full object-cover group-hover/poster:scale-110 transition-transform duration-300"
                              />
                            </div>
                          </td>

                          {/* Tên phim & Thông tin Đạo diễn / Quốc gia */}
                          <td className="py-3 px-6">
                            <div>
                              <Link
                                to={`/movie/${movie.id}`}
                                className="text-sm font-bold text-white hover:text-red-400 transition-colors line-clamp-1"
                              >
                                {movie.title}
                              </Link>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400 flex-wrap">
                                {movie.director && <span>ĐD: {movie.director}</span>}
                                {movie.country && (
                                  <>
                                    <span>•</span>
                                    <span>{movie.country}</span>
                                  </>
                                )}
                                {movie.duration_min && (
                                  <>
                                    <span>•</span>
                                    <span>{movie.duration_min} phút</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Thể loại thật từ database */}
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {movie.genres && movie.genres.length > 0 ? (
                                movie.genres.slice(0, 3).map((g) => (
                                  <span
                                    key={g.id}
                                    className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-[10px]"
                                  >
                                    {g.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-zinc-600 italic text-[10px]">Chưa gắn</span>
                              )}
                              {movie.genres && movie.genres.length > 3 && (
                                <span className="text-zinc-500 text-[10px]">+{movie.genres.length - 3}</span>
                              )}
                            </div>
                          </td>

                          {/* Năm phát hành */}
                          <td className="py-3 px-4 text-center text-zinc-300 font-semibold">
                            {movie.release_year || "—"}
                          </td>

                          {/* Điểm IMDb */}
                          <td className="py-3 px-4 text-center">
                            {movie.imdb_score ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs">
                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {movie.imdb_score}
                              </span>
                            ) : (
                              <span className="text-zinc-600 text-xs">—</span>
                            )}
                          </td>

                          {/* Độ tuổi / Phân loại */}
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300">
                              {movie.age_rating || "P"}
                            </span>
                          </td>

                          {/* Hành động (Xem, Sửa, Xóa thật) */}
                          <td className="py-3 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Xem */}
                              <Link
                                to={`/movie/${movie.id}`}
                                title="Xem trang chi tiết phim"
                                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </Link>

                              {/* Sửa */}
                              <button
                                onClick={() => alert(`Tính năng sửa phim "${movie.title}" (ID: ${movie.id}) đang được hoàn thiện!`)}
                                title="Chỉnh sửa phim"
                                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>

                              {/* Xóa qua API */}
                              <button
                                onClick={() => handleDeleteMovie(movie.id, movie.title)}
                                title="Xóa phim khỏi database"
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination / Table Footer */}
            <div className="p-4 border-t border-zinc-800/80 bg-[#16161c] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span>
                  Hiển thị {filteredMovies.length === 0 ? 0 : indexOfFirstItem + 1} -{" "}
                  {Math.min(indexOfLastItem, filteredMovies.length)} trên tổng số {filteredMovies.length} phim (Cơ sở dữ liệu: {moviesList.length} phim)
                </span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                      currentPage === 1
                        ? "bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed"
                        : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white"
                    }`}
                  >
                    ◀ Trước
                  </button>

                  {/* Hiển thị danh sách số trang */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .map((pageNum, idx, arr) => {
                      const showEllipsis = idx > 0 && pageNum - arr[idx - 1] > 1;

                      return (
                        <div key={pageNum} className="flex items-center">
                          {showEllipsis && <span className="px-1 text-zinc-600">...</span>}
                          <button
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                              currentPage === pageNum
                                ? "bg-red-600 text-white shadow-md shadow-red-600/30 scale-105"
                                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                            }`}
                          >
                            {pageNum}
                          </button>
                        </div>
                      );
                    })}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                      currentPage === totalPages
                        ? "bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed"
                        : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white"
                    }`}
                  >
                    Sau ▶
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminPage;
