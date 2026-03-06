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

            if (runStatus.status === "requires_action") {
                const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
                const toolOutputs = [];

                for (const toolCall of toolCalls) {
                    // Soporte para posibles nombres de la función
                    if (toolCall.function.name === "consulta_adeudo" || toolCall.function.name === "consultar_adeudo") {
                        const args = JSON.parse(toolCall.function.arguments);
                        const rpu = args.rpu || args.RPU;
                        const adeudoResult = await openaiService.consultarAdeudo(rpu);
                        toolOutputs.push({
                            tool_call_id: toolCall.id,
                            output: JSON.stringify(adeudoResult)
                        });
                    } else {
                        toolOutputs.push({
                            tool_call_id: toolCall.id,
                            output: JSON.stringify({ error: "Tool not implemented in backend" })
                        });
                    }
                }

                await openaiService.submitToolOutputs(threadId, run.id, toolOutputs);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openaiService.checkRunStatus(threadId, run.id);
        }

        const messages = await openaiService.getMessages(threadId);

        // The most recent assistant message will be the first one in the list (or depending on sort order)
        const assistantMessage = messages.find(m => m.role === 'assistant');

        if (assistantMessage && assistantMessage.content[0].type === 'text') {
            let reply = assistantMessage.content[0].text.value;

            // Detectar si la respuesta contiene un JSON de despacho (como el que mostró el usuario)
            // Buscamos algo que parezca un JSON con intencion: consulta_adeudo
            if (reply.includes('"intencion"') && reply.includes('"consulta_adeudo"')) {
                try {
                    // Extraer el JSON del texto (por si viene acompañado de texto natural)
                    const jsonMatch = reply.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const dispatcher = JSON.parse(jsonMatch[0]);
                        if (dispatcher.intencion === "consulta_adeudo" || dispatcher.intencion === "consultar_adeudo") {
                            const rpu = dispatcher.datos?.rpu || dispatcher.rpu;
                            if (rpu) {
                                const adeudoResult = await openaiService.consultarAdeudo(rpu);
                                const formattedReply = openaiService.formatAdeudo(adeudoResult);

                                // Opcionalmente mantener el texto natural previo al JSON si existe
                                const naturalPrefix = reply.split('{')[0].trim();
                                reply = naturalPrefix ? `${naturalPrefix}\n\n${formattedReply}` : formattedReply;
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error al procesar el dispatcher JSON:", e);
                }
            }

            res.status(200).json({ reply });
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
