require('dotenv').config();
const OpenAI = require('openai');
const openai = new OpenAI();
async function run() {
    try {
        await openai.beta.threads.runs.retrieve("run_123", { thread_id: "thread_123" });
    } catch (e) {
        console.log("TEST FIX ERROR:", e.message);
    }
}
run();
