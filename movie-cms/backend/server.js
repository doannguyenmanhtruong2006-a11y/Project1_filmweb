const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json()); // Cho phép server đọc dữ liệu JSON

// API kiểm tra server
app.get("/", (req, res) => {
  res.send("Backend Server Web Phim đang chạy!");
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
