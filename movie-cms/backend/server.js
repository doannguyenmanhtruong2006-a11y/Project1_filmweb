const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client"); // Gọi công cụ Prisma

const app = express();
const prisma = new PrismaClient(); // Khởi tạo người phiên dịch

app.use(cors());
app.use(express.json()); // Cho phép server đọc dữ liệu JSON

// API kiểm tra server
app.get("/", (req, res) => {
  res.send("Backend Server Web Phim đang chạy!");
});

// API: Lấy danh sách toàn bộ phim
app.get("/movies", async (req, res) => {
  try {
    // Dùng Prisma để lấy tất cả dữ liệu từ bảng 'movies'
    const allMovies = await prisma.movies.findMany();
    res.json(allMovies); // Gửi cục dữ liệu đó về cho Frontend
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi hệ thống khi lấy dữ liệu phim" });
  }
});

// API: Thêm một bộ phim mới
// API: Thêm một bộ phim mới
// API: Thêm một bộ phim mới
app.post("/movies", async (req, res) => {
  try {
    // 1. Phải khai báo đúng chữ 'thumbnail_url' để hứng dữ liệu từ Thunder Client
    const { title, description, release_year, thumbnail_url } = req.body;

    // 2. Trỏ đúng biến vừa hứng vào cột 'thumbnail_url' của Database
    const newMovie = await prisma.movies.create({
      data: {
        title: title,
        description: description,
        release_year: release_year,
        thumbnail_url: thumbnail_url,
      },
    });

    res.status(201).json(newMovie);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi khi thêm phim mới" });
  }
});

// API: Lấy chi tiết 1 bộ phim theo ID
app.get("/movies/:id", async (req, res) => {
  try {
    const movieId = parseInt(req.params.id); // Lấy ID từ trên thanh URL
    const movie = await prisma.movies.findUnique({
      where: { id: movieId },
    });

    if (!movie) return res.status(404).json({ error: "Không tìm thấy phim" });
    res.json(movie);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi hệ thống" });
  }
});

// API: Cập nhật thông tin phim (Sửa)
app.put("/movies/:id", async (req, res) => {
  try {
    const movieId = parseInt(req.params.id); // Lấy ID phim từ URL
    const { title, description, release_year, thumbnail_url } = req.body;

    // Tìm phim theo ID và cập nhật dữ liệu mới
    const updatedMovie = await prisma.movies.update({
      where: { id: movieId },
      data: {
        title: title,
        description: description,
        release_year: release_year,
        thumbnail_url: thumbnail_url,
      },
    });

    res.json(updatedMovie);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi khi cập nhật hoặc phim không tồn tại" });
  }
});

// API: Xóa một bộ phim
app.delete("/movies/:id", async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);

    await prisma.movies.delete({
      where: { id: movieId },
    });

    res.json({ message: `Đã xóa thành công bộ phim có ID là ${movieId}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi khi xóa phim" });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
