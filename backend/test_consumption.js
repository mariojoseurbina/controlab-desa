require('dotenv').config();
const { checkConsumptionRate } = require('./src/modules/agent/tools/inventoryTools');

async function test() {
  console.log("Testing checkConsumptionRate...");
  const result = await checkConsumptionRate({ category: "Hematología" });
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

test();
