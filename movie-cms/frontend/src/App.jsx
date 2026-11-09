import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Đường dẫn mặc định (Trang chủ) */}
        <Route path="/" element={<HomePage />} />

        {/* Các trang chuẩn bị xây dựng tiếp theo */}
        <Route path="/movie/:id" element={<div className="text-white p-10">Trang Chi tiết phim (Đang xây dựng)</div>} />
        <Route path="/admin" element={<div className="text-white p-10">Trang Quản trị Admin (Đang xây dựng)</div>} />
        <Route path="/login" element={<div className="text-white p-10">Trang Đăng nhập (Đang xây dựng)</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;