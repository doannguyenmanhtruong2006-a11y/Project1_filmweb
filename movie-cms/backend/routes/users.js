const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Bảo vệ phân quyền: Chỉ Admin mới được truy cập các API này
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// 1. Lấy danh sách toàn bộ người dùng đang hoạt động
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const allUsers = await prisma.users.findMany({
      where: {
        OR: [{ is_deleted: false }, { is_deleted: null }],
      },
      orderBy: { id: "asc" },
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
    });

    // Không bao giờ trả về mật khẩu hashed ra frontend
    const sanitized = allUsers.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role || "USER",
      created_at: u.created_at,
      bookmarks_count: u._count?.bookmarks || 0,
    }));

    res.json(sanitized);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách người dùng:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi lấy danh sách người dùng" });
  }
});

// 2. Lấy danh sách người dùng trong Thùng rác (Đã xóa mềm)
router.get("/users/trash", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const trashUsers = await prisma.users.findMany({
      where: { is_deleted: true },
      orderBy: { deleted_at: "desc" },
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
    });

    const sanitized = trashUsers.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role || "USER",
      created_at: u.created_at,
      deleted_at: u.deleted_at,
      bookmarks_count: u._count?.bookmarks || 0,
    }));

    res.json(sanitized);
  } catch (error) {
    console.error("Lỗi khi lấy người dùng trong thùng rác:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi lấy danh sách thùng rác người dùng" });
  }
});

// ====================================================================
// CÁC API DÀNH RIÊNG CHO NGƯỜI DÙNG ĐĂNG NHẬP (USER PROFILE & SECURITY)
// ====================================================================

// 2.1. Lấy thông tin cá nhân của chính mình (Ai đã đăng nhập cũng dùng được)
// GET /users/me
router.get("/users/me", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
    });

    if (!user || user.is_deleted) {
      return res.status(404).json({ error: "Tài khoản không tồn tại hoặc đã bị khóa!" });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || "USER",
      created_at: user.created_at,
      bookmarks_count: user._count?.bookmarks || 0,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin cá nhân:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi lấy thông tin cá nhân" });
  }
});

// 2.2. Cập nhật thông tin cá nhân (Tên hiển thị username)
// PUT /users/profile
router.put("/users/profile", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: "Tên hiển thị không được để trống!" });
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { username: username.trim() },
    });

    res.json({
      message: "Cập nhật thông tin cá nhân thành công!",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        created_at: updatedUser.created_at,
      },
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật profile:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi cập nhật thông tin cá nhân" });
  }
});

// 2.3. Tự đổi mật khẩu tài khoản
// PUT /users/change-password
router.put("/users/change-password", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới!",
      });
    }

    if (newPassword.length < 3) {
      return res.status(400).json({
        error: "Mật khẩu mới phải có ít nhất 3 ký tự!",
      });
    }

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Tài khoản không tồn tại!" });
    }

    // So khớp mật khẩu cũ
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Mật khẩu hiện tại không chính xác!" });
    }

    // Hash mật khẩu mới bằng bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.users.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({
      message: "Đổi mật khẩu thành công! Bạn có thể sử dụng mật khẩu mới cho các lần đăng nhập tiếp theo.",
    });
  } catch (error) {
    console.error("Lỗi khi đổi mật khẩu:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi đổi mật khẩu" });
  }
});

// 3. Thêm tài khoản người dùng mới
router.post("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email không được để trống!" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Mật khẩu phải có ít nhất 6 ký tự!" });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Kiểm tra trùng email
    const existing = await prisma.users.findUnique({
      where: { email: trimmedEmail },
    });
    if (existing) {
      return res.status(400).json({ error: `Email "${trimmedEmail}" đã được đăng ký trên hệ thống!` });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.users.create({
      data: {
        username: username?.trim() || "Thành viên",
        email: trimmedEmail,
        password: hashedPassword,
        role: role === "ADMIN" ? "ADMIN" : "USER",
      },
    });

    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      created_at: newUser.created_at,
      bookmarks_count: 0,
    });
  } catch (error) {
    console.error("Lỗi khi tạo người dùng mới:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi tạo người dùng" });
  }
});

// 4. Cập nhật thông tin người dùng (Họ tên, email, vai trò, mật khẩu mới nếu có)
router.put("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, email, role, password } = req.body;

    const existingUser = await prisma.users.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng!" });
    }

    // Bảo vệ: Admin không thể tự tước quyền ADMIN của chính mình
    if (req.user?.userId === userId && role === "USER" && existingUser.role === "ADMIN") {
      return res.status(400).json({
        error: "Bạn đang đăng nhập bằng tài khoản này, không thể tự hạ quyền Admin của chính mình!",
      });
    }

    const trimmedEmail = email?.trim().toLowerCase();
    if (trimmedEmail && trimmedEmail !== existingUser.email) {
      const emailTaken = await prisma.users.findFirst({
        where: {
          email: trimmedEmail,
          NOT: { id: userId },
        },
      });
      if (emailTaken) {
        return res.status(400).json({ error: `Email "${trimmedEmail}" đã thuộc về tài khoản khác!` });
      }
    }

    const updateData = {};
    if (username !== undefined) updateData.username = username.trim();
    if (trimmedEmail) updateData.email = trimmedEmail;
    if (role && (role === "ADMIN" || role === "USER")) updateData.role = role;

    // Nếu có nhập mật khẩu mới
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự!" });
      }
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password.trim(), salt);
    }

    const updated = await prisma.users.update({
      where: { id: userId },
      data: updateData,
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
    });

    res.json({
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      created_at: updated.created_at,
      bookmarks_count: updated._count?.bookmarks || 0,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật người dùng:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi cập nhật người dùng" });
  }
});

// 5. Thay đổi vai trò nhanh (Toggle / Set Role)
router.put("/users/:id/role", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!["ADMIN", "USER"].includes(role)) {
      return res.status(400).json({ error: "Vai trò chỉ có thể là ADMIN hoặc USER!" });
    }

    // Bảo vệ: Admin không thể tự hạ quyền của chính mình
    if (req.user?.userId === userId && role === "USER") {
      return res.status(400).json({
        error: "Bạn không thể tự hạ quyền Admin của chính mình!",
      });
    }

    const updated = await prisma.users.update({
      where: { id: userId },
      data: { role },
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
    });

    res.json({
      message: `Đã thay đổi quyền tài khoản "${updated.email}" thành ${role}!`,
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        created_at: updated.created_at,
        bookmarks_count: updated._count?.bookmarks || 0,
      },
    });
  } catch (error) {
    console.error("Lỗi khi đổi quyền người dùng:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi đổi quyền" });
  }
});

// 6. Xóa mềm người dùng (Đưa vào Thùng rác)
router.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Bảo vệ: Không cho phép Admin tự xóa chính mình
    if (req.user?.userId === userId) {
      return res.status(400).json({
        error: "Bạn không thể tự xóa tài khoản của chính mình khi đang đăng nhập!",
      });
    }

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng!" });
    }

    await prisma.users.update({
      where: { id: userId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });

    res.json({
      message: `Đã chuyển tài khoản "${user.email}" vào Thùng rác! Người dùng này sẽ không thể đăng nhập.`,
    });
  } catch (error) {
    console.error("Lỗi khi chuyển người dùng vào thùng rác:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi xóa người dùng" });
  }
});

// 7. Khôi phục người dùng từ Thùng rác
router.put("/users/:id/restore", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const restored = await prisma.users.update({
      where: { id: userId },
      data: {
        is_deleted: false,
        deleted_at: null,
      },
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
    });

    res.json({
      message: `Đã khôi phục thành công tài khoản "${restored.email}"!`,
      user: {
        id: restored.id,
        username: restored.username,
        email: restored.email,
        role: restored.role,
        created_at: restored.created_at,
        bookmarks_count: restored._count?.bookmarks || 0,
      },
    });
  } catch (error) {
    console.error("Lỗi khi khôi phục người dùng:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi khôi phục người dùng" });
  }
});

// 8. Xóa vĩnh viễn người dùng khỏi PostgreSQL (Hard Delete)
router.delete("/users/:id/force", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Bảo vệ: Không cho phép Admin tự xóa vĩnh viễn chính mình
    if (req.user?.userId === userId) {
      return res.status(400).json({
        error: "Bạn không thể tự xóa vĩnh viễn tài khoản của chính mình!",
      });
    }

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng!" });
    }

    await prisma.users.delete({ where: { id: userId } });
    res.json({
      message: `Đã xóa vĩnh viễn tài khoản "${user.email}" khỏi cơ sở dữ liệu!`,
    });
  } catch (error) {
    console.error("Lỗi khi xóa vĩnh viễn người dùng:", error);
    res.status(500).json({ error: "Lỗi hệ thống khi xóa vĩnh viễn người dùng" });
  }
});

module.exports = router;

