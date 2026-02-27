require('dotenv').config();
const OpenAI = require('openai');
const openai = new OpenAI();
async function run() {
    try {
        await openai.beta.threads.runs.retrieve(undefined, "thread_123");
    } catch (e) {
        console.log("TEST 1 ERROR:", e.message);
    }

    try {
        await openai.beta.threads.runs.retrieve("thread_123", undefined);
    } catch (e) {
        console.log("TEST 2 ERROR:", e.message);
    }
}
run();
