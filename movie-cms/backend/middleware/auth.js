const jwt = require("jsonwebtoken");

// Bác bảo vệ 1: Kiểm tra xem có thẻ Token không
const verifyToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token)
    return res
      .status(401)
      .json({ error: "Từ chối truy cập! Bạn chưa đăng nhập." });

  try {
    const verified = jwt.verify(token, "CHIA_KHOA_BI_MAT");
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: "Thẻ không hợp lệ hoặc đã hết hạn!" });
  }
};

// Bác bảo vệ 2: Kiểm tra xem có phải Admin không
const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === "ADMIN") {
    next();
  } else {
    res
      .status(403)
      .json({ error: "Không đủ thẩm quyền! Chỉ Admin mới được làm việc này." });
  }
};

// Xuất 2 bác bảo vệ ra để các file khác có thể gọi tới
module.exports = { verifyToken, verifyAdmin };
