import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function LoginPage() {
  const navigate = useNavigate();

  // Chế độ: "login" (Đăng nhập) hoặc "register" (Đăng ký)
  const [isLogin, setIsLogin] = useState(true);

  // Trạng thái Form
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Trạng thái xử lý API
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Cập nhật giá trị input
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Xóa thông báo lỗi khi người dùng gõ lại
    if (errorMessage) setErrorMessage("");
  };

  // Nút điền nhanh tài khoản Admin để test
  const handleQuickFillAdmin = () => {
    setIsLogin(true);
    setErrorMessage("");
    setSuccessMessage("");
    setFormData({
      username: "",
      email: "truong@gmail.com",
      password: "123456",
      confirmPassword: "",
    });
  };

  // Xử lý gửi Form (Submit Đăng nhập / Đăng ký)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Xử lý Đăng Ký
    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        setErrorMessage("Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!");
        return;
      }

      if (formData.password.length < 6) {
        setErrorMessage("Mật khẩu phải có độ dài ít nhất 6 ký tự!");
        return;
      }

      try {
        setLoading(true);
        const res = await axios.post("http://localhost:5000/register", {
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });

        setSuccessMessage("🎉 Đăng ký tài khoản thành công! Vui lòng đăng nhập.");
        setIsLogin(true);
        setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
        setLoading(false);
      } catch (err) {
        setLoading(false);
        const serverError = err.response?.data?.error || "Lỗi hệ thống khi đăng ký. Vui lòng thử lại!";
        setErrorMessage(serverError);
      }
      return;
    }

    // Xử lý Đăng Nhập
    try {
      setLoading(true);
      const res = await axios.post("http://localhost:5000/login", {
        email: formData.email,
        password: formData.password,
      });

      const { token, user } = res.data;

      // 1. Lưu Token và thông tin User vào localStorage
      localStorage.setItem("token", token);
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      setSuccessMessage("✅ Đăng nhập thành công! Đang chuyển hướng...");

      // 2. Chuyển hướng thông minh theo Role
      setTimeout(() => {
        if (user && user.role === "ADMIN") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }, 700);
    } catch (err) {
      setLoading(false);
      const serverError = err.response?.data?.error || "Đăng nhập thất bại. Vui lòng kiểm tra lại Email hoặc Mật khẩu!";
      setErrorMessage(serverError);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0d] text-white flex flex-col justify-between overflow-hidden font-sans select-none">
      {/* ============================================================== */}
      {/* ẢNH NỀN VÀ HIỆU ỨNG ÁNH SÁNG PHONG CÁCH NETFLIX                */}
      {/* ============================================================== */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://image.tmdb.org/t/p/original/nMKdUUepR0i5zn0y1T4CsSB5eko.jpg"
          alt="Cinema Background"
          className="w-full h-full object-cover opacity-20 scale-105 filter blur-[2px]"
        />
        {/* Lớp phủ tối điện ảnh (Vignette & Gradient) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0d] via-[#0a0a0d]/85 to-[#0a0a0d]/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-transparent to-red-600/10 pointer-events-none" />
      </div>

      {/* ============================================================== */}
      {/* HEADER / NAVBAR TỐI GIẢN                                       */}
      {/* ============================================================== */}
      <header className="relative z-10 px-6 sm:px-12 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-3xl font-black tracking-wider text-white group-hover:scale-105 transition-transform">
            FILM<span className="text-red-600">WEB</span>
          </span>
        </Link>

        <Link
          to="/"
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/80 px-4 py-2 rounded-full border border-zinc-800 transition-all backdrop-blur-md"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Về trang chủ</span>
        </Link>
      </header>

      {/* ============================================================== */}
      {/* CARD ĐĂNG NHẬP / ĐĂNG KÝ CHÍNH GIỮA                            */}
      {/* ============================================================== */}
      <main className="relative z-10 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[440px] bg-[#14141b]/90 border border-zinc-800/90 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/80 backdrop-blur-xl">
          {/* Header của Form */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isLogin ? "Chào mừng trở lại!" : "Tạo tài khoản mới"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              {isLogin
                ? "Khám phá hàng trăm bộ phim bom tấn đỉnh cao"
                : "Đăng ký thành viên để lưu phim và trải nghiệm tốt nhất"}
            </p>

            {/* Thanh chuyển đổi (Tab Toggle) */}
            <div className="mt-6 p-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl flex items-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                  isLogin
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                  !isLogin
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Đăng ký
              </button>
            </div>
          </div>

          {/* Banner Thông báo Lỗi nếu có */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-red-400 text-xs">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Banner Thông báo Thành công nếu có */}
          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-400 text-xs">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form nhập liệu */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Trường Tên (chỉ hiện khi Đăng ký) */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Tên hiển thị / Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="VD: Nguyễn Văn A"
                    required={!isLogin}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {/* Trường Email */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Địa chỉ Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                  </svg>
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* Trường Mật khẩu */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Mật khẩu
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => alert("Chức năng khôi phục mật khẩu qua Email đang được tích hợp!")}
                    className="text-[11px] font-medium text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Nhập ít nhất 6 ký tự"
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-11 py-3 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu (chỉ hiện khi Đăng ký) */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Xác nhận lại mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Nhập lại đúng mật khẩu"
                    required={!isLogin}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {/* Checkbox Ghi nhớ */}
            {isLogin && (
              <div className="flex items-center pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-zinc-700 text-red-600 focus:ring-0 focus:ring-offset-0 bg-zinc-800 w-4 h-4 cursor-pointer"
                  />
                  <span>Ghi nhớ đăng nhập trên thiết bị này</span>
                </label>
              </div>
            )}

            {/* Nút bấm Submit chính */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? "Đăng nhập ngay" : "Tạo tài khoản"}</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Hộp gợi ý Demo tài khoản ADMIN */}
          <div className="mt-8 pt-6 border-t border-zinc-800/80">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
                    Demo Admin
                  </span>
                  <span className="text-xs font-bold text-white">truong@gmail.com</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">Mật khẩu: <span className="text-zinc-200 font-mono">123456</span></p>
              </div>

              <button
                type="button"
                onClick={handleQuickFillAdmin}
                className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl border border-red-500/20 transition-colors"
              >
                Điền nhanh
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================== */}
      {/* FOOTER ĐƠN GIẢN                                                */}
      {/* ============================================================== */}
      <footer className="relative z-10 py-6 text-center text-xs text-zinc-500 border-t border-zinc-900">
        <p>© 2026 FILMWEB Security. Mọi thông tin tài khoản được mã hóa chuẩn JWT.</p>
      </footer>
    </div>
  );
}

export default LoginPage;
