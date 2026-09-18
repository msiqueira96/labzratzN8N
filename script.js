/**
 * MÓDULO DE CONFIGURAÇÃO E ESTADO GLOBAL
 */
const CONFIG = {
    URL_API: 'https://script.google.com/macros/s/AKfycbzwFx41WOsrBhI9ydCNFSytfhfu47aL1yt0MVXYUDl4dPol4bjuHv10tYXks_LHSoDT/exec?aba=Entradas',
    URL_N8N_UPLOAD: '/api/upload'
};

const STATE = {
    transacoes: [],
    charts: {
        yAxis: null,
        bars: null,
        donut: null,
        pie: null
    }
};

// Configuração padrão do Chart.js
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = "#64748b";

/**
 * MÓDULO DE FORMATADORES E NORMALIZAÇÃO DE DADOS
 */
const Formatters = {
    currency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    },

    dateToBR(dateStr) {
        return dateStr ? dateStr.split('-').reverse().join('/') : '';
    },

    normalizarTransacao(item, index) {
        const chaves = Object.keys(item);

        const rawData = item.data || item.Data || item.data_emissao || item['DATA'] || (chaves[1] ? item[chaves[1]] : '');
        const rawFornecedor = item.fornecedor || item.Fornecedor || item['cnpj(fornecedor)'] || item['cnpj_fornecedor'] || item.razao_social_emitente || (chaves[2] ? item[chaves[2]] : 'Desconhecido');
        const rawCategoria = item.categoria || item.Categoria || item.tipo_documento || item['CATEGORIA'] || 'Geral';
        const rawTipo = item.tipo || item.Tipo || item['TIPO'] || 'Saída';
        const rawValor = item.valor || item.Valor || item.valor_total_nota || item.valor_documento || item.valor_total || item['VALOR'] || (chaves[4] ? item[chaves[4]] : 0);

        // Tratamento de Data
        let dataFormatada = '';
        if (rawData) {
            const strData = String(rawData).trim().split(' ')[0];
            if (strData.includes('/')) {
                const partes = strData.split('/');
                if (partes.length === 3) {
                    dataFormatada = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
                }
            } else if (strData.includes('-')) {
                dataFormatada = strData.substring(0, 10);
            }
        }
        if (!dataFormatada || isNaN(new Date(dataFormatada).getTime())) {
            dataFormatada = new Date().toISOString().split('T')[0];
        }

        // Tratamento do Valor
        let valorNum = 0;
        if (typeof rawValor === 'number') {
            valorNum = rawValor;
        } else if (typeof rawValor === 'string') {
            const cleaned = rawValor.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.').trim();
            valorNum = parseFloat(cleaned) || 0;
        }

        // Identificação de Tipo
        const tipoLower = String(rawTipo).toLowerCase();
        const tipoFinal = (tipoLower.includes('entr') || tipoLower.includes('receit')) ? 'Entrada' : 'Saída';

        return {
            id: item.id || (index + 1),
            data: dataFormatada,
            fornecedor: String(rawFornecedor || 'Desconhecido'),
            categoria: String(rawCategoria || 'Geral'),
            tipo: tipoFinal,
            valor: Math.abs(valorNum)
        };
    }
};

/**
 * MÓDULO DE SERVIÇOS DE API (FETCH)
 */
const ApiService = {
    async fetchTransacoes() {
        const response = await fetch(CONFIG.URL_API);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
    },

    async uploadDanfe(file) {
        const formData = new FormData();
        formData.append('arquivo', file);

        const res = await fetch(CONFIG.URL_N8N_UPLOAD, { method: 'POST', body: formData });
        let data = {};
        try { data = await res.json(); } catch (e) { /* Resposta vazia ok */ }

        if (!res.ok || data.status === "erro") {
            throw new Error(data.mensagem || "Erro ao processar documento no n8n.");
        }
        return data;
    }
};

/**
 * MÓDULO DE GERENCIAMENTO DE INTERFACE (UI)
 */
const UI = {
    openModal(id) { document.getElementById(id)?.classList.add('active'); },
    closeModal(id) { document.getElementById(id)?.classList.remove('active'); },

    renderTable(dados) {
        const tbody = document.getElementById('tabelaCorpo');
        tbody.innerHTML = '';

        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-20">Nenhuma movimentação encontrada.</td></tr>';
            return;
        }

        dados.forEach(t => {
            const tr = document.createElement('tr');
            const isEntrada = t.tipo === 'Entrada';
            const valClass = isEntrada ? 'val-entrada' : 'val-saida';

            tr.innerHTML = `
                <td>${Formatters.dateToBR(t.data)}</td>
                <td><strong>${t.fornecedor}</strong></td>
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
        const entradas = dados.filter(t => t.tipo === 'Entrada');
        const saidas = dados.filter(t => t.tipo === 'Saída');

        const totalEntradas = entradas.reduce((a, b) => a + b.valor, 0);
        const totalSaidas = saidas.reduce((a, b) => a + b.valor, 0);
        const saldo = totalEntradas - totalSaidas;

        const maiorEntrada = entradas.length ? Math.max(...entradas.map(e => e.valor)) : 0;
        const maiorSaida = saidas.length ? Math.max(...saidas.map(s => s.valor)) : 0;

        document.getElementById('kpiSaldo').innerText = Formatters.currency(saldo);
        document.getElementById('kpiEntradas').innerText = Formatters.currency(totalEntradas);
        document.getElementById('kpiSaidas').innerText = Formatters.currency(totalSaidas);

        document.getElementById('kpiMaiorEntrada').innerText = Formatters.currency(maiorEntrada);
        document.getElementById('kpiMaiorSaida').innerText = Formatters.currency(maiorSaida);
        document.getElementById('kpiStatusSaldo').innerText = saldo >= 0 ? "Positivo" : "Atenção (Negativo)";
    },

    populateSelectFilters() {
        const fornecedores = [...new Set(STATE.transacoes.map(t => t.fornecedor))].sort();
        const categorias = [...new Set(STATE.transacoes.map(t => t.categoria))].sort();

        const selectForn = document.getElementById('headerFiltroFornecedor');
        const selectCat = document.getElementById('headerFiltroCategoria');

        const valFornAtual = selectForn.value;
        const valCatAtual = selectCat.value;

        selectForn.innerHTML = '<option value="Tudo">▼ Todos</option>' +
            fornecedores.map(f => `<option value="${f}">${f}</option>`).join('');

        selectCat.innerHTML = '<option value="Tudo">▼ Todas</option>' +
            categorias.map(c => `<option value="${c}">${c}</option>`).join('');

        if (fornecedores.includes(valFornAtual)) selectForn.value = valFornAtual;
        if (categorias.includes(valCatAtual)) selectCat.value = valCatAtual;
    }
};

/**
 * MÓDULO DE RENDERIZAÇÃO DE GRÁFICOS
 */
const ChartManager = {
    destroyChart(key) {
        if (STATE.charts[key]) {
            STATE.charts[key].destroy();
            STATE.charts[key] = null;
        }
    },

    renderAll(dados) {
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

        // Ajuste dinâmico de largura
        const innerContainer = document.getElementById('barsInnerContainer');
        if (innerContainer) {
            innerContainer.style.width = `${Math.max(900, datas.length * 110)}px`;
        }

        // Render Y-Axis
        this.destroyChart('yAxis');
        const ctxY = document.getElementById('chartYAxisCanvas').getContext('2d');
        STATE.charts.yAxis = new Chart(ctxY, {
            type: 'bar',
            data: { labels: [''], datasets: [{ data: [0] }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 12, bottom: 28, left: 5, right: 0 } },
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { display: false },
                    y: {
                        min: 0,
                        max: tetoEscala,
                        ticks: { stepSize: 500, font: { size: 11, weight: '600' }, color: '#64748b' },
                        grid: { drawBorder: false, color: '#f1f5f9' }
                    }
                }
            }
        });

        // Render Bars
        this.destroyChart('bars');
        const ctxBars = document.getElementById('chartBarsCanvas').getContext('2d');
        STATE.charts.bars = new Chart(ctxBars, {
            type: 'bar',
            data: {
                labels: labelsDatas,
                datasets: [
                    { label: 'Entradas', data: arrEntradas, backgroundColor: '#10b981', borderRadius: 4, barPercentage: 0.6 },
                    { label: 'Saídas', data: arrSaidas, backgroundColor: '#f43f5e', borderRadius: 4, barPercentage: 0.6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 12, bottom: 10, left: 10, right: 15 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${Formatters.currency(ctx.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#64748b' } },
                    y: { min: 0, max: tetoEscala, ticks: { stepSize: 500, display: false }, grid: { color: '#f1f5f9', drawBorder: false } }
                }
            }
        });
    },

    renderCategoryDonut(dados) {
        const despesas = dados.filter(t => t.tipo === 'Saída');
        const catMap = {};
        despesas.forEach(d => catMap[d.categoria] = (catMap[d.categoria] || 0) + d.valor);

        this.destroyChart('donut');
        const ctxDonut = document.getElementById('chartCategoriasDonut').getContext('2d');
        STATE.charts.donut = new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: Object.keys(catMap).length ? Object.keys(catMap) : ['Sem despesas'],
                datasets: [{
                    data: Object.values(catMap).length ? Object.values(catMap) : [1],
                    backgroundColor: ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
    },

    renderProportionPie(dados) {
        const totE = dados.filter(t => t.tipo === 'Entrada').reduce((a, b) => a + b.valor, 0);
        const totS = dados.filter(t => t.tipo === 'Saída').reduce((a, b) => a + b.valor, 0);

        this.destroyChart('pie');
        const ctxPie = document.getElementById('chartProporcaoPie').getContext('2d');
        STATE.charts.pie = new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: ['Entradas', 'Saídas'],
                datasets: [{ data: [totE, totS], backgroundColor: ['#10b981', '#f43f5e'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
    }
};

/**
 * REGRAS DE NEGÓCIO E FILTRAGEM
 */
function aplicarFiltros() {
    const dtInicio = document.getElementById('filtroInicio').value;
    const dtFim = document.getElementById('filtroFim').value;
    const tipoBarra = document.getElementById('filtroTipo').value;

    const filtroFornHeader = document.getElementById('headerFiltroFornecedor').value;
    const filtroCatHeader = document.getElementById('headerFiltroCategoria').value;
    const filtroTipoHeader = document.getElementById('headerFiltroTipo').value;

    const filtradas = STATE.transacoes.filter(t => {
        const passaTipoBarra = tipoBarra === 'Tudo' || t.tipo === tipoBarra;
        const passaTipoHeader = filtroTipoHeader === 'Tudo' || t.tipo === filtroTipoHeader;
        const passaFornecedor = filtroFornHeader === 'Tudo' || t.fornecedor === filtroFornHeader;
        const passaCategoria = filtroCatHeader === 'Tudo' || t.categoria === filtroCatHeader;

        const dataT = new Date(t.data);
        const dI = dtInicio ? new Date(dtInicio) : null;
        const dF = dtFim ? new Date(dtFim) : null;

        let passaData = true;
        if (dI && dF) passaData = dataT >= dI && dataT <= dF;
        else if (dI) passaData = dataT >= dI;
        else if (dF) passaData = dataT <= dF;

        return passaTipoBarra && passaTipoHeader && passaFornecedor && passaCategoria && passaData;
    });

    UI.updateKPIs(filtradas);
    ChartManager.renderAll(filtradas);
    UI.renderTable(filtradas);
}

function resetarFiltros() {
    document.getElementById('filtroInicio').value = '';
    document.getElementById('filtroFim').value = '';
    document.getElementById('filtroTipo').value = 'Tudo';
    document.getElementById('headerFiltroFornecedor').value = 'Tudo';
    document.getElementById('headerFiltroCategoria').value = 'Tudo';
    document.getElementById('headerFiltroTipo').value = 'Tudo';

    aplicarFiltros();
}

async function carregarDados() {
    const tbody = document.getElementById('tabelaCorpo');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-20">Carregando dados da planilha...</td></tr>';

    try {
        const dadosBrutos = await ApiService.fetchTransacoes();
        if (!Array.isArray(dadosBrutos) || dadosBrutos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-20">Nenhum registro encontrado.</td></tr>';
            STATE.transacoes = [];
        } else {
            STATE.transacoes = dadosBrutos.map((item, index) => Formatters.normalizarTransacao(item, index));
        }

        UI.populateSelectFilters();
        aplicarFiltros();

    } catch (err) {
        console.error("Erro ao carregar dados:", err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--red); padding: 20px;">Erro ao carregar dados: ${err.message}</td></tr>`;
    }
}

/**
 * EVENT LISTENERS (INICIALIZAÇÃO)
 */
document.addEventListener('DOMContentLoaded', () => {
    // Carregamento Inicial
    carregarDados();

    // Eventos de Filtros
    ['filtroInicio', 'filtroFim', 'filtroTipo', 'headerFiltroFornecedor', 'headerFiltroCategoria', 'headerFiltroTipo']
        .forEach(id => document.getElementById(id)?.addEventListener('change', aplicarFiltros));

    document.getElementById('btnResetarFiltros')?.addEventListener('click', resetarFiltros);
    document.getElementById('btnReloadTable')?.addEventListener('click', carregarDados);

    // Navegação Sidebar
    document.querySelectorAll('.nav-menu a[data-tab]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            e.currentTarget.parentElement.classList.add('active');
        });
    });

    // Modais - Abertura / Fechamento
    document.getElementById('btnOpenMovimentacao')?.addEventListener('click', () => UI.openModal('modalMovimentacao'));
    document.getElementById('btnOpenDanfe')?.addEventListener('click', () => UI.openModal('modalDanfe'));

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => UI.closeModal(btn.getAttribute('data-close')));
    });

    // Upload Container Event
    const uploadContainer = document.getElementById('fileUploadContainer');
    const fileInput = document.getElementById('arquivoDanfe');

    uploadContainer?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
        const fileName = e.target.files.length ? e.target.files[0].name : '';
        document.getElementById('nomeArquivo').innerText = fileName;
    });

    // Submit Formulário Movimentação
    document.getElementById('formMovimentacao')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
            tipo: document.getElementById('formTipo').value,
            data: document.getElementById('formData').value,
            fornecedor: document.getElementById('formFornecedor').value,
            categoria: document.getElementById('formCategoria').value,
            valor: parseFloat(document.getElementById('formValor').value)
        };

        STATE.transacoes.push(payload);
        UI.populateSelectFilters();
        aplicarFiltros();

        e.target.reset();
        UI.closeModal('modalMovimentacao');
    });

    // Submit DANFE
    document.getElementById('formDanfe')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!fileInput.files.length) {
            alert("Por favor, selecione um arquivo PDF ou Imagem.");
            return;
        }

        const btn = document.getElementById('btnEnviarDanfe');
        const origText = btn.innerText;
        btn.innerText = 'Processando com IA...';
        btn.disabled = true;

        try {
            const result = await ApiService.uploadDanfe(fileInput.files[0]);
            alert(result.mensagem || 'Documento processado com sucesso!');
            carregarDados();

            e.target.reset();
            document.getElementById('nomeArquivo').innerText = '';
            UI.closeModal('modalDanfe');
        } catch (err) {
            alert(err.message);
        } finally {
            btn.innerText = origText;
            btn.disabled = false;
        }
    });
});
