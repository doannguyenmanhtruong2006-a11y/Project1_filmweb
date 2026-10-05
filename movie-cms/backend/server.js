const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client"); // Gọi công cụ Prisma

const app = express();
const prisma = new PrismaClient(); // Khởi tạo người phiên dịch

const bcrypt = require("bcryptjs"); // Khai báo công cụ băm mật khẩu

const jwt = require("jsonwebtoken"); // Khai báo công cụ làm thẻ thông hành

// Trạm kiểm soát: Middleware xác thực Token
const verifyToken = (req, res, next) => {
  // Lấy thẻ thông hành từ người dùng gửi lên
  const token = req.header("Authorization");

  // Nếu không đưa thẻ ra -> Đuổi về
  if (!token)
    return res
      .status(401)
      .json({ error: "Từ chối truy cập! Bạn chưa đăng nhập." });

  try {
    // Dùng chìa khóa bí mật để kiểm tra thẻ thật/giả
    const verified = jwt.verify(token, "CHIA_KHOA_BI_MAT");

    // Nếu thẻ thật, móc lấy thông tin người dùng lưu lại và cho phép đi qua chốt
    req.user = verified;
    next(); // Lệnh quan trọng nhất: Cho phép đi tiếp vào API bên trong
  } catch (error) {
    res.status(400).json({ error: "Thẻ không hợp lệ hoặc đã hết hạn!" });
  }
};

// Trạm kiểm soát 2: Chỉ cho phép Admin đi qua
const verifyAdmin = (req, res, next) => {
  // Lấy thông tin user mà bác bảo vệ 1 (verifyToken) vừa kiểm tra xong
  if (req.user && req.user.role === "ADMIN") {
    next(); // Đúng là Admin, cho phép đi tiếp để Thêm/Xóa phim
  } else {
    res
      .status(403)
      .json({ error: "Không đủ thẩm quyền! Chỉ Admin mới được làm việc này." });
  }
};

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
app.post("/movies", verifyAdmin, verifyToken, async (req, res) => {
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
app.get("/movies/:id", verifyAdmin, verifyToken, async (req, res) => {
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
app.put("/movies/:id", verifyAdmin, verifyToken, async (req, res) => {
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
app.delete("/movies/:id", verifyAdmin, verifyToken, async (req, res) => {
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

// API: Đăng ký tài khoản mới
app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. Kiểm tra xem người dùng có nhập đủ thông tin không
    if (!email || !password) {
      return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu" });
    }

    // 2. Kiểm tra xem email này đã tồn tại trong Database chưa
    const existingUser = await prisma.users.findUnique({
      where: { email: email },
    });
    if (existingUser) {
      return res.status(400).json({ error: "Email này đã được sử dụng" });
    }

    // 3. Mã hóa (Băm) mật khẩu
    const salt = await bcrypt.genSalt(10); // Tạo ra một chuỗi ngẫu nhiên để trộn
    const hashedPassword = await bcrypt.hash(password, salt); // Trộn và băm mật khẩu

    // 4. Lưu người dùng mới vào Database với mật khẩu đã mã hóa
    const newUser = await prisma.users.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword, // Tuyệt đối KHÔNG lưu 'password' gốc
      },
    });

    res.status(201).json({ message: "Đăng ký thành công!", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi hệ thống khi đăng ký" });
  }
});

// API: Đăng nhập
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Tìm người dùng trong Database qua email
    const user = await prisma.users.findUnique({
      where: { email: email },
    });

    // Nếu không tìm thấy user nào khớp email
    if (!user) {
      return res.status(404).json({ error: "Email không tồn tại" });
    }

    // 2. Đối chiếu mật khẩu (Băm mật khẩu người dùng vừa nhập và so sánh với cục băm trong Database)
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Mật khẩu không chính xác" });
    }

    // 3. Đăng nhập thành công -> Cấp thẻ thông hành (JWT Token)
    // Lưu ý: Chuỗi "CHIA_KHOA_BI_MAT" thực tế sẽ được giấu kín trong file .env
    const token = jwt.sign(
      { userId: user.id, role: user.role }, // Kẹp ID và quyền của người dùng vào thẻ
      "CHIA_KHOA_BI_MAT", // Chữ ký của máy chủ để chống làm giả
      { expiresIn: "2h" }, // Thẻ có hạn sử dụng 2 tiếng
    );

    // Trả về Token cho người dùng
    res.json({ message: "Đăng nhập thành công", token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi hệ thống khi đăng nhập" });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
