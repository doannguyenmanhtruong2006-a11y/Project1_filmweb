const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Gọi 2 bác bảo vệ vào để phân quyền
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// 1. Lấy danh sách toàn bộ thể loại (Ai cũng xem được)
router.get("/genres", async (req, res) => {
    try {
        const allGenres = await prisma.genres.findMany();
        res.json(allGenres);
    } catch (error) {
        res.status(500).json({ error: "Lỗi khi lấy danh sách thể loại" });
    }
});

// 2. Thêm thể loại mới (Chỉ Admin)
router.post("/genres", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        const newGenre = await prisma.genres.create({
            data: { name }
        });
        res.status(201).json(newGenre);
    } catch (error) {
        res.status(500).json({ error: "Lỗi khi thêm thể loại mới" });
    }
});

// 3. Cập nhật tên thể loại (Chỉ Admin)
router.put("/genres/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const genreId = parseInt(req.params.id);
        const { name } = req.body;
        const updatedGenre = await prisma.genres.update({
            where: { id: genreId },
            data: { name }
        });
        res.json(updatedGenre);
    } catch (error) {
        res.status(500).json({ error: "Lỗi khi cập nhật thể loại" });
    }
});

// 4. Xóa thể loại (Chỉ Admin)
router.delete("/genres/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const genreId = parseInt(req.params.id);
        await prisma.genres.delete({ where: { id: genreId } });
        res.json({ message: `Đã xóa thành công thể loại ID ${genreId}` });
    } catch (error) {
        res.status(500).json({ error: "Lỗi khi xóa thể loại" });
    }
});

module.exports = router;