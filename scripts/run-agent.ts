import "dotenv/config";
import { runAutoposter, cleanOldPosts } from "../lib/agent";
import { prisma } from "../lib/prisma";

async function main() {
  const publishResults = await runAutoposter();
  const cleaned = await cleanOldPosts();
  console.log(
    JSON.stringify(
      {
        published: publishResults.published,
        failed: publishResults.failed,
        cleaned
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
