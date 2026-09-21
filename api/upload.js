import https from 'https';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'erro', mensagem: 'Método não permitido' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const n8nUrl = new URL('https://webhook.labzratz.tech/webhook/upload-document');

    const options = {
      hostname: n8nUrl.hostname,
      port: 443,
      path: n8nUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'],
        'Content-Length': buffer.length
      },
      rejectUnauthorized: false // Ignora o erro de certificado SSL autoassinado/inseguro
    };

    const n8nReq = https.request(options, (n8nRes) => {
      let data = '';
      n8nRes.on('data', chunk => data += chunk);
      n8nRes.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        res.status(n8nRes.statusCode).send(data);
      });
    });

    n8nReq.on('error', (error) => {
      res.status(500).json({ status: 'erro', mensagem: 'Erro no proxy: ' + error.message });
    });

    n8nReq.write(buffer);
    n8nReq.end();

  } catch (error) {
    res.status(500).json({ status: 'erro', mensagem: 'Erro interno: ' + error.message });
  }
}
