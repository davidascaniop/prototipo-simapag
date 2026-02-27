const OpenAI = require('openai');

// NOTA: OpenAI inicializado pero comentado para evitar el error de región.
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const getAssistantId = () => "asst_gZmMQQ9TNaDxxnEP2ncwxF23"; // ID de SIMAPAG proporcionado

const createThread = async () => {
    const thread = await openai.beta.threads.create();
    return thread;
};

const addMessageToThread = async (threadId, content) => {
    const message = await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: content
    });
    return message;
};

const runAssistant = async (threadId) => {
    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: getAssistantId(),
    });
    return run;
};

const checkRunStatus = async (threadId, runId) => {
    const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    return runStatus;
};

const getMessages = async (threadId) => {
    const messages = await openai.beta.threads.messages.list(threadId);
    return messages.data;
};

module.exports = {
    createThread,
    addMessageToThread,
    runAssistant,
    checkRunStatus,
    getMessages,
};
