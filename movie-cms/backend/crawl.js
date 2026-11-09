const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

const prisma = new PrismaClient();
const TMDB_API_KEY = "bf1b591e44900730133654df4682fd2e";
const BASE_URL = "https://api.themoviedb.org/3";

async function crawlData() {
    try {
        console.log("🚀 Bắt đầu cào dữ liệu từ TMDB...");

        // 1. Cào danh sách Thể loại (Genres)
        const genreRes = await axios.get(
            `${BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=vi`
        );
        const genres = genreRes.data.genres;

        console.log(`📂 Tìm thấy ${genres.length} thể loại. Đang lưu vào DB...`);
        for (const g of genres) {
            await prisma.genres.upsert({
                where: { id: g.id },
                update: { name: g.name },
                create: {
                    id: g.id,
                    name: g.name
                }
            });
        }

        // 2. Cào danh sách Phim phổ biến (5 trang = 100 phim)
        let insertedCount = 0;
        let updatedCount = 0;

        for (let page = 1; page <= 5; page++) {
            const movieRes = await axios.get(
                `${BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=vi&page=${page}`
            );
            const movies = movieRes.data.results;

            console.log(`\n📄 Đang xử lý trang ${page}/5 (${movies.length} phim)...`);

            for (const m of movies) {
                // Gọi API chi tiết của từng phim để lấy thêm: thời lượng, đạo diễn, quốc gia, rating độ tuổi
                let detail = null;
                try {
                    const detailRes = await axios.get(
                        `${BASE_URL}/movie/${m.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,release_dates&language=vi`
                    );
                    detail = detailRes.data;
                } catch (err) {
                    console.warn(`  ⚠️ Không thể lấy chi tiết phim ${m.title}: ${err.message}`);
                }

                // --- Xử lý các trường dữ liệu mới ---
                // 1. Điểm IMDb / Vote Average (Float)
                const imdbScore = detail?.vote_average
                    ? Math.round(detail.vote_average * 10) / 10
                    : m.vote_average
                    ? Math.round(m.vote_average * 10) / 10
                    : null;

                // 2. Thời lượng phim (phút - Int)
                const durationMin = detail?.runtime || null;

                // 3. Đạo diễn (Director - String max 100)
                const directorName =
                    detail?.credits?.crew?.find((c) => c.job === "Director")?.name ||
                    null;
                const director = directorName ? directorName.substring(0, 100) : null;

                // 4. Quốc gia sản xuất (String max 50)
                const countryName =
                    detail?.production_countries?.[0]?.name ||
                    detail?.origin_country?.[0] ||
                    null;
                const country = countryName ? countryName.substring(0, 50) : null;

                // 5. Độ tuổi / Phân loại (String max 10, vd: P, PG-13, 18+, T16)
                let ageRating = "P";
                const cert = detail?.release_dates?.results
                    ?.find((x) => x.iso_3166_1 === "US" || x.iso_3166_1 === "VN")
                    ?.release_dates?.find((r) => r.certification)?.certification;

                if (cert && cert.trim() !== "") {
                    ageRating = cert.trim().substring(0, 10);
                } else if (m.adult || detail?.adult) {
                    ageRating = "18+";
                }

                // Dữ liệu phim chuẩn bị lưu
                const movieData = {
                    title: m.title,
                    description: m.overview || "Đang cập nhật...",
                    thumbnail_url: m.poster_path
                        ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
                        : "",
                    release_year: m.release_date
                        ? parseInt(m.release_date.substring(0, 4))
                        : null,
                    imdb_score: imdbScore,
                    age_rating: ageRating,
                    duration_min: durationMin,
                    director: director,
                    country: country
                };

                // Kiểm tra xem phim đã có trong DB chưa
                const existingMovie = await prisma.movies.findFirst({
                    where: { title: m.title }
                });

                let savedMovieId;

                if (existingMovie) {
                    // Nếu đã có: cập nhật bổ sung các trường dữ liệu mới
                    await prisma.movies.update({
                        where: { id: existingMovie.id },
                        data: movieData
                    });
                    savedMovieId = existingMovie.id;
                    updatedCount++;
                } else {
                    // Nếu chưa có: tạo mới hoàn toàn
                    const createdMovie = await prisma.movies.create({
                        data: movieData
                    });
                    savedMovieId = createdMovie.id;
                    insertedCount++;
                }

                // 3. Liên kết Phim với Thể loại (bảng movie_genres)
                if (m.genre_ids && m.genre_ids.length > 0) {
                    for (const genreId of m.genre_ids) {
                        try {
                            await prisma.movie_genres.upsert({
                                where: {
                                    movie_id_genre_id: {
                                        movie_id: savedMovieId,
                                        genre_id: genreId
                                    }
                                },
                                update: {},
                                create: {
                                    movie_id: savedMovieId,
                                    genre_id: genreId
                                }
                            });
                        } catch (e) {
                            // Bỏ qua nếu lỗi liên kết thể loại
                        }
                    }
                }
            }
        }

        console.log(`\n🎉 HOÀN TẤT CÀO DỮ LIỆU!`);
        console.log(`   - Phim thêm mới: ${insertedCount}`);
        console.log(`   - Phim đã cập nhật thông tin mới: ${updatedCount}`);
    } catch (error) {
        console.error("❌ Lỗi trong quá trình cào dữ liệu:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

crawlData();
