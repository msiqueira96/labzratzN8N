export const config = {
  api: {
    bodyParser: false, // Desativa o parser padrão para permitir o envio de arquivos binários (multipart/form-data)
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'erro', mensagem: 'Método não permitido' });
  }

  try {
    // Coleta os chunks do arquivo enviado pelo navegador
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // URL de produção do seu webhook no n8n
    const n8nUrl = 'https://webhook.labzratz.tech/webhook-test/f24a3071-8062-4589-a3bc-7ddbd95e63da';

    // Repassa a requisição para o n8n mantendo o Content-Type original (com o boundary do arquivo)
    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'],
      },
      body: buffer,
    });

    const responseText = await response.text();

    // Retorna a resposta do n8n de volta para o front-end
    res.setHeader('Content-Type', 'application/json');
    return res.status(response.status).send(responseText);
    
  } catch (error) {
    return res.status(500).json({ status: 'erro', mensagem: 'Erro interno no proxy da Vercel: ' + error.message });
  }
}
