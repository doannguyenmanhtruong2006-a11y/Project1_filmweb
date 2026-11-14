const express = require("express");
const cors = require("cors");

const app = express();

// Cấu hình Middleware cơ bản
app.use(cors());
app.use(express.json()); // Cho phép server đọc dữ liệu JSON

// Gọi hệ thống Router
const authRoutes = require("./routes/auth");
const movieRoutes = require("./routes/movies");
const genreRoutes = require("./routes/genres");
const episodeRoutes = require("./routes/episodes");
const bookmarkRoutes = require("./routes/bookmarks");
const userRoutes = require("./routes/users");
// Cắm đường ống Router vào app
app.use("/", authRoutes);
app.use("/", movieRoutes);
app.use("/", genreRoutes);
app.use("/", episodeRoutes);
app.use("/", bookmarkRoutes);
app.use("/", userRoutes);
// API kiểm tra server
app.get("/", (req, res) => {
  res.send("Backend Server Web Phim đang chạy!");
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});


