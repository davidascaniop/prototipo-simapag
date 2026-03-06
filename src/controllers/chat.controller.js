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
        let lastFormattedAdeudo = null;

        while (runStatus.status !== "completed") {
            if (runStatus.status === "failed" || runStatus.status === "cancelled" || runStatus.status === "expired") {
                throw new Error(`Run ended with status: ${runStatus.status}`);
            }

            if (runStatus.status === "requires_action") {
                const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
                const toolOutputs = [];

                for (const toolCall of toolCalls) {
                    if (toolCall.function.name === "consulta_adeudo" || toolCall.function.name === "consultar_adeudo") {
                        const args = JSON.parse(toolCall.function.arguments);
                        const rpu = args.rpu || args.RPU;
                        const adeudoResult = await openaiService.consultarAdeudo(rpu);
                        lastFormattedAdeudo = openaiService.formatAdeudo(adeudoResult);

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
        const assistantMessage = messages.find(m => m.role === 'assistant');

        if (assistantMessage && assistantMessage.content[0].type === 'text') {
            let reply = assistantMessage.content[0].text.value;

            // CASO A: El asistente usó la herramienta "consulta_adeudo" y tiene un placeholder o le falta info
            if (lastFormattedAdeudo) {
                // Reemplazamos el boilerplate si existe literalmente
                if (reply.includes('[inserta información que el sistema te otorgue]')) {
                    reply = reply.replace('[inserta información que el sistema te otorgue]', lastFormattedAdeudo);
                }
                // Si la respuesta es genérica o corta (como la de la captura), inyectamos el resultado
                else if (!reply.includes('RPU:') && !reply.includes('Adeudo')) {
                    reply = `${reply}\n\n${lastFormattedAdeudo}`;
                }
            }

            // CASO B: El asistente devolvió directamente el JSON de despacho (Fallback)
            if (reply.includes('"intencion"') && reply.includes('"consulta_adeudo"')) {
                try {
                    const jsonMatch = reply.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const dispatcher = JSON.parse(jsonMatch[0]);
                        const rpu = dispatcher.datos?.rpu || dispatcher.rpu;
                        if (rpu) {
                            const result = await openaiService.consultarAdeudo(rpu);
                            const formatted = openaiService.formatAdeudo(result);
                            // Mantener el prefijo si existe
                            const naturalPrefix = reply.split('{')[0].trim();
                            reply = naturalPrefix ? `${naturalPrefix}\n\n${formatted}` : formatted;
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
