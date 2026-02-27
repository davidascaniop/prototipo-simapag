require('dotenv').config();
const OpenAI = require('openai');
const openai = new OpenAI();
const getAssistantId = () => "asst_gZmMQQ9TNaDxxnEP2ncwxF23";
async function run() {
    try {
        const thread = await openai.beta.threads.create();
        const run = await openai.beta.threads.runs.create(thread.id, { assistant_id: getAssistantId() });
        console.log("RUN ID:", run.id);
        console.log("RUN THREAD ID:", run.thread_id);
    } catch (e) {
        console.log("TEST ERROR:", e.message);
    }
}
run();
