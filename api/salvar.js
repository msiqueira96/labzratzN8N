export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const N8N_SAVE_WEBHOOK = process.env.N8N_SAVE_WEBHOOK_URL || "https://n8n.labzratz.tech/webhook-test/salvar-movimentacao";

    try {
        const response = await fetch(N8N_SAVE_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const text = await response.text();
        if (!response.ok) {
            return res.status(response.status).json({ error: `n8n Salvar retornou status ${response.status}: ${text}` });
        }

        const data = text ? JSON.parse(text) : { success: true };
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Erro interno no salvar.js ao comunicar com o n8n' });
    }
}
