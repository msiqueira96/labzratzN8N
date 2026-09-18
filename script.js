/* global Chart */

/**
 * CONFIGURAÇÃO E ESTADO GLOBAL
 */
const CONFIG = {
    URL_ENTRADAS: 'https://script.google.com/macros/s/AKfycbzwFx41WOsrBhI9ydCNFSytfhfu47aL1yt0MVXYUDl4dPol4bjuHv10tYXks_LHSoDT/exec?aba=Entradas',
    URL_SAIDAS: 'https://script.google.com/macros/s/AKfycbzwFx41WOsrBhI9ydCNFSytfhfu47aL1yt0MVXYUDl4dPol4bjuHv10tYXks_LHSoDT/exec?aba=Saidas',
    URL_N8N_UPLOAD: '/api/upload'
};

const STATE = {
    transacoes: [],
    charts: { yAxis: null, bars: null, donut: null, pie: null }
};

/**
 * TRATAMENTO E MAPEAMENTO DOS 7 CAMPOS DA PLANILHA
 * (id, data, fornecedor, cnpj, Operador, forma de pagamento, valor)
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

    normalizarTransacao(item, index, tipoOrigem = 'Saída') {
        // 1. Data (Vencimento)
        const rawData = String(item.data || '').trim();
        let dataFormatada = new Date().toISOString().split('T')[0];
        if (rawData) {
            if (rawData.includes('/')) {
                const p = rawData.split(' ')[0].split('/');
                if (p.length === 3) dataFormatada = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
            } else if (rawData.includes('-')) {
                dataFormatada = rawData.substring(0, 10);
            }
        }

        // 2. Valor Pago
        const rawValor = item.valor;
        let valorNum = 0;
        if (typeof rawValor === 'number') {
            valorNum = rawValor;
        } else if (typeof rawValor === 'string') {
            const cleaned = rawValor.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.').trim();
            valorNum = parseFloat(cleaned) || 0;
        }

        return {
            id: String(item.id || index + 1),                         // Chave de 44 dígitos / ID único
            data: dataFormatada,                                       // Data de vencimento
            fornecedor: String(item.fornecedor || 'Não Informado'),    // Nome do fornecedor
            cnpj: String(item.cnpj || ''),                             // CNPJ da empresa
            operador: String(item.Operador || item.operador || ''),    // Responsável do registo (n8n)
            formaPagamento: String(item['forma de pagamento'] || ''),  // Crédito, débito, boleto, dinheiro
            tipo: item.tipoForcado || tipoOrigem,                      // Entrada ou Saída
            valor: Math.abs(valorNum)                                  // Valor numérico
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

        const entradas = (Array.isArray(resEntradas) ? resEntradas : []).map(item => ({ ...item, tipoForcado: 'Entrada' }));
        const saidas = (Array.isArray(resSaidas) ? resSaidas : []).map(item => ({ ...item, tipoForcado: 'Saída' }));

        return [...entradas, ...saidas];
    },

    async uploadDanfe(file) {
        const formData = new FormData();
        formData.append('arquivo', file);

        const res = await fetch(CONFIG.URL_N8N_UPLOAD, { method: 'POST', body: formData });
        let data = {};
        try { data = await res.json(); } catch (e) { /* Tratamento silencioso caso resposta seja vazia */ }

        if (!res.ok || data.status === "erro") {
            throw new Error(data.mensagem || "Erro ao processar documento no n8n.");
        }
        return data;
    }
};

/**
 * INTERFACE E EXIBIÇÃO DA TABELA (FOCO: DATA, FORNECEDOR E VALOR)
 */
const UI = {
    openModal(id) { document.getElementById(id)?.classList.add('active'); },
    closeModal(id) { document.getElementById(id)?.classList.remove('active'); },

    renderTable(dados) {
        const tbody = document.getElementById('tabelaCorpo');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center p-20">Nenhuma movimentação encontrada.</td></tr>';
            return;
        }

        dados.forEach(t => {
            const tr = document.createElement('tr');
            const isEntrada = t.tipo === 'Entrada';
            const valClass = isEntrada ? 'val-entrada' : 'val-saida';

            // Apresentação focada: Data | Fornecedor / Descrição | Valor
            // Outros dados (ID, CNPJ, Forma de Pgto, Operador) ficam interligados no objeto t e visíveis abaixo do nome
            tr.innerHTML = `
                <td>${Formatters.dateToBR(t.data)}</td>
                <td title="Chave ID: ${t.id}">
                    <strong>${t.fornecedor}</strong>
                    <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
                        ${t.cnpj ? `<span>CNPJ: ${t.cnpj}</span>` : ''}
                        ${t.formaPagamento ? ` • <span>Pgto: ${t.formaPagamento}</span>` : ''}
                        ${t.operador ? ` • <span>Op: ${t.operador}</span>` : ''}
                    </div>
                </td>
                <td class="text-right ${valClass}">
                    ${isEntrada ? '+' : '-'} ${Formatters.currency(t.valor)}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    updateKPIs(dados) {
        const entradas = dados.filter(t => t.tipo === 'Entrada');
        const saidas = dados.filter(t => t.tipo === 'Saída');

        const totalEntradas = entradas.reduce((a, b) => a + b.valor, 0);
        const totalSaidas = saidas.reduce((a, b) => a + b.valor, 0);
        const saldo = totalEntradas - totalSaidas;

        const setTxt = (id, txt) => {
            const el = document.getElementById(id);
            if (el) el.innerText = txt;
        };

        setTxt('kpiSaldo', Formatters.currency(saldo));
        setTxt('kpiEntradas', Formatters.currency(totalEntradas));
        setTxt('kpiSaidas', Formatters.currency(totalSaidas));
        setTxt('kpiStatusSaldo', saldo >= 0 ? "Positivo" : "Atenção (Negativo)");
    },

    populateSelectFilters() {
        const fornecedores = [...new Set(STATE.transacoes.map(t => t.fornecedor))].sort();
        const selectForn = document.getElementById('headerFiltroFornecedor');
        if (!selectForn) return;

        const valAtual = selectForn.value;
        selectForn.innerHTML = '<option value="Tudo">▼ Todos</option>' +
            fornecedores.map(f => `<option value="${f}">${f}</option>`).join('');

        if (fornecedores.includes(valAtual)) selectForn.value = valAtual;
    }
};

/**
 * GRÁFICOS DO DASHBOARD
 */
const ChartManager = {
    destroyChart(key) {
        if (STATE.charts[key]) {
            STATE.charts[key].destroy();
            STATE.charts[key] = null;
        }
    },

    renderAll(dados) {
        if (typeof Chart === 'undefined') return;
        this.renderBarsAndYAxis(dados);
        this.renderCategoryDonut(dados);
        this.renderProportionPie(dados);
    },

    renderBarsAndYAxis(dados) {
        const datasMap = {};
        dados.forEach(d => {
            if (!datasMap[d.data]) datasMap[d.data] = { e: 0, s: 0 };
            if (d.tipo === 'Entrada') datasMap[d.data].e += d.valor;
            if (d.tipo === 'Saída') datasMap[d.data].s += d.valor;
        });

        const datas = Object.keys(datasMap).sort();
        const arrEntradas = datas.map(d => datasMap[d].e);
        const arrSaidas = datas.map(d => datasMap[d].s);
        const labelsDatas = datas.map(d => Formatters.dateToBR(d));

        const valorMaximo = Math.max(...arrEntradas, ...arrSaidas, 1000);
        const tetoEscala = Math.ceil((valorMaximo * 1.1) / 500) * 500;

        this.destroyChart('bars');
        const canvasBars = document.getElementById('chartBarsCanvas');
        if (canvasBars) {
            STATE.charts.bars = new Chart(canvasBars.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labelsDatas,
                    datasets: [
                        { label: 'Entradas', data: arrEntradas, backgroundColor: '#10b981', borderRadius: 4 },
                        { label: 'Saídas', data: arrSaidas, backgroundColor: '#f43f5e', borderRadius: 4 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { min: 0, max: tetoEscala } }
                }
            });
        }
    },

    renderCategoryDonut(dados) {
        const despesas = dados.filter(t => t.tipo === 'Saída');
        const fornMap = {};
        despesas.forEach(d => fornMap[d.fornecedor] = (fornMap[d.fornecedor] || 0) + d.valor);

        this.destroyChart('donut');
        const canvas = document.getElementById('chartCategoriasDonut');
        if (!canvas) return;

        STATE.charts.donut = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(fornMap).length ? Object.keys(fornMap) : ['Sem dados'],
                datasets: [{
                    data: Object.values(fornMap).length ? Object.values(fornMap) : [1],
                    backgroundColor: ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    renderProportionPie(dados) {
        const totE = dados.filter(t => t.tipo === 'Entrada').reduce((a, b) => a + b.valor, 0);
        const totS = dados.filter(t => t.tipo === 'Saída').reduce((a, b) => a + b.valor, 0);

        this.destroyChart('pie');
        const canvas = document.getElementById('chartProporcaoPie');
        if (!canvas) return;

        STATE.charts.pie = new Chart(canvas.getContext('2d'), {
            type: 'pie',
            data: {
                labels: ['Entradas', 'Saídas'],
                datasets: [{ data: [totE, totS], backgroundColor: ['#10b981', '#f43f5e'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
};

/**
 * REGRAS DE FILTRO E CARREGAMENTO
 */
function aplicarFiltros() {
    const dtInicio = document.getElementById('filtroInicio')?.value;
    const dtFim = document.getElementById('filtroFim')?.value;
    const filtroFornHeader = document.getElementById('headerFiltroFornecedor')?.value || 'Tudo';
    const filtroTipoHeader = document.getElementById('headerFiltroTipo')?.value || 'Tudo';

    const filtradas = STATE.transacoes.filter(t => {
        const passaTipo = filtroTipoHeader === 'Tudo' || t.tipo === filtroTipoHeader;
        const passaFornecedor = filtroFornHeader === 'Tudo' || t.fornecedor === filtroFornHeader;

        const dataT = new Date(t.data);
        const dI = dtInicio ? new Date(dtInicio) : null;
        const dF = dtFim ? new Date(dtFim) : null;

        let passaData = true;
        if (dI && dF) passaData = dataT >= dI && dataT <= dF;
        else if (dI) passaData = dataT >= dI;
        else if (dF) passaData = dataT <= dF;

        return passaTipo && passaFornecedor && passaData;
    });

    UI.updateKPIs(filtradas);
    ChartManager.renderAll(filtradas);
    UI.renderTable(filtradas);
}

async function carregarDados() {
    const tbody = document.getElementById('tabelaCorpo');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-center p-20">A carregar dados...</td></tr>';

    try {
        const dadosBrutos = await ApiService.fetchTodasTransacoes();
        STATE.transacoes = dadosBrutos
            .map((item, index) => Formatters.normalizarTransacao(item, index))
            .sort((a, b) => new Date(b.data) - new Date(a.data));

        UI.populateSelectFilters();
        aplicarFiltros();
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center p-20" style="color: red;">Erro ao carregar: ${err.message}</td></tr>`;
    }
}

/**
 * INICIALIZAÇÃO
 */
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = "#64748b";
    }

    carregarDados();

    ['filtroInicio', 'filtroFim', 'headerFiltroFornecedor', 'headerFiltroTipo']
        .forEach(id => document.getElementById(id)?.addEventListener('change', aplicarFiltros));

    document.getElementById('btnReloadTable')?.addEventListener('click', carregarDados);
    document.getElementById('btnOpenMovimentacao')?.addEventListener('click', () => UI.openModal('modalMovimentacao'));
    document.getElementById('btnOpenDanfe')?.addEventListener('click', () => UI.openModal('modalDanfe'));

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => UI.closeModal(btn.getAttribute('data-close')));
    });
});
