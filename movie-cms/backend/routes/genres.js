const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Gọi 2 bác bảo vệ vào để phân quyền
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// 1. Lấy danh sách toàn bộ thể loại đang hoạt động (Kèm thống kê số lượng phim thực tế)
router.get("/genres", async (req, res) => {
  try {
    const allGenres = await prisma.genres.findMany({
      where: {
        OR: [{ is_deleted: false }, { is_deleted: null }],
      },
      orderBy: { id: "asc" },
      include: {
        _count: {
          select: { movie_genres: true },
        },
      },
    });

    const formattedGenres = allGenres.map((g) => ({
      id: g.id,
      name: g.name,
      movie_count: g._count?.movie_genres || 0,
    }));

    res.json(formattedGenres);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách thể loại:", error);
    res.status(500).json({ error: "Lỗi khi lấy danh sách thể loại" });
  }
});

// 2. Lấy danh sách thể loại trong Thùng rác (Chỉ Admin)
router.get("/genres/trash", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const trashGenres = await prisma.genres.findMany({
      where: { is_deleted: true },
      orderBy: { deleted_at: "desc" },
      include: {
        _count: {
          select: { movie_genres: true },
        },
      },
    });

    const formatted = trashGenres.map((g) => ({
      id: g.id,
      name: g.name,
      movie_count: g._count?.movie_genres || 0,
      deleted_at: g.deleted_at,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Lỗi khi lấy thể loại trong thùng rác:", error);
    res.status(500).json({ error: "Lỗi khi lấy danh sách thể loại trong thùng rác" });
  }
});

// 3. Thêm thể loại mới (Chỉ Admin)
router.post("/genres", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Tên thể loại không được để trống!" });
    }

    const trimmedName = name.trim();

    // Kiểm tra trùng tên thể loại
    const existing = await prisma.genres.findFirst({
      where: { name: { equals: trimmedName, mode: "insensitive" } },
    });
    if (existing) {
      return res.status(400).json({ error: `Thể loại "${trimmedName}" đã tồn tại!` });
    }

    const newGenre = await prisma.genres.create({
      data: { name: trimmedName },
    });

    res.status(201).json({ ...newGenre, movie_count: 0 });
  } catch (error) {
    console.error("Lỗi khi thêm thể loại:", error);
    res.status(500).json({ error: "Lỗi khi thêm thể loại mới" });
  }
});

// 3. Cập nhật tên thể loại (Chỉ Admin)
router.put("/genres/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const genreId = parseInt(req.params.id);
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Tên thể loại không được để trống!" });
    }

    const trimmedName = name.trim();

    // Kiểm tra xem tên mới có trùng với thể loại khác không
    const duplicate = await prisma.genres.findFirst({
      where: {
        name: { equals: trimmedName, mode: "insensitive" },
        NOT: { id: genreId },
      },
    });
    if (duplicate) {
      return res.status(400).json({ error: `Thể loại "${trimmedName}" đã được sử dụng!` });
    }

    const updated = await prisma.genres.update({
      where: { id: genreId },
      data: { name: trimmedName },
      include: {
        _count: {
          select: { movie_genres: true },
        },
      },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      movie_count: updated._count?.movie_genres || 0,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật thể loại:", error);
    res.status(500).json({ error: "Lỗi khi cập nhật thể loại" });
  }
});

// 5. Xóa mềm thể loại (Đưa vào Thùng rác - Chỉ Admin)
router.delete("/genres/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const genreId = parseInt(req.params.id);
    const genre = await prisma.genres.findUnique({ where: { id: genreId } });
    if (!genre) {
      return res.status(404).json({ error: "Không tìm thấy thể loại cần xóa!" });
    }

    await prisma.genres.update({
      where: { id: genreId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });

    res.json({ message: `Đã chuyển thể loại "${genre.name}" vào Thùng rác!` });
  } catch (error) {
    console.error("Lỗi khi chuyển thể loại vào thùng rác:", error);
    res.status(500).json({ error: "Lỗi khi chuyển thể loại vào thùng rác" });
  }
});

// 6. Khôi phục thể loại từ Thùng rác (Chỉ Admin)
router.put("/genres/:id/restore", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const genreId = parseInt(req.params.id);
    const restored = await prisma.genres.update({
      where: { id: genreId },
      data: {
        is_deleted: false,
        deleted_at: null,
      },
      include: {
        _count: {
          select: { movie_genres: true },
        },
      },
    });

    res.json({
      message: `Đã khôi phục thành công thể loại "${restored.name}"!`,
      genre: {
        id: restored.id,
        name: restored.name,
        movie_count: restored._count?.movie_genres || 0,
      },
    });
  } catch (error) {
    console.error("Lỗi khi khôi phục thể loại:", error);
    res.status(500).json({ error: "Lỗi khi khôi phục thể loại" });
  }
});

// 7. Xóa vĩnh viễn thể loại khỏi PostgreSQL (Hard Delete - Chỉ Admin)
router.delete("/genres/:id/force", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const genreId = parseInt(req.params.id);
    const genre = await prisma.genres.findUnique({ where: { id: genreId } });
    if (!genre) {
      return res.status(404).json({ error: "Không tìm thấy thể loại!" });
    }

    await prisma.genres.delete({ where: { id: genreId } });
    res.json({ message: `Đã xóa vĩnh viễn thể loại "${genre.name}" khỏi cơ sở dữ liệu!` });
  } catch (error) {
    console.error("Lỗi khi xóa vĩnh viễn thể loại:", error);
    res.status(500).json({ error: "Lỗi khi xóa vĩnh viễn thể loại" });
  }
});

module.exports = router;