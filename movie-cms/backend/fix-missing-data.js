const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

const prisma = new PrismaClient();
const TMDB_API_KEY = "bf1b591e44900730133654df4682fd2e";
const BASE_URL = "https://api.themoviedb.org/3";

async function fillMissingMovieData() {
    try {
        console.log("🔍 Đang tìm các phim bị thiếu thông tin trong Database...");

        // Tìm tất cả các phim đang bị null imdb_score hoặc duration_min
        const incompleteMovies = await prisma.movies.findMany({
            where: {
                OR: [
                    { imdb_score: null },
                    { duration_min: null },
                    { director: null }
                ]
            }
        });

        console.log(`📋 Phát hiện ${incompleteMovies.length} phim đang bị thiếu dữ liệu. Đang cập nhật bù...`);

        let updatedCount = 0;

        for (const m of incompleteMovies) {
            console.log(`\n🔎 Đang tìm kiếm: "${m.title}"...`);

            try {
                // 1. Tìm phim trên TMDB theo tên
                const searchRes = await axios.get(
                    `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
                        m.title
                    )}&language=vi`
                );

                const found = searchRes.data.results?.[0];

                if (!found) {
                    console.warn(`  ⚠️ Không tìm thấy "${m.title}" trên TMDB.`);
                    continue;
                }

                // 2. Lấy thông tin chi tiết của phim tìm được
                const detailRes = await axios.get(
                    `${BASE_URL}/movie/${found.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,release_dates&language=vi`
                );
                const detail = detailRes.data;

                // 3. Trích xuất các trường dữ liệu
                const imdbScore = detail.vote_average
                    ? Math.round(detail.vote_average * 10) / 10
                    : null;

                const durationMin = detail.runtime || null;

                const directorName =
                    detail.credits?.crew?.find((c) => c.job === "Director")?.name ||
                    null;
                const director = directorName ? directorName.substring(0, 100) : null;

                const countryName =
                    detail.production_countries?.[0]?.name ||
                    detail.origin_country?.[0] ||
                    null;
                const country = countryName ? countryName.substring(0, 50) : null;

                let ageRating = "P";
                const cert = detail.release_dates?.results
                    ?.find((x) => x.iso_3166_1 === "US" || x.iso_3166_1 === "VN")
                    ?.release_dates?.find((r) => r.certification)?.certification;

                if (cert && cert.trim() !== "") {
                    ageRating = cert.trim().substring(0, 10);
                } else if (found.adult || detail.adult) {
                    ageRating = "18+";
                }

                // 4. Cập nhật vào DB
                await prisma.movies.update({
                    where: { id: m.id },
                    data: {
                        imdb_score: imdbScore,
                        age_rating: ageRating,
                        duration_min: durationMin,
                        director: director,
                        country: country,
                        release_year: m.release_year || (found.release_date ? parseInt(found.release_date.substring(0, 4)) : null)
                    }
                });

                // 5. Cập nhật thêm thể loại nếu có
                if (found.genre_ids && found.genre_ids.length > 0) {
                    for (const genreId of found.genre_ids) {
                        try {
                            await prisma.movie_genres.upsert({
                                where: {
                                    movie_id_genre_id: {
                                        movie_id: m.id,
                                        genre_id: genreId
                                    }
                                },
                                update: {},
                                create: {
                                    movie_id: m.id,
                                    genre_id: genreId
                                }
                            });
                        } catch (e) {
                            // Bỏ qua lỗi genre
                        }
                    }
                }

                console.log(`  ✅ Đã cập nhật thành công: ⭐ ${imdbScore} | 🕐 ${durationMin}p | 🎬 ${director} | 🌍 ${country}`);
                updatedCount++;
            } catch (err) {
                console.error(`  ❌ Lỗi khi xử lý "${m.title}":`, err.message);
            }
        }

        console.log(`\n🎉 HOÀN TẤT BÙ DỮ LIỆU! Đã cập nhật thành công ${updatedCount}/${incompleteMovies.length} bộ phim.`);
    } catch (error) {
        console.error("Lỗi tổng thể:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fillMissingMovieData();

