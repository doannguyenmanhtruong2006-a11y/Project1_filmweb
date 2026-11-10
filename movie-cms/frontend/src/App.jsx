import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MovieDetail from './pages/MovieDetail';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang chủ */}
        <Route path="/" element={<HomePage />} />

        {/* Trang chi tiết phim */}
        <Route path="/movie/:id" element={<MovieDetail />} />

        {/* Các trang sẽ làm tiếp */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<div className="text-white p-10">Trang Đăng nhập (Đang xây dựng)</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;