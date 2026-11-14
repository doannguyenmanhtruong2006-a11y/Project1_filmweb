const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Gọi middleware xác thực JWT
const { verifyToken } = require("../middleware/auth");

// 1. Lấy toàn bộ danh sách phim yêu thích của người dùng đang đăng nhập
// GET /bookmarks
router.get("/bookmarks", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const userBookmarks = await prisma.bookmarks.findMany({
      where: {
        user_id: userId,
        movies: {
          OR: [{ is_deleted: false }, { is_deleted: null }],
        },
      },
      include: {
        movies: {
          include: {
            movie_genres: {
              include: {
                genres: true,
              },
            },
          },
        },
      },
      orderBy: {
        movie_id: "desc",
      },
    });

    const formatted = userBookmarks.map((b) => ({
      user_id: b.user_id,
      movie_id: b.movie_id,
      movie: {
        id: b.movies.id,
        title: b.movies.title,
        description: b.movies.description,
        thumbnail_url: b.movies.thumbnail_url,
        poster_url: b.movies.thumbnail_url,
        release_year: b.movies.release_year,
        imdb_score: b.movies.imdb_score,
        duration_min: b.movies.duration_min,
        country: b.movies.country,
        director: b.movies.director,
        age_rating: b.movies.age_rating,
        genres: (b.movies.movie_genres || [])
          .map((mg) => mg.genres)
          .filter((g) => g && !g.is_deleted),
      },
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu thích:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi lấy danh sách yêu thích" });
  }
});

// 2. Kiểm tra xem 1 bộ phim cụ thể đã được người dùng lưu hay chưa
// GET /bookmarks/check/:movieId
router.get("/bookmarks/check/:movieId", verifyToken, async (req, res) => {
  try {
    const movieId = parseInt(req.params.movieId);
    const userId = req.user.userId;

    const existing = await prisma.bookmarks.findUnique({
      where: {
        user_id_movie_id: {
          user_id: userId,
          movie_id: movieId,
        },
      },
    });

    res.json({
      movie_id: movieId,
      is_bookmarked: !!existing,
    });
  } catch (error) {
    console.error("Lỗi khi kiểm tra bookmark:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi kiểm tra trạng thái bookmark" });
  }
});

// 3. Thêm phim vào danh sách yêu thích
// Hỗ trợ cả 2 dạng: POST /bookmarks/:movieId HOẶC POST /bookmarks (body: { movie_id })
const handleAddBookmark = async (req, res) => {
  try {
    const movieId = parseInt(req.params.movieId || req.body.movie_id);
    const userId = req.user.userId;

    if (!movieId || isNaN(movieId)) {
      return res.status(400).json({ error: "Thiếu ID bộ phim cần lưu!" });
    }

    // Kiểm tra xem phim có tồn tại và đang hoạt động không
    const movie = await prisma.movies.findFirst({
      where: {
        id: movieId,
        OR: [{ is_deleted: false }, { is_deleted: null }],
      },
    });

    if (!movie) {
      return res.status(404).json({ error: "Không tìm thấy bộ phim hoặc phim đã bị xóa!" });
    }

    // Kiểm tra xem đã lưu trước đó chưa (tránh lỗi duplicate key)
    const existing = await prisma.bookmarks.findUnique({
      where: {
        user_id_movie_id: {
          user_id: userId,
          movie_id: movieId,
        },
      },
    });

    if (existing) {
      return res.json({
        message: `Phim "${movie.title}" đã có trong danh sách yêu thích từ trước!`,
        is_bookmarked: true,
        bookmark: existing,
      });
    }

    const newBookmark = await prisma.bookmarks.create({
      data: {
        user_id: userId,
        movie_id: movieId,
      },
    });

    res.status(201).json({
      message: `Đã lưu phim "${movie.title}" vào danh sách yêu thích!`,
      is_bookmarked: true,
      bookmark: newBookmark,
    });
  } catch (error) {
    console.error("Lỗi khi lưu bookmark:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi lưu phim vào danh sách yêu thích" });
  }
};

router.post("/bookmarks", verifyToken, handleAddBookmark);
router.post("/bookmarks/:movieId", verifyToken, handleAddBookmark);

// 4. Xóa phim khỏi danh sách yêu thích (Bỏ lưu)
// DELETE /bookmarks/:movieId
router.delete("/bookmarks/:movieId", verifyToken, async (req, res) => {
  try {
    const movieId = parseInt(req.params.movieId);
    const userId = req.user.userId;

    if (!movieId || isNaN(movieId)) {
      return res.status(400).json({ error: "Thiếu ID bộ phim cần bỏ lưu!" });
    }

    const existing = await prisma.bookmarks.findUnique({
      where: {
        user_id_movie_id: {
          user_id: userId,
          movie_id: movieId,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Phim này chưa có trong danh sách yêu thích của bạn!" });
    }

    await prisma.bookmarks.delete({
      where: {
        user_id_movie_id: {
          user_id: userId,
          movie_id: movieId,
        },
      },
    });

    res.json({
      message: "Đã xóa phim khỏi danh sách yêu thích thành công!",
      is_bookmarked: false,
      movie_id: movieId,
    });
  } catch (error) {
    console.error("Lỗi khi xóa bookmark:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi xóa phim khỏi danh sách yêu thích" });
  }
});

// 5. Chuyển đổi nhanh trạng thái Bookmark (Toggle 1-Click: Chưa lưu -> Lưu, Đã lưu -> Bỏ lưu)
// POST /bookmarks/toggle/:movieId
router.post("/bookmarks/toggle/:movieId", verifyToken, async (req, res) => {
  try {
    const movieId = parseInt(req.params.movieId);
    const userId = req.user.userId;

    if (!movieId || isNaN(movieId)) {
      return res.status(400).json({ error: "Thiếu ID bộ phim!" });
    }

    const movie = await prisma.movies.findFirst({
      where: {
        id: movieId,
        OR: [{ is_deleted: false }, { is_deleted: null }],
      },
    });

    if (!movie) {
      return res.status(404).json({ error: "Bộ phim không tồn tại hoặc đã bị xóa!" });
    }

    const existing = await prisma.bookmarks.findUnique({
      where: {
        user_id_movie_id: {
          user_id: userId,
          movie_id: movieId,
        },
      },
    });

    if (existing) {
      // Đã lưu -> Thực hiện bỏ lưu
      await prisma.bookmarks.delete({
        where: {
          user_id_movie_id: {
            user_id: userId,
            movie_id: movieId,
          },
        },
      });

      return res.json({
        message: `Đã xóa phim "${movie.title}" khỏi danh sách yêu thích!`,
        is_bookmarked: false,
        movie_id: movieId,
      });
    } else {
      // Chưa lưu -> Thực hiện lưu
      const newBookmark = await prisma.bookmarks.create({
        data: {
          user_id: userId,
          movie_id: movieId,
        },
      });

      return res.status(201).json({
        message: `Đã lưu phim "${movie.title}" vào danh sách yêu thích!`,
        is_bookmarked: true,
        bookmark: newBookmark,
      });
    }
  } catch (error) {
    console.error("Lỗi khi toggle bookmark:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi đổi trạng thái yêu thích" });
  }
});

// 6. Giữ lại route tương thích ngược cho endpoint cũ nếu cần
// GET /users/:id/bookmarks
router.get("/users/:id/bookmarks", verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const userBookmarks = await prisma.bookmarks.findMany({
      where: {
        user_id: userId,
        movies: {
          OR: [{ is_deleted: false }, { is_deleted: null }],
        },
      },
      include: {
        movies: true,
      },
    });

    res.json(userBookmarks);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi lấy danh sách yêu thích" });
  }
});

module.exports = router;
