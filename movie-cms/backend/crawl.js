const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

const prisma = new PrismaClient();
const TMDB_API_KEY = "bf1b591e44900730133654df4682fd2e"; // Thay API Key của bạn vào đây
const BASE_URL = "https://api.themoviedb.org/3";

async function crawlData() {
    try {
        console.log("Bắt đầu cào dữ liệu từ TMDB...");

        // 1. Cào danh sách Thể loại (Genres)
        const genreRes = await axios.get(`${BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=vi`);
        const genres = genreRes.data.genres;

        console.log(`Tìm thấy ${genres.length} thể loại. Đang lưu vào DB...`);
        for (const g of genres) {
            await prisma.genres.upsert({
                where: { id: g.id },
                update: {},
                create: {
                    id: g.id,
                    name: g.name
                }
            });
        }

        // 2. Cào danh sách Phim phổ biến từ nhiều trang (Ví dụ: 5 trang = 100 phim)
        let totalMovies = 0;

        // Lặp từ trang 1 đến trang 5
        for (let page = 1; page <= 5; page++) {
            const movieRes = await axios.get(`${BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=vi&page=${page}`);
            const movies = movieRes.data.results;

            console.log(`Đang xử lý ${movies.length} phim từ trang ${page}...`);

            for (const m of movies) {
                // Kiểm tra xem phim đã tồn tại trong DB chưa để tránh lỗi trùng lặp khi chạy lại nhiều lần
                const existingMovie = await prisma.movies.findFirst({ where: { title: m.title } });
                if (existingMovie) continue;

                // Lưu thông tin phim
                const savedMovie = await prisma.movies.create({
                    data: {
                        title: m.title,
                        description: m.overview || "Đang cập nhật...",
                        thumbnail_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "",
                        release_year: m.release_date ? parseInt(m.release_date.substring(0, 4)) : null
                    }
                });

                // Liên kết Phim với Thể loại vào bảng trung gian
                for (const genreId of m.genre_ids) {
                    await prisma.movie_genres.create({
                        data: {
                            movie_id: savedMovie.id,
                            genre_id: genreId
                        }
                    });
                }
                totalMovies++;
            }
        }
        console.log(`🎉 Đã bổ sung thành công ${totalMovies} phim mới vào Database!`);
    } catch (error) {
        console.error("Lỗi trong quá trình cào dữ liệu:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

crawlData();
