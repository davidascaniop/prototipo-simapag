require('dotenv').config();
const OpenAI = require('openai');
const openai = new OpenAI();
async function run() {
    try {
        await openai.beta.threads.runs.create(undefined, { assistant_id: "asst_123" });
    } catch (e) {
        console.log("TEST CREATE ERROR:", e.message);
    }
}
run();
