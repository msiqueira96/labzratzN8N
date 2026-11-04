export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const N8N_OCR_WEBHOOK = process.env.N8N_OCR_WEBHOOK_URL || "https://n8n.labzratz.tech/webhook-test/upload-document";

    try {
        const { instanceId, fileName, mimeType, fileBase64 } = req.body;

        if (!fileBase64) {
            return res.status(400).json({ error: 'Imagem não recebida pelo update.js' });
        }

        // Remove o prefixo data:image/...;base64, e reconstrói o binário para o n8n
        const base64Clean = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
        const buffer = Buffer.from(base64Clean, 'base64');

        const formData = new FormData();
        const blob = new Blob([buffer], { type: mimeType || 'image/jpeg' });
        formData.append('file', blob, fileName || 'documento.jpg');
        formData.append('data', blob, fileName || 'documento.jpg');
        formData.append('instanceId', instanceId || '');
        formData.append('fileName', fileName || '');

        const response = await fetch(N8N_OCR_WEBHOOK, {
            method: 'POST',
            body: formData
        });

        const text = await response.text();
        if (!response.ok) {
            return res.status(response.status).json({ error: `n8n OCR retornou status ${response.status}: ${text}` });
        }

        const data = text ? JSON.parse(text) : {};
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Erro interno no update.js ao comunicar com o n8n' });
    }
}
