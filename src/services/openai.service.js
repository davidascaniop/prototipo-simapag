const OpenAI = require('openai');
const axios = require('axios');// NOTA: OpenAI inicializado pero comentado para evitar el error de región.
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
    const runStatus = await openai.beta.threads.runs.retrieve(runId, { thread_id: threadId });
    return runStatus;
};

const submitToolOutputs = async (threadId, runId, toolOutputs) => {
    return await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
        tool_outputs: toolOutputs
    });
};

const consultarAdeudo = async (rpu) => {
    try {
        const url = process.env.SIMAPAG_API_URL
            ? `${process.env.SIMAPAG_API_URL}/adeudos/${rpu}`
            : `https://api.simapag.com.mx/adeudos/${rpu}`;

        const token = process.env.SIMAPAG_API_TOKEN || "100260|5UQbVNo2xyuX9jGzpH8iNXY3YNfiNaWg8rcmEMdDcf543e43";

        const response = await axios.get(url, {
            headers: {
                "plain-text-token": token,
                "Authorization": `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error al consultar adeudo para RPU ${rpu}:`, error.message);
        return { error: true, mensaje: 'No se pudo consultar el adeudo en este momento', rpu };
    }
};

const formatAdeudo = (adeudo) => {
    if (adeudo.error || !adeudo) {
        return "No pude consultar tu adeudo en este momento. Por favor intenta en unos minutos.";
    }

    const monto = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(adeudo.adeudo || adeudo.monto || 0);
    const nombre = adeudo.nombre || 'Ciudadano';
    const rpu = adeudo.rpu;
    const fechaLimite = adeudo.fecha_limite || adeudo.fecha_vencimiento || '';
    const periodos = adeudo.periodos || adeudo.meses_pendientes || 1;

    let msg = `💧 *Consulta de adeudo SIMAPAG*\n\n`;
    msg += `📋 RPU: ${rpu}\n`;
    msg += `👤 Titular: ${nombre}\n`;
    msg += `💰 Adeudo actual: *${monto}*\n`;

    if (periodos > 1) msg += `📅 Periodos pendientes: ${periodos}\n`;
    if (fechaLimite) msg += `⏰ Fecha límite: ${fechaLimite}\n`;

    msg += (adeudo.adeudo === 0 || adeudo.monto === 0)
        ? `\n✅ ¡Tu cuenta está al corriente!`
        : `\nPuedes pagar en oficinas SIMAPAG o puntos autorizados.`;

    return msg;
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
    submitToolOutputs,
    consultarAdeudo,
    formatAdeudo,
    getMessages,
};
