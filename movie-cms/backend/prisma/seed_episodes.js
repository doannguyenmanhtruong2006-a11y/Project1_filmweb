const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const sampleStreams = [
  "https://vjs.zencdn.net/v/oceans.mp4",
  "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
  "https://www.w3schools.com/html/mov_bbb.mp4",
];

async function main() {
  console.log("Checking movies for episodes...");
  const movies = await prisma.movies.findMany({
    select: { id: true, title: true, episodes: { select: { id: true } } },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${movies.length} movies.`);
  let addedCount = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    if (movie.episodes.length === 0) {
      // Add 2 or 3 episodes per movie
      const episodeCount = (i % 3) + 1; // 1, 2, or 3 episodes
      const data = [];
      for (let ep = 1; ep <= episodeCount; ep++) {
        const streamUrl = sampleStreams[(i + ep - 1) % sampleStreams.length];
        data.push({
          movie_id: movie.id,
          episode_number: ep,
          video_url: streamUrl,
        });
      }
      await prisma.episodes.createMany({ data });
      addedCount += data.length;
    }
  }

  console.log(`Successfully seeded ${addedCount} episodes across ${movies.length} movies!`);
}

main()
  .catch((e) => {
    console.error("Error seeding episodes:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

