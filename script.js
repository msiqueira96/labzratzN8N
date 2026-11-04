/* global Chart */

/**
 * CONFIGURAÇÃO E ESTADO GLOBAL
 */
const CONFIG = {
    URL_ENTRADAS: 'https://script.google.com/macros/s/AKfycbwAhUmf0hZoMWHnyYTiMsO1cTdkfAHw0yKujYsjGnnIMwqiFAgxn3HLrGXJHqhRDluy/exec',
    URL_SAIDAS: 'https://script.google.com/macros/s/AKfycbzwFx41WOsrBhI9ydCNFSytfhfu47aL1yt0MVXYUDl4dPol4bjuHv10tYXks_LHSoDT/exec?aba=Saidas',
    URL_N8N_UPLOAD: '/api/upload',
    URL_SALVAR: '/api/salvar' 
};

const STATE = {
    transacoes: [],
    charts: { bars: null, donut: null, pie: null }
};

/**
 * TRATAMENTO E MAPEAMENTO DOS DADOS DA PLANILHA
 */
const Formatters = {
    currency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    },

    dateToBR(dateStr) {
        if (!dateStr) return '';
        const partes = dateStr.split('-');
        return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dateStr;
    },

    normalizarTransacao(item, index) {
        const isEntrada = item.abaOrigem === 'Entrada';

        const rawData = String(item.data || '').trim();
        let dataFormatada = '';
        if (rawData) {
            if (rawData.includes('/')) {
                const p = rawData.split(' ')[0].split('/');
                if (p.length === 3) dataFormatada = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
            } else if (rawData.includes('-')) {
                dataFormatada = rawData.substring(0, 10);
            }
        }

        const rawValor = item.valor;
        let valorNum = 0;
        if (typeof rawValor === 'number') {
            valorNum = rawValor;
        } else if (typeof rawValor === 'string') {
            const cleaned = rawValor.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.').trim();
            valorNum = parseFloat(cleaned) || 0;
        }

        const nomePrincipal = isEntrada ? String(item.fonte || 'Fonte não informada') : String(item.fornecedor || 'Fornecedor não informado');
        const detalhesExtras = isEntrada ? String(item['descrição'] || item.descricao || '') : String(item.Operador || item.operador || '');
        
        let textoExibicao = nomePrincipal;
        if (detalhesExtras && detalhesExtras.trim() !== '') {
            textoExibicao += ` - ${detalhesExtras}`; 
        }

        const categoriaFinal = String(item.categoria || 'Geral');

        return {
            id: String(item.id || index), 
            data: dataFormatada,
            fornecedor: textoExibicao,
            cnpj: String(item.cnpj || ''),
            operador: detalhesExtras,
            formaPagamento: String(item['forma de pagamento'] || ''),
            categoria: categoriaFinal,
            tipo: isEntrada ? 'Entrada' : 'Saída',
            valor: Math.abs(valorNum)
        };
    }
};

/**
 * CONEXÃO COM AS APIS
 */
const ApiService = {
    async fetchTodasTransacoes() {
        const [resEntradas, resSaidas] = await Promise.all([
            fetch(CONFIG.URL_ENTRADAS).then(r => r.json()).catch(() => []),
            fetch(CONFIG.URL_SAIDAS).then(r => r.json()).catch(() => [])
        ]);

        const entradas = (Array.isArray(resEntradas) ? resEntradas : []).map(item => ({ ...item, abaOrigem: 'Entrada' }));
        const saidas = (Array.isArray(resSaidas) ? resSaidas : []).map(item => ({ ...item, abaOrigem: 'Saidas' }));

        return [...entradas, ...saidas];
    },

    async uploadDanfe(file) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(CONFIG.URL_N8N_UPLOAD, { method: 'POST', body: formData });
        let data = {};
        try { 
            data = await res.json(); 
        } catch (e) {
            throw new Error("O servidor n8n não retornou um JSON válido.");
        }

        if (!res.ok || data.status === "erro" || data.success === false) {
            throw new Error(data.message || data.mensagem || data.error || "Erro no processamento do documento.");
        }
        return data;
    }
};

/**
 * GESTÃO DE UI E MODAIS
 */
const UI = {
    openModal(id) {
        let modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('active');
            atualizarCamposFormulario();
        }
    },

    closeModal(id) {
        let modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('active');
        }
    },

    renderTable(dados) {
        const tbody = document.getElementById('tabelaCorpo');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-20">Nenhuma movimentação encontrada.</td></tr>';
            return;
        }

        dados.forEach(t => {
            const tr = document.createElement('tr');
            const isEntrada = t.tipo.toLowerCase().includes('entrada');
            const valClass = isEntrada ? 'val-entrada' : 'val-saida';

            tr.innerHTML = `
                <td>${Formatters.dateToBR(t.data)}</td>
                <td title="ID: ${t.id}">
                    <strong>${t.fornecedor}</strong>
                    <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
                        ${t.cnpj ? `<span>CNPJ: \${t.cnpj}</span>` : ''}
                        ${t.formaPagamento ? ` • <span>Pgto: ${t.formaPagamento}</span>` : ''} ${t.operador ? ` • <span>Op: ${t.operador}</span>` : ''}
                    </div>
                </td>
                <td><span class="badge-cat">${t.categoria}</span></td>
                <td class="${valClass}">${t.tipo}</td>
                <td class="text-right ${valClass}">
                    ${isEntrada ? '+' : '-'} ${Formatters.currency(t.valor)}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    updateKPIs(dados) {
        const entradas = dados.filter(t => t.tipo.toLowerCase().includes('entrada'));
        const saidas = dados.filter(t => !t.tipo.toLowerCase().includes('entrada'));

        const totalEntradas = entradas.reduce((a, b) => a + b.valor, 0);
        const totalSaidas = saidas.reduce((a, b) => a + b.valor, 0);
        const saldo = totalEntradas - totalSaidas;

        const maiorEntrada = entradas.length ? Math.max(...entradas.map(t => t.valor)) : 0;
        const maiorSaida = saidas.length ? Math.max(...saidas.map(t => t.valor)) : 0;

        const setTxt = (id, txt) => {
            const el = document.getElementById(id);
            if (el) el.innerText = txt;
        };

        setTxt('kpiSaldo', Formatters.currency(saldo));
        setTxt('kpiEntradas', Formatters.currency(totalEntradas));
        setTxt('kpiSaidas', Formatters.currency(totalSaidas));
        setTxt('kpiMaiorEntrada', Formatters.currency(maiorEntrada));
        set
