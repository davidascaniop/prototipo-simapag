const openaiService = require('../services/openai.service');

const initializeChat = async (req, res) => {
    try {
        const thread = await openaiService.createThread();
        res.status(200).json({ threadId: thread.id });
    } catch (error) {
        console.error("Error initializing chat:", error);
        res.status(500).json({ error: error.message || "Failed to initialize chat" });
    }
};

const sendMessage = async (req, res) => {
    const { threadId, message } = req.body;
    if (!threadId || !message) {
        return res.status(400).json({ error: "threadId and message are required" });
    }

    try {
        await openaiService.addMessageToThread(threadId, message);
        const run = await openaiService.runAssistant(threadId);

        // Polling logic
        let runStatus = await openaiService.checkRunStatus(threadId, run.id);
        while (runStatus.status !== "completed") {
            if (runStatus.status === "failed" || runStatus.status === "cancelled" || runStatus.status === "expired") {
                throw new Error(`Run ended with status: ${runStatus.status}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openaiService.checkRunStatus(threadId, run.id);
        }

        const messages = await openaiService.getMessages(threadId);

        // The most recent assistant message will be the first one in the list (or depending on sort order)
        const assistantMessage = messages.find(m => m.role === 'assistant');

        if (assistantMessage && assistantMessage.content[0].type === 'text') {
            res.status(200).json({ reply: assistantMessage.content[0].text.value });
        } else {
            res.status(500).json({ error: "Failed to parse assistant reply" });
        }
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: error.message || "Failed to send message" });
    }
};

module.exports = {
    initializeChat,
    sendMessage,
};
