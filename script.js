// Configurações Globais de Rotas Serverless
const CONFIG = {
    URL_SALVAR_TRANSACAO: '/api/salvar-transacao',
    URL_N8N_UPLOAD: '/api/upload'
};

// Inicialização dos Eventos após o carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
    const inputComprovante = document.getElementById('inputComprovante');
    if (inputComprovante) {
        inputComprovante.addEventListener('change', processarUploadComprovante);
    }
});

// Função para processar e enviar o documento para o n8n via API serverless
async function processarUploadComprovante(event) {
    const file = event.target.files[0];
    if (!file) return;

    const inputComprovante = document.getElementById('inputComprovante');
    atualizarStatusUpload(true, '⏳ Lendo documento com IA...');

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(CONFIG.URL_N8N_UPLOAD, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Erro na resposta do servidor: ${response.status}`);
        }

        const resposta = await response.json();

        if (resposta.success && resposta.data) {
            preencherFormularioComprovante(resposta.data);
            atualizarStatusUpload(false, '✅ Dados preenchidos automaticamente!');
        } else {
            throw new Error(resposta.message || 'Falha ao extrair dados do documento');
        }

    } catch (error) {
        console.error('Erro ao ler comprovante:', error);
        atualizarStatusUpload(false, '❌ Erro ao ler imagem: ' + error.message);
    } finally {
        inputComprovante.value = ''; // Limpa o input para permitir re-envio do mesmo arquivo
    }
}

// Função para injetar os dados retornados pelo n8n nos campos do HTML
function preencherFormularioComprovante(dados) {
    // Novo Campo: Tipo de Documento
    if (dados.tipo) {
        const selectTipoDoc = document.getElementById('tipoDocumento');
        if (selectTipoDoc) {
            const valorUpper = String(dados.tipo).toUpperCase();
            // Verifica se o valor retornado existe nas opções do select
            const opcaoExiste = Array.from(selectTipoDoc.options).some(opt => opt.value === valorUpper);
            selectTipoDoc.value = opcaoExiste ? valorUpper : 'OUTROS';
        }
    }

    // ID / Chave / Número do Pedido
    if (dados.id) {
        document.getElementById('idPedido').value = dados.id;
    }

    // Data
    if (dados.data) {
        document.getElementById('dataMovimentacao').value = dados.data;
    }

    // Fornecedor / Beneficiário
    if (dados.fornecedor) {
        document.getElementById('fornecedor').value = dados.fornecedor;
    }

    // CNPJ
    if (dados.cnpj) {
        document.getElementById('cnpj').value = dados.cnpj;
    }

    // Valor
    if (dados.valor !== undefined && dados.valor !== null) {
        document.getElementById('valorMovimentacao').value = dados.valor;
    }
}

// Função auxiliar para atualização do feedback visual
function atualizarStatusUpload(carregando, mensagem) {
    const statusText = document.getElementById('statusUploadText');
    const inputComprovante = document.getElementById('inputComprovante');

    if (statusText) {
        statusText.textContent = mensagem;
        statusText.style.color = mensagem.includes('❌') ? '#dc3545' : (mensagem.includes('✅') ? '#28a745' : '#007bff');
    }

    if (inputComprovante) {
        inputComprovante.disabled = carregando;
    }
}

// Função de envio manual do formulário
async function salvarMovimentacao(event) {
    event.preventDefault();

    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.disabled = true;
    btnSalvar.textContent = 'Salvando...';

    const payload = {
        tipoTransacao: document.getElementById('tipoTransacao').value,
        tipoDocumento: document.getElementById('tipoDocumento').value,
        idPedido: document.getElementById('idPedido').value,
        data: document.getElementById('dataMovimentacao').value,
        fornecedor: document.getElementById('fornecedor').value,
        cnpj: document.getElementById('cnpj').value,
        operador: document.getElementById('operador').value,
        formaPagamento: document.getElementById('formaPagamento').value,
        valor: parseFloat(document.getElementById('valorMovimentacao').value) || 0
    };

    try {
        const response = await fetch(CONFIG.URL_SALVAR_TRANSACAO, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Erro ao salvar: ${response.status}`);
        }

        alert('Movimentação salva com sucesso!');
        fecharModal();

    } catch (error) {
        console.error('Erro ao salvar movimentação:', error);
        alert('Erro ao salvar movimentação: ' + error.message);
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar Movimentação';
    }
}

// Funções auxiliares do modal
function fecharModal() {
    const modal = document.getElementById('modalNovaMovimentacao');
    if (modal) {
        modal.style.display = 'none';
    }
    const form = document.getElementById('formMovimentacao');
    if (form) {
        form.reset();
    }
    atualizarStatusUpload(false, '');
}
