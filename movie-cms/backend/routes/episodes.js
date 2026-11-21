const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Gọi 2 "bác bảo vệ" vào để phân quyền
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// 1. Lấy danh sách tập phim và link video của một bộ phim cụ thể (Ai cũng xem được)
// GET /movies/:id/episodes
router.get("/movies/:id/episodes", async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    if (isNaN(movieId)) {
      return res.status(400).json({ error: "ID phim không hợp lệ" });
    }

    // Tìm tất cả các tập phim có movie_id trùng với ID truyền trên URL, sắp xếp theo số tập tăng dần
    const episodes = await prisma.episodes.findMany({
      where: { movie_id: movieId },
      orderBy: { episode_number: "asc" },
    });

    res.json(episodes);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách tập phim:", error);
    res.status(500).json({ error: "Lỗi khi lấy danh sách tập phim" });
  }
});

// 2. Thêm tập mới cho phim (Chỉ Admin mới được làm)
// POST /episodes
router.post("/episodes", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { episode_number, video_url, movie_id } = req.body;

    if (!movie_id || !episode_number || !video_url) {
      return res.status(400).json({ error: "Vui lòng nhập đầy đủ movie_id, episode_number và video_url" });
    }

    const newEpisode = await prisma.episodes.create({
      data: {
        episode_number: parseInt(episode_number),
        video_url: video_url.trim(),
        movie_id: parseInt(movie_id),
      },
    });

    res.status(201).json(newEpisode);
  } catch (error) {
    console.error("Lỗi khi thêm tập phim:", error);
    res.status(500).json({ error: "Lỗi khi thêm tập phim mới" });
  }
});

// 3. Cập nhật tập phim (Chỉ Admin)
// PUT /episodes/:id
router.put("/episodes/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const episodeId = parseInt(req.params.id);
    const { episode_number, video_url } = req.body;

    const data = {};
    if (episode_number !== undefined) data.episode_number = parseInt(episode_number);
    if (video_url !== undefined) data.video_url = video_url.trim();

    const updated = await prisma.episodes.update({
      where: { id: episodeId },
      data,
    });

    res.json(updated);
  } catch (error) {
    console.error("Lỗi khi cập nhật tập phim:", error);
    res.status(500).json({ error: "Lỗi khi cập nhật tập phim" });
  }
});

// 4. Xóa tập phim (Chỉ Admin)
// DELETE /episodes/:id
router.delete("/episodes/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const episodeId = parseInt(req.params.id);
    await prisma.episodes.delete({
      where: { id: episodeId },
    });

    res.json({ message: `Đã xóa tập phim ID ${episodeId} thành công` });
  } catch (error) {
    console.error("Lỗi khi xóa tập phim:", error);
    res.status(500).json({ error: "Lỗi khi xóa tập phim" });
  }
});

module.exports = router;
