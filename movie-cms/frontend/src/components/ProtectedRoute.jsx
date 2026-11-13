import { Navigate } from "react-router-dom";

/**
 * Component Bốt gác bảo vệ (Protected Route)
 * - Kiểm tra token đăng nhập trong localStorage
 * - Kiểm tra quyền hạn (Role) của tài khoản
 * - Nếu không hợp lệ: Lập tức đá văng về /login hoặc /
 */
function ProtectedRoute({ children, requiredRole = "ADMIN" }) {
  const token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");

  // 1. Chưa đăng nhập (không có Token hoặc thông tin User)
  if (!token || !savedUser) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(savedUser);

    // 2. Có đăng nhập nhưng sai Quyền (ví dụ tài khoản USER cố vào trang ADMIN)
    if (requiredRole && user.role !== requiredRole) {
      alert("⚠️ Bạn không có quyền truy cập trang quản trị! Vui lòng đăng nhập tài khoản ADMIN.");
      return <Navigate to="/" replace />;
    }

    // 3. Hợp lệ hoàn toàn: Mở cổng cho vào trang đích
    return children;
  } catch (error) {
    // Trường hợp dữ liệu user bị hỏng
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }
}

export default ProtectedRoute;

