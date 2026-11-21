import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import ProfileModal from "../components/ProfileModal";

function HomePage() {
    const navigate = useNavigate();
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    // Lịch sử xem (Continue Watching) từ localStorage
    const [watchHistory, setWatchHistory] = useState([]);

    // Bộ lọc & Tìm kiếm đa tiêu chí
    const [searchKeyword, setSearchKeyword] = useState("");
    const [selectedGenre, setSelectedGenre] = useState("all");
    const [selectedYear, setSelectedYear] = useState("all");
    const [sortBy, setSortBy] = useState("newest"); // newest | views | imdb | year_desc

    // Quản lý Bookmark (Phim yêu thích)
    const [bookmarkedList, setBookmarkedList] = useState([]);
    const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
    const [showBookmarksModal, setShowBookmarksModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    // Trạng thái người dùng đã đăng nhập (lấy từ localStorage)
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem("user");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    // Tải lịch sử xem từ localStorage khi mount
    const loadWatchHistory = () => {
        try {
            const raw = localStorage.getItem("filmweb_watch_history");
            if (raw) {
                setWatchHistory(JSON.parse(raw));
            } else {
                setWatchHistory([]);
            }
        } catch (e) {
            console.warn("Lỗi tải lịch sử xem:", e);
        }
    };

    useEffect(() => {
        loadWatchHistory();
    }, []);

    // Xóa 1 phim khỏi lịch sử xem
    const handleRemoveHistory = (e, movieId) => {
        e.preventDefault();
        e.stopPropagation();
        const updated = watchHistory.filter((item) => item.movieId !== movieId);
        setWatchHistory(updated);
        localStorage.setItem("filmweb_watch_history", JSON.stringify(updated));
    };

    // Xóa toàn bộ lịch sử xem
    const handleClearAllHistory = () => {
        if (window.confirm("Bạn có chắc muốn xóa toàn bộ lịch sử xem không?")) {
            localStorage.removeItem("filmweb_watch_history");
            setWatchHistory([]);
        }
    };

    // Xử lý Đăng xuất
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setCurrentUser(null);
        setBookmarkedList([]);
        setBookmarkedIds(new Set());
    };

    // Lấy danh sách thể loại từ backend
    useEffect(() => {
        axios
            .get("http://localhost:5000/genres")
            .then((res) => {
                setGenres(res.data || []);
            })
            .catch((err) => {
                console.warn("Không thể tải danh sách thể loại:", err);
            });
    }, []);

    // Lấy danh sách bookmark của user
    const fetchBookmarks = () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setBookmarkedList([]);
            setBookmarkedIds(new Set());
            return;
        }

        axios
            .get("http://localhost:5000/bookmarks", {
                headers: { Authorization: token },
            })
            .then((res) => {
                setBookmarkedList(res.data);
                setBookmarkedIds(new Set(res.data.map((b) => b.movie_id)));
            })
            .catch(() => {});
    };

    useEffect(() => {
        fetchBookmarks();
    }, [currentUser]);

    // Xử lý Toggle Bookmark
    const handleToggleBookmark = async (e, movieId, movieTitle) => {
        e.preventDefault();
        e.stopPropagation();

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
            const res = await axios.post(
                `http://localhost:5000/bookmarks/toggle/${movieId}`,
                {},
                { headers: { Authorization: token } }
            );

            const isBookmarked = res.data.is_bookmarked;
            setBookmarkedIds((prev) => {
                const updated = new Set(prev);
                if (isBookmarked) {
                    updated.add(movieId);
                } else {
                    updated.delete(movieId);
                }
                return updated;
            });

            fetchBookmarks();
            setToastMessage(res.data.message);
            setTimeout(() => setToastMessage(""), 3500);
        } catch (err) {
            console.error("Lỗi khi bookmark:", err);
            alert("Lỗi: " + (err.response?.data?.error || err.message));
        }
    };

    // Lấy 6 phim đầu tiên có ảnh làm slideshow banner
    const featuredMovies = movies
        .filter((m) => m.poster_url || m.thumbnail_url)
        .slice(1, 7);

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

    // Danh sách năm phát hành có trong cơ sở dữ liệu
    const availableYears = Array.from(
        new Set(movies.map((m) => m.release_year).filter(Boolean))
    ).sort((a, b) => b - a);

    // Lọc và sắp xếp phim đa tiêu chí (Client-side)
    const filteredMovies = movies
        .filter((movie) => {
            // Lọc theo từ khóa tìm kiếm (tên phim, đạo diễn)
            if (searchKeyword.trim()) {
                const keyword = searchKeyword.toLowerCase().trim();
                const matchTitle = movie.title?.toLowerCase().includes(keyword);
                const matchDirector = movie.director?.toLowerCase().includes(keyword);
                if (!matchTitle && !matchDirector) return false;
            }

            // Lọc theo thể loại
            if (selectedGenre !== "all") {
                const hasGenre = movie.genres?.some(
                    (g) => String(g.id) === String(selectedGenre) || g.name === selectedGenre
                );
                if (!hasGenre) return false;
            }

            // Lọc theo năm phát hành
            if (selectedYear !== "all") {
                if (String(movie.release_year) !== String(selectedYear)) return false;
            }

            return true;
        })
        .sort((a, b) => {
            if (sortBy === "views") return (b.view_count || 0) - (a.view_count || 0);
            if (sortBy === "imdb") return (b.imdb_score || 0) - (a.imdb_score || 0);
            if (sortBy === "year_desc") return (b.release_year || 0) - (a.release_year || 0);
            return b.id - a.id; // Mặc định: Phim mới thêm trước
        });

    // Reset về trang 1 khi thay đổi bất kỳ bộ lọc nào
    useEffect(() => {
        setCurrentPage(1);
    }, [searchKeyword, selectedGenre, selectedYear, sortBy]);

    // Cấu hình phân trang: 20 phim / 1 trang
    const moviesPerPage = 20;
    const totalPages = Math.max(1, Math.ceil(filteredMovies.length / moviesPerPage));

    // Lấy danh sách phim cho trang hiện tại
    const indexOfLastMovie = currentPage * moviesPerPage;
    const indexOfFirstMovie = indexOfLastMovie - moviesPerPage;
    const currentMovies = filteredMovies.slice(indexOfFirstMovie, indexOfLastMovie);

    // Đặt lại tất cả bộ lọc về mặc định
    const handleResetFilters = () => {
        setSearchKeyword("");
        setSelectedGenre("all");
        setSelectedYear("all");
        setSortBy("newest");
    };

    const hasActiveFilters =
        searchKeyword.trim() !== "" ||
        selectedGenre !== "all" ||
        selectedYear !== "all" ||
        sortBy !== "newest";

    // Chuyển trang và cuộn mượt lên đầu danh sách phim
    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        setCurrentPage(newPage);
        const section = document.getElementById("movie-section");
        if (section) {
            section.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div className="min-h-screen bg-[#141414] text-white">
            {/* ===== NAVBAR ===== */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent px-6 py-4 flex items-center justify-between">
                <h1 className="text-3xl font-extrabold tracking-wider text-red-600">
                    FILMWEB
                </h1>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            placeholder="Tìm kiếm phim, đạo diễn..."
                            className="bg-black/60 border border-gray-600 rounded px-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-red-500 transition-colors w-64 pr-8"
                        />
                        {searchKeyword && (
                            <button
                                onClick={() => setSearchKeyword("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {currentUser ? (
                        <div className="flex items-center gap-3">
                            {/* Nút Xem phim đã lưu (Bookmarks) */}
                            <button
                                onClick={() => setShowBookmarksModal(true)}
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                            >
                                <span>🔖 Phim đã lưu</span>
                                {bookmarkedIds.size > 0 && (
                                    <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                        {bookmarkedIds.size}
                                    </span>
                                )}
                            </button>

                            {currentUser.role === "ADMIN" && (
                                <Link
                                    to="/admin"
                                    className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
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
                        <Link
                            to="/login"
                            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded transition-colors"
                        >
                            Đăng nhập
                        </Link>
                    )}
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
                        <Link
                            to={heroMovie ? `/movie/${heroMovie.id}` : "#"}
                            className="flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded hover:bg-gray-200 transition-colors"
                        >
                            ▶ Xem ngay
                        </Link>
                        <Link
                            to={heroMovie ? `/movie/${heroMovie.id}` : "#"}
                            className="flex items-center gap-2 bg-gray-600/70 text-white font-bold px-6 py-3 rounded hover:bg-gray-600 transition-colors"
                        >
                            ℹ Thông tin thêm
                        </Link>
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

            {/* ===== TIẾP TỤC XEM (CONTINUE WATCHING) ===== */}
            {watchHistory.length > 0 && (
                <section className="px-6 pb-6 relative z-10 -mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-white">
                            <span className="text-red-500">▶</span>
                            <span>Tiếp tục xem ({watchHistory.length})</span>
                        </h3>
                        <button
                            onClick={handleClearAllHistory}
                            className="text-xs text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                        >
                            Xóa lịch sử
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {watchHistory.map((item) => (
                            <div
                                key={item.movieId}
                                className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all flex flex-col shadow-lg"
                            >
                                <Link
                                    to={`/movie/${item.movieId}`}
                                    className="relative aspect-video overflow-hidden bg-zinc-800 block"
                                >
                                    <img
                                        src={item.poster || "https://via.placeholder.com/300x170?text=FilmWeb"}
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                                        <div className="w-9 h-9 rounded-full bg-red-600/90 text-white flex items-center justify-center text-xs shadow-lg group-hover:scale-110 transition-transform">
                                            ▶
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-700/80">
                                        <div
                                            className="h-full bg-red-600 rounded-r"
                                            style={{ width: `${Math.min(100, Math.max(5, item.percent || 0))}%` }}
                                        />
                                    </div>
                                </Link>
                                <div className="p-3 flex-1 flex flex-col justify-between">
                                    <div className="flex items-start justify-between gap-1">
                                        <Link
                                            to={`/movie/${item.movieId}`}
                                            className="font-bold text-xs text-white line-clamp-1 hover:text-red-400 transition-colors"
                                        >
                                            {item.title}
                                        </Link>
                                        <button
                                            onClick={(e) => handleRemoveHistory(e, item.movieId)}
                                            title="Xóa khỏi lịch sử"
                                            className="text-zinc-500 hover:text-red-400 text-xs p-0.5 rounded transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2">
                                        <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-medium">
                                            Tập {item.episodeNumber || 1}
                                        </span>
                                        <span className="text-red-400 font-semibold">{item.percent || 0}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ===== DANH SÁCH PHIM & BỘ LỌC ===== */}
            <main id="movie-section" className="px-6 pb-16 relative z-10 scroll-mt-20">
                {/* Header danh sách & Thống kê */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                        <span>🔥 Khám phá phim</span>
                    </h3>
                    <span className="text-sm text-gray-400">
                        Trang {currentPage} / {totalPages} ({filteredMovies.length} phim)
                    </span>
                </div>

                {/* ===== THANH BỘ LỌC ĐA TIÊU CHÍ (MULTI-CRITERIA FILTER BAR) ===== */}
                <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 mb-8 backdrop-blur-md shadow-xl flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <span>🔍</span>
                            <span>Bộ lọc:</span>
                        </span>

                        {/* Lọc Thể loại */}
                        <div className="flex items-center gap-1.5">
                            <label className="text-xs text-zinc-400">Thể loại:</label>
                            <select
                                value={selectedGenre}
                                onChange={(e) => setSelectedGenre(e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-red-500 cursor-pointer"
                            >
                                <option value="all">Tất cả thể loại</option>
                                {genres.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.name} {g.movie_count ? `(${g.movie_count})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Lọc Năm phát hành */}
                        <div className="flex items-center gap-1.5">
                            <label className="text-xs text-zinc-400">Năm:</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-red-500 cursor-pointer"
                            >
                                <option value="all">Tất cả các năm</option>
                                {availableYears.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sắp xếp */}
                        <div className="flex items-center gap-1.5">
                            <label className="text-xs text-zinc-400">Sắp xếp:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-red-500 cursor-pointer"
                            >
                                <option value="newest">Mới cập nhật</option>
                                <option value="views">Lượt xem nhiều nhất</option>
                                <option value="imdb">Điểm IMDb cao nhất</option>
                                <option value="year_desc">Năm phát hành mới nhất</option>
                            </select>
                        </div>
                    </div>

                    {/* Thống kê kết quả & Nút xóa lọc */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-zinc-300">
                            Tìm thấy <strong className="text-red-500">{filteredMovies.length}</strong> phim
                        </span>
                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <span>✕ Đặt lại</span>
                            </button>
                        )}
                    </div>
                </div>

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
                ) : filteredMovies.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/40 rounded-2xl border border-zinc-800">
                        <div className="text-5xl mb-3">🎬</div>
                        <h4 className="text-lg font-bold text-white mb-2">Không tìm thấy phim phù hợp</h4>
                        <p className="text-sm text-zinc-400 mb-5">
                            Thử thay đổi thể loại, năm phát hành hoặc từ khóa tìm kiếm của bạn.
                        </p>
                        <button
                            onClick={handleResetFilters}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors"
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Grid danh sách phim của trang hiện tại */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {currentMovies.map((movie) => (
                                <Link
                                    key={movie.id}
                                    to={`/movie/${movie.id}`}
                                    className="group relative rounded-lg overflow-hidden cursor-pointer shadow-lg block
                             transition-transform duration-300 ease-in-out hover:scale-105"
                                >
                                    {/* Ảnh poster */}
                                    <img
                                        src={
                                            movie.poster_url ||
                                            movie.thumbnail_url ||
                                            "https://via.placeholder.com/300x450?text=No+Image"
                                        }
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

                                        {/* Năm phát hành & Lượt xem */}
                                        <div className="flex items-center gap-2 text-xs text-gray-300">
                                            {movie.release_year && (
                                                <span>{movie.release_year}</span>
                                            )}
                                            {movie.view_count !== undefined && (
                                                <span>• 👁 {movie.view_count}</span>
                                            )}
                                        </div>

                                        {/* Nút hành động */}
                                        <div className="flex gap-2 mt-3">
                                            <button className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded hover:bg-gray-200 transition-colors">
                                                ▶ Xem
                                            </button>
                                            <button
                                                onClick={(e) => handleToggleBookmark(e, movie.id, movie.title)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded transition-all flex items-center gap-1 ${
                                                    bookmarkedIds.has(movie.id)
                                                        ? "bg-red-600 text-white shadow-md shadow-red-600/40"
                                                        : "bg-gray-600/80 hover:bg-gray-500 text-white"
                                                }`}
                                            >
                                                {bookmarkedIds.has(movie.id) ? "✓ Đã lưu" : "+ Lưu"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Ribbon / Badge đã lưu ở góc trên bên trái */}
                                    {bookmarkedIds.has(movie.id) && (
                                        <div
                                            title="Đã lưu vào danh sách yêu thích"
                                            className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs shadow-lg shadow-red-600/50"
                                        >
                                            ♥
                                        </div>
                                    )}

                                    {/* Badge điểm IMDb ở góc trên bên trái (nếu chưa bookmark) hoặc bên cạnh */}
                                    {movie.imdb_score && (
                                        <div className="absolute top-2 left-2 z-0 bg-black/70 backdrop-blur-sm text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                                            ★ {movie.imdb_score}
                                        </div>
                                    )}

                                    {/* Badge năm - hiện mặc định, ẩn khi hover */}
                                    {movie.release_year && (
                                        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded group-hover:opacity-0 transition-opacity">
                                            {movie.release_year}
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>

                        {/* Thanh điều khiển phân trang (Pagination) */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-10">
                                {/* Nút Trang trước */}
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${currentPage === 1
                                            ? "bg-zinc-800/50 text-gray-600 cursor-not-allowed"
                                            : "bg-zinc-800 text-gray-200 hover:bg-zinc-700 hover:text-white"
                                        }`}
                                >
                                    ◀ Trước
                                </button>

                                {/* Các nút số trang */}
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((p) => {
                                        // Show first, last, and pages around current page
                                        return (
                                            p === 1 ||
                                            p === totalPages ||
                                            Math.abs(p - currentPage) <= 2
                                        );
                                    })
                                    .reduce((acc, p, idx, arr) => {
                                        // Add ellipsis if gap > 1
                                        if (idx > 0 && p - arr[idx - 1] > 1) {
                                            acc.push("...");
                                        }
                                        acc.push(p);
                                        return acc;
                                    }, [])
                                    .map((item, idx) =>
                                        item === "..." ? (
                                            <span key={`ellipsis-${idx}`} className="text-zinc-600 px-1">
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={item}
                                                onClick={() => handlePageChange(item)}
                                                className={`w-10 h-10 rounded font-bold text-sm transition-all duration-200 ${currentPage === item
                                                        ? "bg-red-600 text-white shadow-lg shadow-red-600/40 scale-105"
                                                        : "bg-zinc-800 text-gray-300 hover:bg-zinc-700 hover:text-white"
                                                    }`}
                                            >
                                                {item}
                                            </button>
                                        )
                                    )}

                                {/* Nút Trang sau */}
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${currentPage === totalPages
                                            ? "bg-zinc-800/50 text-gray-600 cursor-not-allowed"
                                            : "bg-zinc-800 text-gray-200 hover:bg-zinc-700 hover:text-white"
                                        }`}
                                >
                                    Sau ▶
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* ===== FOOTER ===== */}
            <footer className="border-t border-gray-800 px-6 py-10 text-gray-500 text-sm">
                <div className="max-w-6xl mx-auto">
                    <p className="mb-4">© 2026 FILMWEB. Dự án học tập.</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-gray-300 transition-colors">
                            Trang chủ
                        </a>
                        <a href="#" className="hover:text-gray-300 transition-colors">
                            Thể loại
                        </a>
                        <a href="#" className="hover:text-gray-300 transition-colors">
                            Liên hệ
                        </a>
                    </div>
                </div>
            </footer>

            {/* ===== MODAL DANH SÁCH PHIM YÊU THÍCH (MY BOOKMARKS) ===== */}
            {showBookmarksModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
                    onClick={() => setShowBookmarksModal(false)}
                >
                    <div
                        className="bg-[#181824] border border-zinc-700/80 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl max-h-[85vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 text-lg">
                                    🔖
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <span>Phim yêu thích của tôi</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                                            {bookmarkedList.length} phim
                                        </span>
                                    </h3>
                                    <p className="text-xs text-zinc-400">
                                        Danh sách các bộ phim bạn đã đánh dấu để xem lại
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowBookmarksModal(false)}
                                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="py-6 overflow-y-auto flex-1">
                            {bookmarkedList.length === 0 ? (
                                <div className="text-center py-16 space-y-3">
                                    <div className="w-16 h-16 rounded-full bg-zinc-800/80 mx-auto flex items-center justify-center text-zinc-500 text-2xl">
                                        🎬
                                    </div>
                                    <p className="text-sm font-bold text-white">Chưa có phim nào trong danh sách!</p>
                                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                                        Hãy bấm nút "+ Lưu" ở bất kỳ bộ phim nào ngoài trang chủ để lưu vào danh sách yêu thích của bạn.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {bookmarkedList.map((item) => {
                                        const m = item.movie;
                                        if (!m) return null;
                                        return (
                                            <div
                                                key={item.movie_id}
                                                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-all flex flex-col"
                                            >
                                                <div className="relative aspect-[2/3] overflow-hidden bg-zinc-800">
                                                    <img
                                                        src={m.thumbnail_url || m.poster_url || "https://via.placeholder.com/300x450"}
                                                        alt={m.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                    {m.imdb_score && (
                                                        <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                            ★ {m.imdb_score}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="p-3 flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <h4 className="font-bold text-xs text-white line-clamp-1 group-hover:text-red-400 transition-colors">
                                                            {m.title}
                                                        </h4>
                                                        <p className="text-[11px] text-zinc-400 mt-0.5">
                                                            {m.release_year || "—"} • {m.country || "Chưa rõ"}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-800/60">
                                                        <Link
                                                            to={`/movie/${m.id}`}
                                                            onClick={() => setShowBookmarksModal(false)}
                                                            className="flex-1 text-center py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-lg transition-colors"
                                                        >
                                                            Xem phim
                                                        </Link>
                                                        <button
                                                            onClick={(e) => handleToggleBookmark(e, m.id, m.title)}
                                                            title="Bỏ lưu khỏi danh sách"
                                                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Toast thông báo Bookmark */}
            {toastMessage && (
                <div className="fixed bottom-8 right-8 z-50 bg-zinc-900 border border-amber-500/30 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in">
                    <span className="text-xl">💖</span>
                    <span className="text-sm font-semibold">{toastMessage}</span>
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

export default HomePage;
