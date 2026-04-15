import { getPrismaClient } from "../src/client.js";
import { loadRawMarkets } from "../../../services/markets/src/index.js";
import { parseMarkets } from "../../../services/market-parser/src/index.js";
import { upsertParsedMarkets } from "../src/repositories.js";

const runSeed = async (): Promise<void> => {
  const prisma = getPrismaClient();
  const rawMarkets = await loadRawMarkets();
  const parsedMarkets = parseMarkets(rawMarkets);
  await upsertParsedMarkets(prisma, parsedMarkets);
};

runSeed()
  .then(() => {
    console.log("Seed completed.");
  })
  .catch((error: unknown) => {
    console.error("Seed failed.", error);
    process.exitCode = 1;
  });
