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

  // Quản lý Thùng rác (Trash Bin)
  const [trashTab, setTrashTab] = useState("movies"); // "movies" | "genres"
  const [trashList, setTrashList] = useState([]);
  const [selectedTrash, setSelectedTrash] = useState([]);
  const [trashSearchTerm, setTrashSearchTerm] = useState("");
  const [trashCurrentPage, setTrashCurrentPage] = useState(1);

  // Thùng rác Thể loại (Genres Trash)
  const [trashGenresList, setTrashGenresList] = useState([]);
  const [selectedTrashGenres, setSelectedTrashGenres] = useState([]);
  const [trashGenreSearchTerm, setTrashGenreSearchTerm] = useState("");
  const [trashGenreCurrentPage, setTrashGenreCurrentPage] = useState(1);

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedMovies, setSelectedMovies] = useState([]);

  // Quản lý Modal Thêm / Sửa phim
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const initialFormState = {
    title: "",
    description: "",
    release_year: 2026,
    thumbnail_url: "",
    imdb_score: 7.5,
    age_rating: "P",
    duration_min: 110,
    director: "",
    country: "Việt Nam",
    genre_ids: [],
  };

  const [movieFormData, setMovieFormData] = useState(initialFormState);

  // Mở modal Thêm mới
  const handleOpenCreateModal = () => {
    setModalMode("create");
    setEditingMovieId(null);
    setMovieFormData(initialFormState);
    setModalError("");
    setIsModalOpen(true);
  };

  // Mở modal Chỉnh sửa
  const handleOpenEditModal = (movie) => {
    setModalMode("edit");
    setEditingMovieId(movie.id);
    setMovieFormData({
      title: movie.title || "",
      description: movie.description || "",
      release_year: movie.release_year || 2026,
      thumbnail_url: movie.thumbnail_url || movie.poster_url || "",
      imdb_score: movie.imdb_score || 7.0,
      age_rating: movie.age_rating || "P",
      duration_min: movie.duration_min || 110,
      director: movie.director || "",
      country: movie.country || "",
      genre_ids: movie.genres ? movie.genres.map((g) => g.id) : [],
    });
    setModalError("");
    setIsModalOpen(true);
  };

  // Toggle chọn thể loại
  const handleToggleGenre = (genreId) => {
    setMovieFormData((prev) => {
      const exists = prev.genre_ids.includes(genreId);
      return {
        ...prev,
        genre_ids: exists
          ? prev.genre_ids.filter((id) => id !== genreId)
          : [...prev.genre_ids, genreId],
      };
    });
  };

  // Submit Modal Form (Thêm hoặc Cập nhật)
  const handleSaveMovie = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!movieFormData.title.trim()) {
      setModalError("Tiêu đề phim không được để trống!");
      return;
    }

    try {
      setFormLoading(true);
      const token = localStorage.getItem("token");
      const config = {
        headers: token ? { Authorization: token } : {},
      };

      if (modalMode === "create") {
        const res = await axios.post("http://localhost:5000/movies", movieFormData, config);
        setMoviesList((prev) => [res.data, ...prev]);
        setIsModalOpen(false);
        alert(`🎉 Thêm phim mới "${res.data.title}" thành công!`);
      } else {
        const res = await axios.put(
          `http://localhost:5000/movies/${editingMovieId}`,
          movieFormData,
          config
        );
        setMoviesList((prev) =>
          prev.map((m) => (m.id === editingMovieId ? res.data : m))
        );
        setIsModalOpen(false);
        alert(`✅ Cập nhật phim "${res.data.title}" thành công!`);
      }
      setFormLoading(false);
    } catch (err) {
      setFormLoading(false);
      const errMsg =
        err.response?.data?.error || "Có lỗi xảy ra khi lưu phim. Vui lòng kiểm tra lại!";
      setModalError(errMsg);
    }
  };

  // Xóa các phim đã chọn (Chuyển vào Thùng rác hàng loạt)
  const handleDeleteSelected = async () => {
    if (selectedMovies.length === 0) return;
    if (
      !window.confirm(
        `Bạn có chắc muốn chuyển ${selectedMovies.length} bộ phim đã chọn vào Thùng rác?`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: token ? { Authorization: token } : {},
      };

      await Promise.all(
        selectedMovies.map((id) =>
          axios.delete(`http://localhost:5000/movies/${id}`, config)
        )
      );

      const moved = moviesList.filter((m) => selectedMovies.includes(m.id));
      setMoviesList((prev) => prev.filter((m) => !selectedMovies.includes(m.id)));
      setTrashList((prev) => [
        ...moved.map((m) => ({ ...m, is_deleted: true, deleted_at: new Date().toISOString() })),
        ...prev,
      ]);
      const count = selectedMovies.length;
      setSelectedMovies([]);
      alert(`🗑️ Đã chuyển thành công ${count} bộ phim vào Thùng rác!`);
    } catch (err) {
      alert("Lỗi khi chuyển vào thùng rác: " + (err.response?.data?.error || err.message));
    }
  };

  // Quản lý Thể loại (Genres Management)
  const [genreSearchTerm, setGenreSearchTerm] = useState("");
  const [isGenreModalOpen, setIsGenreModalOpen] = useState(false);
  const [genreModalMode, setGenreModalMode] = useState("create"); // "create" | "edit"
  const [editingGenre, setEditingGenre] = useState(null);
  const [genreNameInput, setGenreNameInput] = useState("");
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreError, setGenreError] = useState("");

  const handleOpenCreateGenreModal = () => {
    setGenreModalMode("create");
    setEditingGenre(null);
    setGenreNameInput("");
    setGenreError("");
    setIsGenreModalOpen(true);
  };

  const handleOpenEditGenreModal = (genre) => {
    setGenreModalMode("edit");
    setEditingGenre(genre);
    setGenreNameInput(genre.name);
    setGenreError("");
    setIsGenreModalOpen(true);
  };

  const handleSaveGenre = async (e) => {
    e.preventDefault();
    if (!genreNameInput.trim()) {
      setGenreError("Vui lòng nhập tên thể loại!");
      return;
    }

    try {
      setGenreLoading(true);
      setGenreError("");
      const token = localStorage.getItem("token");
      const config = token ? { headers: { Authorization: token } } : {};

      if (genreModalMode === "create") {
        const res = await axios.post(
          "http://localhost:5000/genres",
          { name: genreNameInput.trim() },
          config
        );
        setGenresList((prev) => [...prev, res.data]);
        setIsGenreModalOpen(false);
        alert(`🎉 Đã thêm thành công thể loại: "${res.data.name}"!`);
      } else {
        const res = await axios.put(
          `http://localhost:5000/genres/${editingGenre.id}`,
          { name: genreNameInput.trim() },
          config
        );
        setGenresList((prev) =>
          prev.map((g) => (g.id === editingGenre.id ? res.data : g))
        );
        setIsGenreModalOpen(false);
        alert(`✅ Đã cập nhật thành công thể loại: "${res.data.name}"!`);
      }
      setGenreLoading(false);
    } catch (err) {
      setGenreLoading(false);
      const errMsg =
        err.response?.data?.error || "Có lỗi xảy ra khi lưu thể loại. Vui lòng thử lại!";
      setGenreError(errMsg);
    }
  };

  const handleDeleteGenre = async (id, name, movieCount) => {
    const confirmMsg =
      movieCount > 0
        ? `⚠️ Thể loại "${name}" đang được gắn cho ${movieCount} bộ phim.\n\nKhi chuyển vào Thùng rác, các bộ phim vẫn giữ nguyên liên kết và sẽ tự động hiển thị lại thể loại này khi bạn khôi phục.\n\nBạn có muốn chuyển thể loại "${name}" vào Thùng rác?`
        : `Bạn có chắc muốn chuyển thể loại "${name}" vào Thùng rác?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/genres/${id}`, {
        headers: token ? { Authorization: token } : {},
      });

      const deletedGenre = genresList.find((g) => g.id === id);
      setGenresList((prev) => prev.filter((g) => g.id !== id));
      if (deletedGenre) {
        setTrashGenresList((prev) => [
          { ...deletedGenre, is_deleted: true, deleted_at: new Date().toISOString() },
          ...prev,
        ]);
      }
      fetchData();
      alert(`🗑️ Đã chuyển thể loại "${name}" vào Thùng rác! Bạn có thể vào menu Thùng rác để khôi phục bất cứ lúc nào.`);
    } catch (err) {
      if (
        err.response &&
        (err.response.status === 401 ||
          err.response.status === 403 ||
          err.response.data?.error?.includes("hết hạn"))
      ) {
        alert("⚠️ Phiên đăng nhập Admin của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục!");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }
      alert("Lỗi khi xóa thể loại: " + (err.response?.data?.error || err.message));
    }
  };

  // Phân trang bảng
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Gọi API lấy dữ liệu thật từ Backend (bao gồm cả Thùng rác Phim & Thể loại)
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const config = token ? { headers: { Authorization: token } } : {};

      const [moviesRes, genresRes, trashRes, trashGenresRes] = await Promise.all([
        axios.get("http://localhost:5000/movies"),
        axios.get("http://localhost:5000/genres"),
        axios.get("http://localhost:5000/movies/trash", config).catch(() => ({ data: [] })),
        axios.get("http://localhost:5000/genres/trash", config).catch(() => ({ data: [] })),
      ]);

      setMoviesList(moviesRes.data);
      setGenresList(genresRes.data);
      setTrashList(trashRes.data || []);
      setTrashGenresList(trashGenresRes.data || []);
      setLoading(false);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
      setError("Không thể kết nối đến máy chủ Backend (http://localhost:5000). Vui lòng đảm bảo backend đang chạy.");
      setLoading(false);
    }
  };

  useEffect(() => {
    // Lớp bảo vệ bổ sung trực tiếp trong AdminPage
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!token || !savedUser) {
      navigate("/login");
      return;
    }

    try {
      const user = JSON.parse(savedUser);
      if (user.role !== "ADMIN") {
        navigate("/");
        return;
      }
    } catch {
      navigate("/login");
      return;
    }

    fetchData();
  }, [navigate]);

  // Chuyển 1 phim vào Thùng rác (Xóa mềm)
  const handleDeleteMovie = async (id, title) => {
    if (!window.confirm(`Bạn có chắc muốn chuyển bộ phim "${title}" vào Thùng rác?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/movies/${id}`, {
        headers: token ? { Authorization: token } : {},
      });

      const deletedItem = moviesList.find((m) => m.id === id);
      setMoviesList((prev) => prev.filter((m) => m.id !== id));
      setSelectedMovies((prev) => prev.filter((item) => item !== id));
      if (deletedItem) {
        setTrashList((prev) => [
          { ...deletedItem, is_deleted: true, deleted_at: new Date().toISOString() },
          ...prev,
        ]);
      }
      alert(`🗑️ Đã chuyển phim "${title}" vào Thùng rác! Bạn có thể vào menu Thùng rác để khôi phục bất cứ lúc nào.`);
    } catch (err) {
      if (
        err.response &&
        (err.response.status === 401 ||
          err.response.status === 403 ||
          err.response.data?.error?.includes("hết hạn"))
      ) {
        alert("⚠️ Phiên đăng nhập Admin của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục!");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }
      alert("Lỗi khi xóa phim: " + (err.response?.data?.error || err.message));
    }
  };

  // Khôi phục 1 phim từ Thùng rác
  const handleRestoreMovie = async (id, title) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `http://localhost:5000/movies/${id}/restore`,
        {},
        { headers: token ? { Authorization: token } : {} }
      );

      const restoredMovie = res.data.movie;
      setTrashList((prev) => prev.filter((m) => m.id !== id));
      setSelectedTrash((prev) => prev.filter((item) => item !== id));
      if (restoredMovie) {
        setMoviesList((prev) => [restoredMovie, ...prev]);
      }
      alert(`♻️ Đã khôi phục thành công phim "${title}" về danh sách hoạt động!`);
    } catch (err) {
      alert("Lỗi khi khôi phục: " + (err.response?.data?.error || err.message));
    }
  };

  // Xóa vĩnh viễn 1 phim (Xóa cứng)
  const handleForceDeleteMovie = async (id, title) => {
    if (
      !window.confirm(
        `⚠️ CẢNH BÁO NGUY HIỂM: Bộ phim "${title}" sẽ bị XÓA VĨNH VIỄN khỏi cơ sở dữ liệu PostgreSQL và KHÔNG THỂ khôi phục lại!\n\nBạn có chắc chắn muốn xóa vĩnh viễn?`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/movies/${id}/force`, {
        headers: token ? { Authorization: token } : {},
      });

      setTrashList((prev) => prev.filter((m) => m.id !== id));
      setSelectedTrash((prev) => prev.filter((item) => item !== id));
      alert(`❌ Đã xóa vĩnh viễn bộ phim "${title}" khỏi hệ thống!`);
    } catch (err) {
      alert("Lỗi khi xóa vĩnh viễn: " + (err.response?.data?.error || err.message));
    }
  };

  // Khôi phục nhiều phim đã chọn từ thùng rác
  const handleRestoreSelectedTrash = async () => {
    if (selectedTrash.length === 0) return;
    try {
      const token = localStorage.getItem("token");
      const config = token ? { headers: { Authorization: token } } : {};
      await Promise.all(
        selectedTrash.map((id) =>
          axios.put(`http://localhost:5000/movies/${id}/restore`, {}, config)
        )
      );
      const count = selectedTrash.length;
      setSelectedTrash([]);
      alert(`♻️ Đã khôi phục thành công ${count} bộ phim về danh sách hoạt động!`);
      fetchData();
    } catch (err) {
      alert("Lỗi khi khôi phục: " + (err.response?.data?.error || err.message));
    }
  };

  // Xóa vĩnh viễn nhiều phim đã chọn trong thùng rác
  const handleForceDeleteSelectedTrash = async () => {
    if (selectedTrash.length === 0) return;
    if (
      !window.confirm(
        `⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN ${selectedTrash.length} bộ phim đã chọn khỏi Database? Hành động này KHÔNG THỂ hoàn tác!`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const config = token ? { headers: { Authorization: token } } : {};
      await Promise.all(
        selectedTrash.map((id) =>
          axios.delete(`http://localhost:5000/movies/${id}/force`, config)
        )
      );
      const count = selectedTrash.length;
      setTrashList((prev) => prev.filter((m) => !selectedTrash.includes(m.id)));
      setSelectedTrash([]);
      alert(`❌ Đã xóa vĩnh viễn ${count} bộ phim khỏi cơ sở dữ liệu!`);
    } catch (err) {
      alert("Lỗi khi xóa vĩnh viễn: " + (err.response?.data?.error || err.message));
    }
  };

  // Khôi phục 1 thể loại từ Thùng rác
  const handleRestoreGenre = async (id, name) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `http://localhost:5000/genres/${id}/restore`,
        {},
        { headers: token ? { Authorization: token } : {} }
      );

      const restored = res.data.genre;
      setTrashGenresList((prev) => prev.filter((g) => g.id !== id));
      setSelectedTrashGenres((prev) => prev.filter((item) => item !== id));
      if (restored) {
        setGenresList((prev) => [...prev, restored].sort((a, b) => a.id - b.id));
      }
      fetchData();
      alert(`♻️ Đã khôi phục thành công thể loại "${name}"! Tất cả phim liên quan đã tự động nhận lại nhãn thể loại.`);
    } catch (err) {
      alert("Lỗi khi khôi phục thể loại: " + (err.response?.data?.error || err.message));
    }
  };

  // Xóa vĩnh viễn 1 thể loại khỏi PostgreSQL (Force Delete)
  const handleForceDeleteGenre = async (id, name, movieCount) => {
    const warningMsg =
      movieCount > 0
        ? `⚠️ CẢNH BÁO NGUY HIỂM: Thể loại "${name}" đang liên kết với ${movieCount} bộ phim.\n\nNếu XÓA VĨNH VIỄN, thể loại này sẽ bị xóa hoàn toàn khỏi PostgreSQL và toàn bộ quan hệ liên kết với ${movieCount} phim sẽ bị hủy bỏ vĩnh viễn!\n\nBạn có chắc chắn muốn xóa vĩnh viễn không?`
        : `⚠️ CẢNH BÁO: Thể loại "${name}" sẽ bị XÓA VĨNH VIỄN khỏi Database và KHÔNG THỂ khôi phục lại!\n\nBạn có chắc chắn muốn xóa vĩnh viễn?`;

    if (!window.confirm(warningMsg)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/genres/${id}/force`, {
        headers: token ? { Authorization: token } : {},
      });

      setTrashGenresList((prev) => prev.filter((g) => g.id !== id));
      setSelectedTrashGenres((prev) => prev.filter((item) => item !== id));
      alert(`❌ Đã xóa vĩnh viễn thể loại "${name}" khỏi cơ sở dữ liệu!`);
    } catch (err) {
      alert("Lỗi khi xóa vĩnh viễn: " + (err.response?.data?.error || err.message));
    }
  };

  // Khôi phục nhiều thể loại đã chọn từ Thùng rác
  const handleRestoreSelectedTrashGenres = async () => {
    if (selectedTrashGenres.length === 0) return;
    try {
      const token = localStorage.getItem("token");
      const config = token ? { headers: { Authorization: token } } : {};
      await Promise.all(
        selectedTrashGenres.map((id) =>
          axios.put(`http://localhost:5000/genres/${id}/restore`, {}, config)
        )
      );
      const count = selectedTrashGenres.length;
      setSelectedTrashGenres([]);
      alert(`♻️ Đã khôi phục thành công ${count} thể loại!`);
      fetchData();
    } catch (err) {
      alert("Lỗi khi khôi phục: " + (err.response?.data?.error || err.message));
    }
  };

  // Xóa vĩnh viễn nhiều thể loại đã chọn trong Thùng rác
  const handleForceDeleteSelectedTrashGenres = async () => {
    if (selectedTrashGenres.length === 0) return;
    if (
      !window.confirm(
        `⚠️ CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn XÓA VĨNH VIỄN ${selectedTrashGenres.length} thể loại đã chọn khỏi Database? Mọi liên kết phim với các thể loại này sẽ bị hủy bỏ và KHÔNG THỂ hoàn tác!`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const config = token ? { headers: { Authorization: token } } : {};
      await Promise.all(
        selectedTrashGenres.map((id) =>
          axios.delete(`http://localhost:5000/genres/${id}/force`, config)
        )
      );
      const count = selectedTrashGenres.length;
      setTrashGenresList((prev) => prev.filter((g) => !selectedTrashGenres.includes(g.id)));
      setSelectedTrashGenres([]);
      alert(`❌ Đã xóa vĩnh viễn ${count} thể loại khỏi cơ sở dữ liệu!`);
    } catch (err) {
      alert("Lỗi khi xóa vĩnh viễn: " + (err.response?.data?.error || err.message));
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

  // Lọc cho Thể loại (Genres)
  const filteredGenres = genresList.filter((g) =>
    g.name?.toLowerCase().includes(genreSearchTerm.toLowerCase())
  );

  const mostPopularGenre =
    [...genresList].sort(
      (a, b) => (b.movie_count || 0) - (a.movie_count || 0)
    )[0] || null;
  const emptyGenresCount = genresList.filter(
    (g) => (g.movie_count || 0) === 0
  ).length;

  // Lọc và phân trang cho Thùng rác (Trash Bin)
  const filteredTrash = trashList.filter((m) => {
    return (
      m.title?.toLowerCase().includes(trashSearchTerm.toLowerCase()) ||
      m.director?.toLowerCase().includes(trashSearchTerm.toLowerCase()) ||
      m.country?.toLowerCase().includes(trashSearchTerm.toLowerCase())
    );
  });

  const trashTotalPages = Math.ceil(filteredTrash.length / itemsPerPage) || 1;
  const currentVisibleTrash = filteredTrash.slice(
    (trashCurrentPage - 1) * itemsPerPage,
    trashCurrentPage * itemsPerPage
  );

  const handleSelectAllTrash = (e) => {
    if (e.target.checked) {
      setSelectedTrash(currentVisibleTrash.map((m) => m.id));
    } else {
      setSelectedTrash([]);
    }
  };

  const handleToggleSelectTrash = (id) => {
    setSelectedTrash((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Lọc và phân trang cho Thùng rác Thể loại (Genres Trash)
  const filteredTrashGenres = trashGenresList.filter((g) =>
    g.name?.toLowerCase().includes(trashGenreSearchTerm.toLowerCase())
  );

  const trashGenreTotalPages = Math.ceil(filteredTrashGenres.length / itemsPerPage) || 1;
  const currentVisibleTrashGenres = filteredTrashGenres.slice(
    (trashGenreCurrentPage - 1) * itemsPerPage,
    trashGenreCurrentPage * itemsPerPage
  );

  const handleSelectAllTrashGenres = (e) => {
    if (e.target.checked) {
      setSelectedTrashGenres(currentVisibleTrashGenres.map((g) => g.id));
    } else {
      setSelectedTrashGenres([]);
    }
  };

  const handleToggleSelectTrashGenre = (id) => {
    setSelectedTrashGenres((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const totalTrashCount = trashList.length + trashGenresList.length;

  // Tính toán phân trang cho danh sách Phim hoạt động
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

            {/* Menu 5: Thùng rác (Trash Bin) */}
            <button
              onClick={() => {
                setActiveMenu("trash");
                setSelectedTrash([]);
                setSelectedTrashGenres([]);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeMenu === "trash"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Thùng rác</span>
              </div>
              {totalTrashCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {totalTrashCount}
                </span>
              )}
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
              {activeMenu === "trash" ? (
                <>
                  <span className="text-amber-400">🗑️ Thùng rác Hệ thống</span>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    {trashList.length} phim • {trashGenresList.length} thể loại đã xóa tạm
                  </span>
                </>
              ) : activeMenu === "genres" ? (
                <>
                  <span>Quản lý Thể loại</span>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {genresList.length} thể loại
                  </span>
                </>
              ) : activeMenu === "users" ? (
                <>
                  <span>Quản lý Người dùng</span>
                </>
              ) : (
                <>
                  <span>Quản lý Phim</span>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {moviesList.length} phim đang hoạt động
                  </span>
                </>
              )}
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              {activeMenu === "trash"
                ? "Dữ liệu phim và thể loại bị xóa tạm thời được lưu trữ tại đây. Bạn có thể khôi phục lại hoặc xóa vĩnh viễn khỏi Database."
                : "Dữ liệu trực tiếp từ PostgreSQL Database & TMDB API"}
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

            {activeMenu === "trash" ? (
              <button
                onClick={() => setActiveMenu(trashTab === "genres" ? "genres" : "movies")}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-zinc-700 transition-all duration-200"
              >
                <span>{trashTab === "genres" ? "← Về Quản lý Thể loại" : "← Về Quản lý Phim"}</span>
              </button>
            ) : activeMenu === "genres" ? (
              <button
                onClick={handleOpenCreateGenreModal}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-red-600/30 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>Thêm thể loại mới</span>
              </button>
            ) : (
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-red-600/30 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>Thêm phim mới</span>
              </button>
            )}
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

          {/* ============================================================== */}
          {/* VIEW: QUẢN LÝ PHIM (ACTIVE)                                    */}
          {/* ============================================================== */}
          {activeMenu === "movies" && (
            <>
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
                  onClick={handleDeleteSelected}
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
                                onClick={() => handleOpenEditModal(movie)}
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
        </>
      )}

      {/* ============================================================== */}
      {/* VIEW: THÙNG RÁC HỆ THỐNG (TRASH BIN - PHIM & THỂ LOẠI)         */}
      {/* ============================================================== */}
      {activeMenu === "trash" && (
        <div className="space-y-6">
          {/* Sub-tabs Chuyển đổi giữa Phim đã xóa & Thể loại đã xóa */}
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <button
              onClick={() => {
                setTrashTab("movies");
                setSelectedTrashGenres([]);
              }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 ${
                trashTab === "movies"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/10"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent"
              }`}
            >
              <span>🎬 Phim đã xóa</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  trashTab === "movies"
                    ? "bg-amber-400 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {trashList.length}
              </span>
            </button>

            <button
              onClick={() => {
                setTrashTab("genres");
                setSelectedTrash([]);
              }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 ${
                trashTab === "genres"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/10"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent"
              }`}
            >
              <span>🏷️ Thể loại đã xóa</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  trashTab === "genres"
                    ? "bg-amber-400 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {trashGenresList.length}
              </span>
            </button>
          </div>

          {/* TAB 1: THÙNG RÁC PHIM */}
          {trashTab === "movies" && (
            <>
              {/* Thống kê thùng rác phim */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#16161c] border border-amber-500/20 p-5 rounded-2xl relative overflow-hidden">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Phim trong thùng rác
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-amber-400">{trashList.length}</span>
                    <span className="text-xs text-zinc-400">bộ phim</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Được lưu tạm thời an toàn</p>
                </div>

                <div className="bg-[#16161c] border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Cơ chế bảo vệ
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-bold text-emerald-400">Xóa mềm (Soft Delete)</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Không làm mất dữ liệu liên quan</p>
                </div>

                <div className="bg-[#16161c] border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Khôi phục dữ liệu
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-bold text-blue-400">Tức thì 100%</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Quay lại web với đầy đủ thể loại</p>
                </div>
              </div>

              {/* Thanh tìm kiếm & Hành động hàng loạt trong Thùng rác Phim */}
              <div className="bg-[#16161c] border border-zinc-800/80 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-96">
                  <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={trashSearchTerm}
                    onChange={(e) => {
                      setTrashSearchTerm(e.target.value);
                      setTrashCurrentPage(1);
                    }}
                    placeholder="Tìm phim trong thùng rác..."
                    className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                  {selectedTrash.length > 0 && (
                    <>
                      <button
                        onClick={handleRestoreSelectedTrash}
                        className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Khôi phục ({selectedTrash.length})</span>
                      </button>

                      <button
                        onClick={handleForceDeleteSelectedTrash}
                        className="px-3.5 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Xóa vĩnh viễn ({selectedTrash.length})</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Bảng danh sách phim trong thùng rác */}
              <div className="bg-[#16161c] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold bg-zinc-900/60">
                        <th className="py-4 px-4 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={
                              currentVisibleTrash.length > 0 &&
                              currentVisibleTrash.every((m) => selectedTrash.includes(m.id))
                            }
                            onChange={handleSelectAllTrash}
                            className="rounded border-zinc-700 bg-zinc-800 text-red-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                          />
                        </th>
                        <th className="py-4 px-4 w-16 text-center">Poster</th>
                        <th className="py-4 px-4">Tên phim</th>
                        <th className="py-4 px-4">Thể loại</th>
                        <th className="py-4 px-4 text-center">Năm</th>
                        <th className="py-4 px-4 text-center">Điểm</th>
                        <th className="py-4 px-4">Thời gian xóa</th>
                        <th className="py-4 px-4 text-center w-40">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {currentVisibleTrash.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-16 text-center text-zinc-400">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <div className="w-16 h-16 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-500">
                                <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </div>
                              <p className="text-sm font-bold text-white">Thùng rác phim trống!</p>
                              <p className="text-xs text-zinc-500 max-w-sm">
                                Hiện không có bộ phim nào trong thùng rác. Khi bạn xóa phim ở bảng Quản lý Phim, dữ liệu sẽ được chuyển vào đây để có thể khôi phục.
                              </p>
                              <button
                                onClick={() => setActiveMenu("movies")}
                                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors"
                              >
                                Về Quản lý Phim
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        currentVisibleTrash.map((movie) => {
                          const isSelected = selectedTrash.includes(movie.id);
                          return (
                            <tr
                              key={movie.id}
                              className={`hover:bg-zinc-800/30 transition-colors ${
                                isSelected ? "bg-red-500/5" : ""
                              }`}
                            >
                              <td className="py-3.5 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectTrash(movie.id)}
                                  className="rounded border-zinc-700 bg-zinc-800 text-red-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                />
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="w-10 h-14 rounded-lg bg-zinc-800 overflow-hidden mx-auto shadow-sm relative group">
                                  <img
                                    src={movie.thumbnail_url || movie.poster_url || "https://via.placeholder.com/150"}
                                    alt={movie.title}
                                    className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                                  />
                                  <span className="absolute inset-0 bg-red-950/40 flex items-center justify-center text-[9px] font-black text-red-400 uppercase">
                                    Đã xóa
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-white text-xs hover:text-red-400 transition-colors line-clamp-1">
                                  {movie.title}
                                </p>
                                <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                                  ĐĐ: {movie.director || "Chưa cập nhật"} • {movie.country || "Chưa rõ"}
                                </p>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {movie.genres && movie.genres.length > 0 ? (
                                    movie.genres.map((g) => (
                                      <span
                                        key={g.id}
                                        className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md font-medium"
                                      >
                                        {g.name}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-zinc-600 italic">Chưa phân loại</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center text-zinc-300 font-medium">
                                {movie.release_year || "—"}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                                  ★ {movie.imdb_score || "—"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                                {movie.deleted_at
                                  ? new Date(movie.deleted_at).toLocaleString("vi-VN")
                                  : "Vừa xong"}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Nút Khôi phục */}
                                  <button
                                    onClick={() => handleRestoreMovie(movie.id, movie.title)}
                                    title="Khôi phục phim này"
                                    className="px-2 py-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px]"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span>Khôi phục</span>
                                  </button>

                                  {/* Nút Xóa vĩnh viễn */}
                                  <button
                                    onClick={() => handleForceDeleteMovie(movie.id, movie.title)}
                                    title="Xóa vĩnh viễn khỏi Database"
                                    className="px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px]"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Xóa hẳn</span>
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

                {/* Phân trang thùng rác phim */}
                {trashTotalPages > 1 && (
                  <div className="p-4 border-t border-zinc-800/80 bg-[#16161c] flex items-center justify-between text-xs text-zinc-400">
                    <span>Trang {trashCurrentPage} / {trashTotalPages}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={trashCurrentPage === 1}
                        onClick={() => setTrashCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 disabled:opacity-40"
                      >
                        ◀ Trước
                      </button>
                      <button
                        disabled={trashCurrentPage === trashTotalPages}
                        onClick={() => setTrashCurrentPage((p) => Math.min(trashTotalPages, p + 1))}
                        className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 disabled:opacity-40"
                      >
                        Sau ▶
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: THÙNG RÁC THỂ LOẠI */}
          {trashTab === "genres" && (
            <>
              {/* Thống kê thùng rác thể loại */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#16161c] border border-amber-500/20 p-5 rounded-2xl relative overflow-hidden">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Thể loại trong thùng rác
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-amber-400">{trashGenresList.length}</span>
                    <span className="text-xs text-zinc-400">thể loại</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Được lưu trữ an toàn trong Database</p>
                </div>

                <div className="bg-[#16161c] border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Bảo toàn liên kết phim
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-bold text-emerald-400">100% Nguyên vẹn</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Các phim liên kết không bị ảnh hưởng</p>
                </div>

                <div className="bg-[#16161c] border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Khôi phục tự động
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-bold text-blue-400">Chỉ 1 Click</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Các phim sẽ tự động hiển thị lại nhãn</p>
                </div>
              </div>

              {/* Thanh tìm kiếm & Hành động hàng loạt trong Thùng rác Thể loại */}
              <div className="bg-[#16161c] border border-zinc-800/80 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-96">
                  <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={trashGenreSearchTerm}
                    onChange={(e) => {
                      setTrashGenreSearchTerm(e.target.value);
                      setTrashGenreCurrentPage(1);
                    }}
                    placeholder="Tìm thể loại trong thùng rác..."
                    className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                  {selectedTrashGenres.length > 0 && (
                    <>
                      <button
                        onClick={handleRestoreSelectedTrashGenres}
                        className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Khôi phục ({selectedTrashGenres.length})</span>
                      </button>

                      <button
                        onClick={handleForceDeleteSelectedTrashGenres}
                        className="px-3.5 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Xóa vĩnh viễn ({selectedTrashGenres.length})</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Bảng danh sách Thể loại trong thùng rác */}
              <div className="bg-[#16161c] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold bg-zinc-900/60">
                        <th className="py-4 px-4 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={
                              currentVisibleTrashGenres.length > 0 &&
                              currentVisibleTrashGenres.every((g) => selectedTrashGenres.includes(g.id))
                            }
                            onChange={handleSelectAllTrashGenres}
                            className="rounded border-zinc-700 bg-zinc-800 text-red-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                          />
                        </th>
                        <th className="py-4 px-6 w-20 text-center">ID</th>
                        <th className="py-4 px-6">Tên Thể loại</th>
                        <th className="py-4 px-6">Số phim sẽ khôi phục lại nhãn</th>
                        <th className="py-4 px-6">Thời gian xóa</th>
                        <th className="py-4 px-6 text-center w-48">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {currentVisibleTrashGenres.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-zinc-400">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <div className="w-16 h-16 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-500">
                                <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                              </div>
                              <p className="text-sm font-bold text-white">Thùng rác thể loại trống!</p>
                              <p className="text-xs text-zinc-500 max-w-sm">
                                Hiện không có thể loại nào trong thùng rác. Khi bạn xóa thể loại ở Quản lý Thể loại, nó sẽ được lưu tạm tại đây.
                              </p>
                              <button
                                onClick={() => setActiveMenu("genres")}
                                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors"
                              >
                                Về Quản lý Thể loại
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        currentVisibleTrashGenres.map((genre) => {
                          const isSelected = selectedTrashGenres.includes(genre.id);
                          return (
                            <tr
                              key={genre.id}
                              className={`hover:bg-zinc-800/30 transition-colors ${
                                isSelected ? "bg-red-500/5" : ""
                              }`}
                            >
                              <td className="py-3.5 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectTrashGenre(genre.id)}
                                  className="rounded border-zinc-700 bg-zinc-800 text-red-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                />
                              </td>
                              <td className="py-3.5 px-6 text-center font-mono text-zinc-500">
                                #{genre.id}
                              </td>
                              <td className="py-3.5 px-6">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-400 flex items-center justify-center font-bold text-xs">
                                    🏷️
                                  </div>
                                  <div>
                                    <span className="font-bold text-white text-sm">
                                      {genre.name}
                                    </span>
                                    <span className="ml-2 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-semibold">
                                      Đã xóa tạm
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-6">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                    {genre.movie_count || 0} phim
                                  </span>
                                  <span className="text-[11px] text-zinc-400">
                                    sẽ tự động khôi phục nhãn
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-6 text-zinc-400 text-[11px]">
                                {genre.deleted_at
                                  ? new Date(genre.deleted_at).toLocaleString("vi-VN")
                                  : "Vừa xong"}
                              </td>
                              <td className="py-3.5 px-6 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {/* Nút Khôi phục */}
                                  <button
                                    onClick={() => handleRestoreGenre(genre.id, genre.name)}
                                    title="Khôi phục thể loại này"
                                    className="px-2.5 py-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px] border border-emerald-500/20"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span>Khôi phục</span>
                                  </button>

                                  {/* Nút Xóa vĩnh viễn */}
                                  <button
                                    onClick={() => handleForceDeleteGenre(genre.id, genre.name, genre.movie_count)}
                                    title="Xóa vĩnh viễn khỏi Database"
                                    className="px-2.5 py-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px] border border-red-500/20"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Xóa hẳn</span>
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

                {/* Phân trang thùng rác thể loại */}
                {trashGenreTotalPages > 1 && (
                  <div className="p-4 border-t border-zinc-800/80 bg-[#16161c] flex items-center justify-between text-xs text-zinc-400">
                    <span>Trang {trashGenreCurrentPage} / {trashGenreTotalPages}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={trashGenreCurrentPage === 1}
                        onClick={() => setTrashGenreCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 disabled:opacity-40"
                      >
                        ◀ Trước
                      </button>
                      <button
                        disabled={trashGenreCurrentPage === trashGenreTotalPages}
                        onClick={() => setTrashGenreCurrentPage((p) => Math.min(trashGenreTotalPages, p + 1))}
                        className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 disabled:opacity-40"
                      >
                        Sau ▶
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW: QUẢN LÝ THỂ LOẠI (GENRES MANAGEMENT)                     */}
      {/* ============================================================== */}
      {activeMenu === "genres" && (
        <div className="space-y-6">
          {/* Thống kê Thể loại */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#16161c] border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Tổng số thể loại
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-white">{genresList.length}</span>
                <span className="text-xs text-zinc-400">thể loại</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Được lưu trong PostgreSQL</p>
            </div>

            <div className="bg-[#16161c] border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Thể loại phổ biến nhất
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-lg font-bold text-red-500 truncate">
                  {mostPopularGenre ? mostPopularGenre.name : "—"}
                </span>
                <span className="text-xs text-zinc-400">
                  ({mostPopularGenre ? mostPopularGenre.movie_count : 0} phim)
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Nhiều bộ phim liên kết nhất</p>
            </div>

            <div className="bg-[#16161c] border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Thể loại chưa có phim
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-amber-400">{emptyGenresCount}</span>
                <span className="text-xs text-zinc-400">thể loại</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Sẵn sàng để gán phim mới</p>
            </div>
          </div>

          {/* Thanh tìm kiếm & Nút thêm thể loại */}
          <div className="bg-[#16161c] border border-zinc-800/80 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={genreSearchTerm}
                onChange={(e) => setGenreSearchTerm(e.target.value)}
                placeholder="Tìm thể loại theo tên..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>

            <button
              onClick={handleOpenCreateGenreModal}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-red-600/30 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Thêm thể loại mới</span>
            </button>
          </div>

          {/* Bảng danh sách Thể loại */}
          <div className="bg-[#16161c] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold bg-zinc-900/60">
                    <th className="py-4 px-6 w-20 text-center">ID</th>
                    <th className="py-4 px-6">Tên Thể loại</th>
                    <th className="py-4 px-6">Số lượng phim liên kết</th>
                    <th className="py-4 px-6 text-center">Trạng thái</th>
                    <th className="py-4 px-6 text-center w-32">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredGenres.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-400">
                        Không tìm thấy thể loại nào phù hợp với từ khóa "{genreSearchTerm}"
                      </td>
                    </tr>
                  ) : (
                    filteredGenres.map((genre) => (
                      <tr key={genre.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-4 px-6 text-center font-mono text-zinc-500">
                          #{genre.id}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center font-bold text-xs">
                              🏷️
                            </div>
                            <span className="font-bold text-white text-sm">
                              {genre.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-white text-xs w-16">
                              {genre.movie_count || 0} phim
                            </span>
                            <div className="w-36 bg-zinc-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-red-600 to-amber-500 h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, Math.max(5, ((genre.movie_count || 0) / 45) * 100))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {(genre.movie_count || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Đang dùng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                              Chưa có phim
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Nút Sửa */}
                            <button
                              onClick={() => handleOpenEditGenreModal(genre)}
                              title="Chỉnh sửa tên thể loại"
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            {/* Nút Xóa */}
                            <button
                              onClick={() => handleDeleteGenre(genre.id, genre.name, genre.movie_count)}
                              title="Xóa thể loại này"
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW: QUẢN LÝ NGƯỜI DÙNG (PLACEHOLDER)                         */}
      {/* ============================================================== */}
      {activeMenu === "users" && (
        <div className="bg-[#16161c] border border-zinc-800/80 p-12 rounded-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-500 mx-auto flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Quản lý Người dùng & Phân quyền</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Xem danh sách tài khoản, nâng quyền ADMIN / hạ quyền USER và xóa tài khoản vi phạm sẽ được tích hợp giao diện ở bước tiếp theo!
          </p>
          <button
            onClick={() => setActiveMenu("movies")}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-red-600/20"
          >
            ← Quay lại Quản lý Phim
          </button>
        </div>
      )}
    </div>
  </main>

      {/* ============================================================== */}
      {/* MODAL THÊM / CHỈNH SỬA PHIM                                    */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#181824] border border-zinc-700/80 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
                  {modalMode === "create" ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {modalMode === "create" ? "Thêm phim mới vào hệ thống" : "Chỉnh sửa thông tin phim"}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {modalMode === "create"
                      ? "Điền thông tin bộ phim để lưu vào cơ sở dữ liệu PostgreSQL"
                      : `Cập nhật dữ liệu phim (ID: #${editingMovieId})`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error Banner */}
            {modalError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-red-400 text-xs">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{modalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveMovie} className="mt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cột trái: Form nhập liệu chính */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Tên phim */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Tên phim <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={movieFormData.title}
                      onChange={(e) => setMovieFormData({ ...movieFormData, title: e.target.value })}
                      placeholder="VD: Avatar: Dòng Chảy Của Nước"
                      required
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Hàng 3 cột: Năm phát hành, Điểm IMDb, Thời lượng */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Năm phát hành
                      </label>
                      <input
                        type="number"
                        min="1900"
                        max="2035"
                        value={movieFormData.release_year}
                        onChange={(e) => setMovieFormData({ ...movieFormData, release_year: e.target.value })}
                        className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Điểm IMDb
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={movieFormData.imdb_score}
                        onChange={(e) => setMovieFormData({ ...movieFormData, imdb_score: e.target.value })}
                        className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Thời lượng (phút)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="600"
                        value={movieFormData.duration_min}
                        onChange={(e) => setMovieFormData({ ...movieFormData, duration_min: e.target.value })}
                        className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Hàng 2 cột: Độ tuổi, Quốc gia */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Độ tuổi
                      </label>
                      <select
                        value={movieFormData.age_rating}
                        onChange={(e) => setMovieFormData({ ...movieFormData, age_rating: e.target.value })}
                        className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                      >
                        <option value="P">P - Mọi lứa tuổi</option>
                        <option value="PG">PG - Cần phụ huynh</option>
                        <option value="PG-13">PG-13 - Trên 13 tuổi</option>
                        <option value="T16">T16 - Trên 16 tuổi</option>
                        <option value="T18">T18 - Trên 18 tuổi</option>
                        <option value="R">R - Giới hạn độ tuổi</option>
                        <option value="NR">NR - Chưa phân loại</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Quốc gia
                      </label>
                      <input
                        type="text"
                        value={movieFormData.country}
                        onChange={(e) => setMovieFormData({ ...movieFormData, country: e.target.value })}
                        placeholder="VD: United States, Nhật Bản..."
                        className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Đạo diễn */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Đạo diễn
                    </label>
                    <input
                      type="text"
                      value={movieFormData.director}
                      onChange={(e) => setMovieFormData({ ...movieFormData, director: e.target.value })}
                      placeholder="VD: James Cameron, Christopher Nolan..."
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Link Poster */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Link ảnh Poster (URL)
                    </label>
                    <input
                      type="url"
                      value={movieFormData.thumbnail_url}
                      onChange={(e) => setMovieFormData({ ...movieFormData, thumbnail_url: e.target.value })}
                      placeholder="https://image.tmdb.org/t/p/w500/..."
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Chọn Thể loại */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Thể loại phim (Bấm để chọn / bỏ chọn):
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl max-h-36 overflow-y-auto">
                      {genresList.map((genre) => {
                        const isSelected = movieFormData.genre_ids.includes(genre.id);
                        return (
                          <button
                            key={genre.id}
                            type="button"
                            onClick={() => handleToggleGenre(genre.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              isSelected
                                ? "bg-red-600 text-white shadow-md shadow-red-600/30 scale-105"
                                : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700"
                            }`}
                          >
                            {genre.name} {isSelected && "✓"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mô tả */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Mô tả nội dung tóm tắt
                    </label>
                    <textarea
                      rows={3}
                      value={movieFormData.description}
                      onChange={(e) => setMovieFormData({ ...movieFormData, description: e.target.value })}
                      placeholder="Nội dung tóm tắt ngắn về bộ phim..."
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Cột phải: Live Preview Poster */}
                <div className="lg:col-span-1 flex flex-col items-center">
                  <p className="text-xs font-semibold text-zinc-400 mb-2">Xem trước Poster</p>
                  <div className="w-full max-w-[220px] aspect-[2/3] bg-zinc-900 border border-zinc-700/80 rounded-2xl overflow-hidden relative shadow-lg flex items-center justify-center group">
                    {movieFormData.thumbnail_url ? (
                      <img
                        src={movieFormData.thumbnail_url}
                        alt="Preview"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://via.placeholder.com/300x450?text=Loi+Anh";
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 text-zinc-500">
                        <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[11px]">Chưa có ảnh poster</span>
                      </div>
                    )}
                    {/* Badge điểm số & tuổi trên ảnh */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="bg-amber-500/90 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow">
                        ★ {movieFormData.imdb_score || 0}
                      </span>
                      <span className="bg-black/70 backdrop-blur-md text-zinc-200 text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/20">
                        {movieFormData.age_rating || "P"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-center w-full px-2">
                    <p className="text-xs font-bold text-white truncate">
                      {movieFormData.title || "Tên phim..."}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {movieFormData.release_year} • {movieFormData.duration_min} phút
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={formLoading}
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {formLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <span>{modalMode === "create" ? "Tạo phim mới" : "Lưu thay đổi"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ============================================================== */}
      {/* MODAL THÊM / CHỈNH SỬA THỂ LOẠI                                */}
      {/* ============================================================== */}
      {isGenreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#181824] border border-zinc-700/80 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 font-bold text-lg">
                  🏷️
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {genreModalMode === "create" ? "Thêm thể loại mới" : "Chỉnh sửa tên thể loại"}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {genreModalMode === "create"
                      ? "Thể loại mới sẽ có sẵn để gắn cho các bộ phim"
                      : `Cập nhật thể loại ID #${editingGenre?.id}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGenreModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {genreError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{genreError}</span>
              </div>
            )}

            <form onSubmit={handleSaveGenre} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Tên thể loại <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={genreNameInput}
                  onChange={(e) => setGenreNameInput(e.target.value)}
                  placeholder="VD: Phim Anime, Phim Chiếu Rạp..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={genreLoading}
                  onClick={() => setIsGenreModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={genreLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {genreLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>{genreModalMode === "create" ? "Tạo thể loại" : "Lưu thay đổi"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
