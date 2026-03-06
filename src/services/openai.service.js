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
        const baseUrl = process.env.SIMAPAG_API_URL || 'http://34.51.34.69/api/v1';
        const url = `${baseUrl}/predios/${rpu}/adeudo`;
        const token = process.env.SIMAPAG_API_TOKEN || "100260|5UQbVNo2xyuX9jGzpH8iNXY3YNfiNaWg8rcmEMdDcf543e43";

        console.log(`[SIMAPAG] Consultando adeudo para RPU: ${rpu}`);
        console.log(`[SIMAPAG] URL: ${url}`);

        const response = await axios.post(url, {}, {
            headers: {
                "plain-text-token": token,
                "Authorization": `Bearer ${token}`
            },
            timeout: 15000
        });

        const data = response.data;

        // Caso de error de la API: { errors: [{ detail: "No Existe el predio" }] }
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
            const apiError = data.errors[0];
            console.warn(`[SIMAPAG] API respondió con error: ${apiError.detail}`);
            return {
                error: true,
                tipo: 'rpu_no_encontrado',
                mensaje: apiError.detail || 'RPU no encontrado',
                rpu
            };
        }

        // Caso exitoso: { data: { attributes: { ... } } }
        if (data.data && data.data.attributes) {
            console.log(`[SIMAPAG] Adeudo encontrado para RPU: ${rpu}`);
            return { ...data.data.attributes, rpu };
        }

        // Fallback: devolver data directamente
        console.log(`[SIMAPAG] Respuesta sin estructura esperada, devolviendo raw data`);
        return data;
    } catch (error) {
        console.error(`[SIMAPAG] Error de red al consultar RPU ${rpu}:`, error.message);
        return {
            error: true,
            tipo: 'error_conexion',
            mensaje: 'No se pudo conectar con el servidor de SIMAPAG',
            rpu
        };
    }
};

const formatAdeudo = (adeudo) => {
    if (!adeudo || adeudo.error) {
        // Mensaje específico según el tipo de error
        if (adeudo?.tipo === 'rpu_no_encontrado') {
            return `❌ El RPU *${adeudo.rpu}* no fue encontrado en el sistema.\n\n` +
                `Por favor verifica que tu número de contrato (RPU) sea correcto. ` +
                `Lo puedes encontrar en la parte superior de tu recibo de agua.\n\n` +
                `Si crees que es correcto, acude a las oficinas de SIMAPAG para más ayuda.`;
        }
        if (adeudo?.tipo === 'error_conexion') {
            return "⚠️ No pude conectarme con el sistema de SIMAPAG en este momento. Por favor intenta de nuevo en unos minutos.";
        }
        return "⚠️ No pude consultar tu adeudo en este momento. Por favor intenta en unos minutos.";
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
