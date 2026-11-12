const express = require("express");
const router = express.Router(); // Dùng Router thay cho app
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// API: Đăng ký tài khoản mới
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu" });

    const existingUser = await prisma.users.findUnique({
      where: { email: email },
    });
    if (existingUser)
      return res.status(400).json({ error: "Email này đã được sử dụng" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.users.create({
      data: { username: username, email: email, password: hashedPassword },
    });
    res.status(201).json({ message: "Đăng ký thành công!", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi hệ thống khi đăng ký" });
  }
});

// API: Đăng nhập
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.users.findUnique({ where: { email: email } });
    if (!user) return res.status(404).json({ error: "Email không tồn tại" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ error: "Mật khẩu không chính xác" });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      "CHIA_KHOA_BI_MAT",
      { expiresIn: "2h" },
    );
    res.json({
      message: "Đăng nhập thành công",
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi hệ thống khi đăng nhập" });
  }
});

// Xuất router ra để file server.js có thể mang vào dùng
module.exports = router;
