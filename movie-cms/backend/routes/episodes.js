const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Gọi 2 "bác bảo vệ" vào để phân quyền
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// 1. Lấy danh sách tập phim và link video của một bộ phim cụ thể (Ai cũng xem được)
// Phù hợp với API: GET /movies/:id/episodes
router.get("/movies/:id/episodes", async (req, res) => {
    try {
        const movieId = parseInt(req.params.id);

        // Tìm tất cả các tập phim có movieId trùng với ID truyền trên URL
        const episodes = await prisma.episodes.findMany({
            where: { movieId: movieId }
        });

        res.json(episodes);
    } catch (error) {
        res.status(500).json({ error: "Lỗi khi lấy danh sách tập phim" });
    }
});

// 2. Thêm tập mới cho phim bộ (Chỉ Admin mới được làm)
// Phù hợp với API: POST /episodes
router.post("/episodes", verifyToken, verifyAdmin, async (req, res) => {
    try {
        // Lấy thông tin tập phim từ Body do Admin gửi lên
        const { title, video_url, movieId } = req.body;

        const newEpisode = await prisma.episodes.create({
            data: {
                title: title,
                video_url: video_url,
                movieId: parseInt(movieId) // Bắt buộc phải có để biết tập này thuộc phim nào
            }
        });

        res.status(201).json(newEpisode);
    } catch (error) {
        res.status(500).json({ error: "Lỗi khi thêm tập phim mới" });
    }
});

module.exports = router;