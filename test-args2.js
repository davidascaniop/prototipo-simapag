require('dotenv').config();
const OpenAI = require('openai');
const openai = new OpenAI();
async function run() {
    try {
        await openai.beta.threads.runs.retrieve({ thread_id: "thread_12", run_id: undefined });
    } catch (e) {
        console.log("TEST 3 ERROR:", e.message);
    }
}
run();
