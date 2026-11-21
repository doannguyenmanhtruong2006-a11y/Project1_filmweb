import React, { useState, useEffect } from "react";
import axios from "axios";

/**
 * Modal Hồ sơ Cá nhân & Đổi mật khẩu dành cho người dùng đăng nhập
 */
export function ProfileModal({ isOpen, onClose, currentUser, onUserUpdated }) {
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "password"

  // State cho Tab Hồ sơ
  const [username, setUsername] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // State cho Tab Đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Reset và fetch thông tin mới nhất mỗi khi mở modal
  useEffect(() => {
    if (isOpen) {
      setUsername(currentUser?.username || "");
      setProfileSuccess("");
      setProfileError("");
      setPasswordSuccess("");
      setPasswordError("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Lấy thông tin chi tiết qua GET /users/me
      const token = localStorage.getItem("token");
      if (token) {
        axios
          .get("http://localhost:5000/users/me", {
            headers: { Authorization: token },
          })
          .then((res) => {
            setUserProfile(res.data);
            if (res.data.username) setUsername(res.data.username);
          })
          .catch((err) => {
            console.warn("Không lấy được dữ liệu profile chi tiết:", err);
          });
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Xử lý Cập nhật Tên hiển thị (Profile)
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setProfileError("Tên hiển thị không được để trống!");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setProfileLoading(true);
      setProfileError("");
      setProfileSuccess("");

      const res = await axios.put(
        "http://localhost:5000/users/profile",
        { username: username.trim() },
        { headers: { Authorization: token } }
      );

      const updated = res.data.user;
      setUserProfile((prev) => ({ ...prev, ...updated }));
      setProfileSuccess("🎉 Cập nhật tên hiển thị thành công!");

      // Lưu lại vào localStorage và callback lên component cha
      const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const newSaved = { ...savedUser, username: updated.username };
      localStorage.setItem("user", JSON.stringify(newSaved));
      if (onUserUpdated) onUserUpdated(newSaved);

      setTimeout(() => setProfileSuccess(""), 4000);
      setProfileLoading(false);
    } catch (err) {
      console.error("Lỗi cập nhật profile:", err);
      setProfileError(err.response?.data?.error || "Lỗi khi cập nhật thông tin!");
      setProfileLoading(false);
    }
  };

  // Xử lý Đổi mật khẩu
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Vui lòng nhập đầy đủ các trường thông tin!");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu mới và xác nhận mật khẩu không khớp!");
      return;
    }

    if (newPassword.length < 3) {
      setPasswordError("Mật khẩu mới phải có ít nhất 3 ký tự!");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setPasswordLoading(true);
      setPasswordError("");
      setPasswordSuccess("");

      const res = await axios.put(
        "http://localhost:5000/users/change-password",
        { currentPassword, newPassword },
        { headers: { Authorization: token } }
      );

      setPasswordSuccess("✅ " + res.data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordLoading(false);
    } catch (err) {
      console.error("Lỗi đổi mật khẩu:", err);
      setPasswordError(err.response?.data?.error || "Lỗi khi đổi mật khẩu!");
      setPasswordLoading(false);
    }
  };

  const displayName = userProfile?.username || currentUser?.username || "Người dùng";
  const userRole = userProfile?.role || currentUser?.role || "USER";
  const userEmail = userProfile?.email || currentUser?.email || "";

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#181824] border border-zinc-700/80 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
        >
          ✕
        </button>

        {/* Header: Avatar & Tên tóm tắt */}
        <div className="flex items-center gap-4 pb-5 border-b border-zinc-800">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-xl font-extrabold text-white shadow-lg shadow-red-600/30">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white line-clamp-1">
                {displayName}
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  userRole === "ADMIN"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                }`}
              >
                {userRole === "ADMIN" ? "👑 QUẢN TRỊ" : "👤 THÀNH VIÊN"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{userEmail}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-zinc-900/90 border border-zinc-800 rounded-xl p-1 mt-5">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "profile"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>👤 Hồ sơ cá nhân</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("password")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "password"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>🔒 Đổi mật khẩu</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: THÔNG TIN CÁ NHÂN                                       */}
        {/* ============================================================== */}
        {activeTab === "profile" && (
          <form onSubmit={handleUpdateProfile} className="mt-5 space-y-4">
            {profileError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                ⚠️ {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs">
                {profileSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Địa chỉ Email (Cố định)
              </label>
              <input
                type="email"
                disabled
                value={userEmail}
                className="w-full bg-[#111118] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Tên hiển thị của bạn *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên bạn muốn hiển thị"
                className="w-full bg-[#12121a] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            {/* Thông số phụ */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs text-zinc-400">
              <span>Phim đã lưu yêu thích:</span>
              <span className="font-bold text-amber-400">
                {userProfile?.bookmarks_count ?? "—"} phim
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {profileLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Lưu thay đổi</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* TAB 2: ĐỔI MẬT KHẨU                                            */}
        {/* ============================================================== */}
        {activeTab === "password" && (
          <form onSubmit={handleChangePassword} className="mt-5 space-y-3.5">
            {passwordError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                ⚠️ {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs">
                {passwordSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Mật khẩu hiện tại *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu đang dùng"
                className="w-full bg-[#12121a] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Mật khẩu mới *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 3 ký tự"
                className="w-full bg-[#12121a] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Xác nhận mật khẩu mới *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full bg-[#12121a] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            {/* Nút bật/tắt xem mật khẩu */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-300">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-0"
                />
                <span>Hiện mật khẩu</span>
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {passwordLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <span>Đổi mật khẩu ngay</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ProfileModal;
