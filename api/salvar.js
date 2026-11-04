export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido. Use POST.' });
    }

    const N8N_WEBHOOK_URL = 'https://n8n.labzratz.tech/webhook/salvar-movimentacao';

    try {
        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        const contentType = n8nResponse.headers.get('content-type') || '';
        
        // Se o n8n devolver texto plano (ex: erro de stop do workflow ou página de erro)
        if (!contentType.includes('application/json')) {
            const textError = await n8nResponse.text();
            
            // Se o fluxo parou por duplicidade ou regra de negócio, tratamos a mensagem
            return res.status(400).json({ 
                success: false, 
                message: 'Atenção: Este documento já consta nos registos ou já foi processado anteriormente.' 
            });
        }

        const data = await n8nResponse.json();
        return res.status(n8nResponse.status).json(data);

    } catch (error) {
        console.error("Erro de comunicação entre Vercel e n8n:", error);
        return res.status(500).json({ 
            success: false, 
            message: 'Falha de comunicação com o servidor. por favor, comunique o suporte.' 
        });
    }
}
