export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido. Use POST.' });
    }

    // 🔴 1. TENS A CERTEZA QUE COLOCASTE A URL REAL AQUI? (Ex: https://n8n.labzratz.tech/webhook/...)
    const N8N_WEBHOOK_URL = 'https://n8n.labzratz.tech/webhook/upload-document'; 

    try {
        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'content-type': req.headers['content-type'],
            },
            body: req,
            duplex: 'half'
        });

        if (!n8nResponse.ok) {
            const textError = await n8nResponse.text();
            return res.status(n8nResponse.status).json({ success: false, message: `O n8n recusou: ${textError}` });
        }

        const data = await n8nResponse.json();
        return res.status(200).json(data);

    } catch (error) {
        // 🔴 2. AQUI ESTÁ A MAGIA: Vamos mandar o erro real para a aba "Network/Rede" do teu navegador
        console.error("Erro interno:", error);
        return res.status(500).json({ 
            success: false, 
            message: 'Erro no Vercel', 
            erroReal: error.message // Isto vai mostrar se foi erro de URL, de Fetch, etc.
        });
    }
}
