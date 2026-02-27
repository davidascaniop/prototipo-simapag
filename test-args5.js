require('dotenv').config();
const OpenAI = require('openai');
const openai = new OpenAI();
async function run() {
    try {
        await openai.beta.threads.runs.retrieve("thread_123", { thread_id: "thread_456" });
    } catch (e) {
        console.log("TEST STRING ERROR:", e.message);
    }
}
run();
