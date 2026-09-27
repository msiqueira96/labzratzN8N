export default async function handler(req, res) {
    // Permite apenas requisições POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido. Use POST.' });
    }

    // 🔴 COLE AQUI A URL DO SEU WEBHOOK DE SALVAR (Fluxo de baixo do n8n)
    const N8N_WEBHOOK_URL = 'https://n8n.labzratz.tech/webhook-test/salvar-movimentacao';

    try {
        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(req.body) // Repassa os dados do formulário exatamente como vieram
        });

        // Se o n8n não devolver JSON (ex: erro 500 do n8n), tratamos isso para não rebentar o frontend
        const contentType = n8nResponse.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const textError = await n8nResponse.text();
            console.error("Erro no n8n (não devolveu JSON):", textError);
            return res.status(n8nResponse.status).json({ success: false, message: 'O servidor n8n falhou ou não retornou o formato correto.' });
        }

        const data = await n8nResponse.json();
        
        // Repassa a resposta do n8n para o seu script.js
        return res.status(n8nResponse.status).json(data);

    } catch (error) {
        console.error("Erro de comunicação entre Vercel e n8n:", error);
        return res.status(500).json({ success: false, message: 'Falha de comunicação com o servidor n8n.' });
    }
}
