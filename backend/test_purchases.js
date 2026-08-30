require('dotenv').config();
const { checkRecentPurchases } = require('./src/modules/agent/tools/inventoryTools');

async function test() {
  console.log("Testing checkRecentPurchases...");
  const result = await checkRecentPurchases({ limit: "5" });
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

test();
