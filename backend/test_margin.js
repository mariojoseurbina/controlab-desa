const { calculateTestMargins } = require('./src/modules/agent/tools/costTools');

async function test() {
  try {
    const result = await calculateTestMargins({});
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
