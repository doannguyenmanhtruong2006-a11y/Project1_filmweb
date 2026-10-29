const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Gọi 2 bác bảo vệ từ bốt gác vào
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// 1. API: Lấy danh sách toàn bộ phim (Mở cửa tự do)
router.get("/movies", async (req, res) => {
  try {
    const allMovies = await prisma.movies.findMany();
    res.json(allMovies);
  } catch (error) {
    res.status(500).json({ error: "Lỗi hệ thống khi lấy dữ liệu phim" });
  }
});

// 2. API: Lấy chi tiết 1 bộ phim (Mở cửa tự do)
router.get("/movies/:id", async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    const movie = await prisma.movies.findUnique({ where: { id: movieId } });
    if (!movie) return res.status(404).json({ error: "Không tìm thấy phim" });
    res.json(movie);
  } catch (error) {
    res.status(500).json({ error: "Lỗi hệ thống" });
  }
});

// 3. API: Thêm phim mới (Phải là Admin)
router.post("/movies", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, release_year, thumbnail_url } = req.body;
    const newMovie = await prisma.movies.create({
      data: { title, description, release_year, thumbnail_url },
    });
    res.status(201).json(newMovie);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi thêm phim mới" });
  }
});

// 4. API: Cập nhật thông tin phim (Phải là Admin)
router.put("/movies/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    const { title, description, release_year, thumbnail_url } = req.body;
    const updatedMovie = await prisma.movies.update({
      where: { id: movieId },
      data: { title, description, release_year, thumbnail_url },
    });
    res.json(updatedMovie);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi cập nhật phim" });
  }
});

// 5. API: Xóa phim (Phải là Admin)
router.delete("/movies/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    await prisma.movies.delete({ where: { id: movieId } });
    res.json({ message: `Đã xóa thành công phim ID ${movieId}` });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi xóa phim" });
  }
});

module.exports = router;
