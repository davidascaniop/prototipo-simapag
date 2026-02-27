document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');
    const toast = document.getElementById('toast');

    let currentThreadId = null;

    // Initialize the chat thread on load
    const initChat = async () => {
        try {
            const response = await fetch('/api/chat/init', { method: 'POST' });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                if (errData.error && errData.error.includes('Country, region, or territory not supported')) {
                    throw new Error("OpenAI bloqueado (Error de Región). Enciende un VPN.");
                }
                throw new Error(errData.error || 'Failed to initialize');
            }
            const data = await response.json();
            currentThreadId = data.threadId;
            console.log('Thread initialized:', currentThreadId);
        } catch (error) {
            console.error('Error initializing chat:', error);
            const isNetworkError = error instanceof TypeError || error.message === 'Failed to fetch' || error.message.includes('servidor');
            showError(isNetworkError
                ? "El servidor local no está corriendo. Recuerda ejecutar 'npm start'."
                : error.message);
        }
    };

    const addMessageToUI = (text, isUser) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex mb-2 ${isUser ? 'justify-end' : 'justify-start'}`;

        const bubble = document.createElement('div');
        bubble.className = `max-w-[70%] px-3 py-2 rounded-lg text-sm shadow-sm relative break-words whitespace-pre-wrap ${isUser ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'
            }`;

        // Add text and timestamp
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        bubble.innerHTML = `
            <span class="mr-6">${text}</span>
            <span class="text-[10px] text-gray-500 absolute bottom-1 right-2">${time}</span>
        `;

        messageDiv.appendChild(bubble);
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    };

    const scrollToBottom = () => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const showError = (message) => {
        toast.textContent = message;
        toast.classList.remove('opacity-0');
        setTimeout(() => toast.classList.add('opacity-0'), 3000);
    };

    const sendMessage = async () => {
        if (!currentThreadId) {
            showError("Chat no inicializado aún. Intenta de nuevo.");
            return;
        }

        const text = messageInput.value.trim();
        if (!text) return;

        addMessageToUI(text, true);
        messageInput.value = '';
        messageInput.focus();

        typingIndicator.style.display = 'inline';

        try {
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    threadId: currentThreadId,
                    message: text
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to send message');
            }

            const data = await response.json();
            addMessageToUI(data.reply, false);
        } catch (error) {
            console.error('Error sending message:', error);
            const isNetworkError = error instanceof TypeError || error.message.includes('servidor');
            showError(isNetworkError ? "El servidor no responde. ¿Está corriendo?" : error.message);
        } finally {
            typingIndicator.style.display = 'none';
        }
    };

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Start
    initChat();
});
