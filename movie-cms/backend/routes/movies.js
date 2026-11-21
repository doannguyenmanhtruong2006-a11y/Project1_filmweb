const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Gọi 2 bác bảo vệ từ bốt gác vào
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// 1. API: Lấy danh sách toàn bộ phim (Chỉ lấy phim chưa bị xóa vào thùng rác)
router.get("/movies", async (req, res) => {
  try {
    const allMovies = await prisma.movies.findMany({
      where: {
        OR: [{ is_deleted: false }, { is_deleted: null }],
      },
      orderBy: { id: "desc" },
      include: {
        movie_genres: {
          include: {
            genres: true,
          },
        },
      },
    });

    const formattedMovies = allMovies.map((m) => ({
      ...m,
      genres:
        m.movie_genres
          ?.map((mg) => mg.genres)
          .filter((g) => g && !g.is_deleted) || [],
    }));

    res.json(formattedMovies);
  } catch (error) {
    res.status(500).json({ error: "Lỗi hệ thống khi lấy dữ liệu phim" });
  }
});

// 2. API: Lấy danh sách phim trong Thùng rác (Chỉ Admin)
// Lưu ý: Đặt TRƯỚC /movies/:id để tránh Express nhầm "trash" là ID phim!
router.get("/movies/trash", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const trashMovies = await prisma.movies.findMany({
      where: { is_deleted: true },
      orderBy: { deleted_at: "desc" },
      include: {
        movie_genres: {
          include: {
            genres: true,
          },
        },
      },
    });

    const formattedMovies = trashMovies.map((m) => ({
      ...m,
      genres: m.movie_genres?.map((mg) => mg.genres) || [],
    }));

    res.json(formattedMovies);
  } catch (error) {
    console.error("Lỗi khi lấy phim trong thùng rác:", error);
    res.status(500).json({ error: "Lỗi khi lấy danh sách phim trong thùng rác" });
  }
});

// 3. API: Lấy chi tiết 1 bộ phim (Kèm danh sách thể loại)
router.get("/movies/:id", async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    const movie = await prisma.movies.findUnique({
      where: { id: movieId },
      include: {
        movie_genres: {
          include: {
            genres: true,
          },
        },
      },
    });
    if (!movie) return res.status(404).json({ error: "Không tìm thấy phim" });

    // Trích xuất danh sách thể loại sạch đẹp cho frontend (lọc thể loại chưa bị xóa)
    const formattedMovie = {
      ...movie,
      genres:
        movie.movie_genres
          ?.map((mg) => mg.genres)
          .filter((g) => g && !g.is_deleted) || [],
    };
    res.json(formattedMovie);
  } catch (error) {
    res.status(500).json({ error: "Lỗi hệ thống" });
  }
});

// API: Tăng lượt xem cho phim khi người xem thưởng thức video
// POST /movies/:id/view (Công khai, tự động gọi khi video được phát)
router.post("/movies/:id/view", async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    if (isNaN(movieId)) {
      return res.status(400).json({ error: "ID phim không hợp lệ" });
    }

    const updatedMovie = await prisma.movies.update({
      where: { id: movieId },
      data: {
        view_count: { increment: 1 },
      },
      select: {
        id: true,
        title: true,
        view_count: true,
      },
    });

    res.json({
      message: `Đã tăng lượt xem cho phim "${updatedMovie.title}"!`,
      view_count: updatedMovie.view_count,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật lượt xem:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi cập nhật lượt xem phim" });
  }
});

// 3. API: Thêm phim mới (Phải là Admin - Hỗ trợ gán Thể loại)
router.post("/movies", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      release_year,
      thumbnail_url,
      imdb_score,
      age_rating,
      duration_min,
      director,
      country,
      genre_ids,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Tiêu đề phim không được để trống" });
    }

    const validGenreIds = Array.isArray(genre_ids)
      ? genre_ids.map((id) => parseInt(id)).filter((id) => !isNaN(id))
      : [];

    const newMovie = await prisma.movies.create({
      data: {
        title: title.trim(),
        description: description || "",
        release_year: release_year ? parseInt(release_year) : null,
        thumbnail_url: thumbnail_url || null,
        imdb_score: imdb_score ? parseFloat(imdb_score) : null,
        age_rating: age_rating || null,
        duration_min: duration_min ? parseInt(duration_min) : null,
        director: director || null,
        country: country || null,
        movie_genres:
          validGenreIds.length > 0
            ? {
                create: validGenreIds.map((gId) => ({ genre_id: gId })),
              }
            : undefined,
      },
      include: {
        movie_genres: {
          include: {
            genres: true,
          },
        },
      },
    });

    const formattedMovie = {
      ...newMovie,
      genres: newMovie.movie_genres?.map((mg) => mg.genres) || [],
    };

    res.status(201).json(formattedMovie);
  } catch (error) {
    console.error("Lỗi khi thêm phim mới:", error);
    res.status(500).json({ error: "Lỗi khi thêm phim mới" });
  }
});

// 4. API: Cập nhật thông tin phim (Phải là Admin - Hỗ trợ cập nhật Thể loại)
router.put("/movies/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    const {
      title,
      description,
      release_year,
      thumbnail_url,
      imdb_score,
      age_rating,
      duration_min,
      director,
      country,
      genre_ids,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Tiêu đề phim không được để trống" });
    }

    // Cập nhật thông tin cơ bản
    await prisma.movies.update({
      where: { id: movieId },
      data: {
        title: title.trim(),
        description: description !== undefined ? description : undefined,
        release_year: release_year ? parseInt(release_year) : null,
        thumbnail_url: thumbnail_url !== undefined ? thumbnail_url : undefined,
        imdb_score: imdb_score ? parseFloat(imdb_score) : null,
        age_rating: age_rating !== undefined ? age_rating : undefined,
        duration_min: duration_min ? parseInt(duration_min) : null,
        director: director !== undefined ? director : undefined,
        country: country !== undefined ? country : undefined,
      },
    });

    // Cập nhật quan hệ Thể loại nếu có truyền genre_ids
    if (Array.isArray(genre_ids)) {
      const validGenreIds = genre_ids
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id));

      await prisma.movie_genres.deleteMany({
        where: { movie_id: movieId },
      });

      if (validGenreIds.length > 0) {
        await prisma.movie_genres.createMany({
          data: validGenreIds.map((gId) => ({
            movie_id: movieId,
            genre_id: gId,
          })),
        });
      }
    }

    // Lấy lại dữ liệu hoàn chỉnh để trả về cho Frontend
    const updated = await prisma.movies.findUnique({
      where: { id: movieId },
      include: {
        movie_genres: {
          include: {
            genres: true,
          },
        },
      },
    });

    const formattedMovie = {
      ...updated,
      genres: updated.movie_genres?.map((mg) => mg.genres) || [],
    };

    res.json(formattedMovie);
  } catch (error) {
    console.error("Lỗi khi cập nhật phim:", error);
    res.status(500).json({ error: "Lỗi khi cập nhật phim" });
  }
});

// 5. API: Xóa mềm phim (Đưa vào Thùng rác - Phải là Admin)
router.delete("/movies/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    const movie = await prisma.movies.update({
      where: { id: movieId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });
    res.json({ message: `Đã chuyển bộ phim "${movie.title}" vào Thùng rác!`, movie });
  } catch (error) {
    console.error("Lỗi khi chuyển vào thùng rác:", error);
    res.status(500).json({ error: "Lỗi khi chuyển phim vào thùng rác" });
  }
});

// 6. API: Khôi phục phim từ Thùng rác (Phải là Admin)
router.put("/movies/:id/restore", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    const restored = await prisma.movies.update({
      where: { id: movieId },
      data: {
        is_deleted: false,
        deleted_at: null,
      },
      include: {
        movie_genres: {
          include: {
            genres: true,
          },
        },
      },
    });

    const formattedMovie = {
      ...restored,
      genres: restored.movie_genres?.map((mg) => mg.genres) || [],
    };

    res.json({ message: `Đã khôi phục thành công phim "${restored.title}"!`, movie: formattedMovie });
  } catch (error) {
    console.error("Lỗi khi khôi phục phim:", error);
    res.status(500).json({ error: "Lỗi khi khôi phục phim từ thùng rác" });
  }
});

// 7. API: Xóa vĩnh viễn phim (Hard Delete khỏi PostgreSQL - Phải là Admin)
router.delete("/movies/:id/force", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    await prisma.movies.delete({ where: { id: movieId } });
    res.json({ message: `Đã xóa vĩnh viễn bộ phim ID ${movieId} khỏi cơ sở dữ liệu!` });
  } catch (error) {
    console.error("Lỗi khi xóa vĩnh viễn phim:", error);
    res.status(500).json({ error: "Lỗi khi xóa vĩnh viễn phim khỏi cơ sở dữ liệu" });
  }
});

// Gán thể loại cho phim (Chỉ Admin)
// API: POST /movies/:id/genres
router.post("/movies/:id/genres", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    const { genreId } = req.body; // Client gửi lên genreId (camelCase)

    // Lưu vào bảng trung gian với chuẩn snake_case của CSDL
    const newMovieGenre = await prisma.movie_genres.create({
      data: {
        movie_id: movieId,
        genre_id: parseInt(genreId),
      },
    });

    res.status(201).json({ message: "Đã gán thể loại thành công", data: newMovieGenre });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi gán thể loại cho phim" });
  }
});

module.exports = router;
