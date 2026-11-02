const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Chỉ cần gọi "bác bảo vệ" kiểm tra đăng nhập (User thường cũng dùng được)
const { verifyToken } = require("../middleware/auth");

// 1. Thêm phim vào danh sách yêu thích (Yêu cầu đăng nhập)
// API: POST /bookmarks
router.post("/bookmarks", verifyToken, async (req, res) => {
    try {
        const { user_id, movie_id } = req.body;

        const newBookmark = await prisma.bookmarks.create({
            data: {
                user_id: parseInt(user_id),
                movie_id: parseInt(movie_id)
            }
        });

        res.status(201).json(newBookmark);
    } catch (error) {
        res.status(500).json({ error: "Lỗi khi lưu phim vào danh sách yêu thích" });
    }
});

// 2. Lấy danh sách phim đã lưu của một người dùng cụ thể
// API: GET /users/:id/bookmarks
router.get("/users/:id/bookmarks", verifyToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        const userBookmarks = await prisma.bookmarks.findMany({
            where: { user_id: userId }
        });

        res.json(userBookmarks);
    } catch (error) {
        res.status(500).json({ error: "Lỗi khi lấy danh sách yêu thích" });
    }
});

module.exports = router;
