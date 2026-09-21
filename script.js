/* global Chart */

/**
 * CONFIGURAÇÃO E ESTADO GLOBAL
 */
const CONFIG = {
    URL_ENTRADAS: 'https://script.google.com/macros/s/AKfycbwAhUmf0hZoMWHnyYTiMsO1cTdkfAHw0yKujYsjGnnIMwqiFAgxn3HLrGXJHqhRDluy/exec',
    URL_SAIDAS: 'https://script.google.com/macros/s/AKfycbzwFx41WOsrBhI9ydCNFSytfhfu47aL1yt0MVXYUDl4dPol4bjuHv10tYXks_LHSoDT/exec?aba=Saidas',
    URL_N8N_UPLOAD: '/api/upload'
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
        formData.append('arquivo', file);

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
        } else {
            console.error(`[Erro UI] Nenhum modal foi encontrado com o ID "${id}".`);
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
                        ${t.cnpj ? `<span>CNPJ: ${t.cnpj}</span>` : ''}
                        ${t.formaPagamento ? ` • <span>Pgto: ${t.formaPagamento}</span>` : ''}
                        ${t.operador ? ` • <span>Op: ${t.operador}</span>` : ''}
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
        setTxt('kpiMaiorSaida', Formatters.currency(maiorSaida));
        setTxt('kpiStatusSaldo', saldo >= 0 ? "Consolidado (Positivo)" : "Atenção (Negativo)");
    },

    populateSelectFilters() {
        const fornecedores = [...new Set(STATE.transacoes.map(t => t.fornecedor).filter(Boolean))].sort();
        const categorias = [...new Set(STATE.transacoes.map(t => t.categoria).filter(Boolean))].sort();

        const selectForn = document.getElementById('headerFiltroFornecedor');
        if (selectForn) {
            const valAtual = selectForn.value;
            selectForn.innerHTML = '<option value="Tudo">▼ Todos</option>' +
                fornecedores.map(f => `<option value="${f}">${f}</option>`).join('');
            if (fornecedores.includes(valAtual)) selectForn.value = valAtual;
        }

        const selectCat = document.getElementById('headerFiltroCategoria');
        if (selectCat) {
            const valCatAtual = selectCat.value;
            selectCat.innerHTML = '<option value="Tudo">▼ Todas</option>' +
                categorias.map(c => `<option value="${c}">${c}</option>`).join('');
            if (categorias.includes(valCatAtual)) selectCat.value = valCatAtual;
        }
    }
};

window.UI = UI;
window.openModal = (id) => UI.openModal(id);
window.closeModal = (id) => UI.closeModal(id);

/**
 * GRÁFICOS
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
        this.renderBars(dados);
        this.renderCategoryDonut(dados);
        this.renderProportionPie(dados);
    },

    renderBars(dados) {
        const datasMap = {};
        dados.forEach(d => {
            if (!datasMap[d.data]) datasMap[d.data] = { e: 0, s: 0 };
            if (d.tipo.toLowerCase().includes('entrada')) datasMap[d.data].e += d.valor;
            else datasMap[d.data].s += d.valor;
        });

        const datas = Object.keys(datasMap).sort();
        const arrEntradas = datas.map(d => datasMap[d].e);
        const arrSaidas = datas.map(d => datasMap[d].s);
        const labelsDatas = datas.map(d => Formatters.dateToBR(d));

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
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    },

    renderCategoryDonut(dados) {
        const despesas = dados.filter(t => !t.tipo.toLowerCase().includes('entrada'));
        const catMap = {};
        despesas.forEach(d => {
            const cat = d.categoria || 'Geral';
            catMap[cat] = (catMap[cat] || 0) + d.valor;
        });

        this.destroyChart('donut');
        const canvas = document.getElementById('chartCategoriasDonut');
        if (!canvas) return;

        const labels = Object.keys(catMap);
        const dataValues = Object.values(catMap);
        const bgColors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#f59e0b', '#f97316'];

        STATE.charts.donut = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: dataValues, backgroundColor: bgColors, borderWidth: 1 }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                cutout: '65%'
            }
        });

        const legendDiv = document.getElementById('legendCategorias');
        if (legendDiv) {
            let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
            labels.forEach((label, i) => {
                const color = bgColors[i % bgColors.length];
                const valorFormatado = Formatters.currency(dataValues[i]);
                html += `
                    <li style="display: flex; align-items: center; margin-bottom: 8px;" title="${label}: ${valorFormatado}">
                        <span style="width: 10px; height: 10px; background-color: ${color}; border-radius: 2px; margin-right: 8px; flex-shrink: 0;"></span>
                        <span style="color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">
                            ${label}
                        </span>
                    </li>
                `;
            });
            html += '</ul>';
            legendDiv.innerHTML = html;
        }
    },

    renderProportionPie(dados) {
        const totE = dados.filter(t => t.tipo.toLowerCase().includes('entrada')).reduce((a, b) => a + b.valor, 0);
        const totS = dados.filter(t => !t.tipo.toLowerCase().includes('entrada')).reduce((a, b) => a + b.valor, 0);

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
 * FILTROS E CARREGAMENTO
 */
function aplicarFiltros() {
    const dtInicio = document.getElementById('filtroInicio')?.value;
    const dtFim = document.getElementById('filtroFim')?.value;
    const filtroGeralTipo = document.getElementById('filtroTipo')?.value || 'Tudo';

    const filtroFornHeader = document.getElementById('headerFiltroFornecedor')?.value || 'Tudo';
    const filtroCatHeader = document.getElementById('headerFiltroCategoria')?.value || 'Tudo';
    const filtroTipoHeader = document.getElementById('headerFiltroTipo')?.value || 'Tudo';

    const filtradas = STATE.transacoes.filter(t => {
        const passaGeralTipo = filtroGeralTipo === 'Tudo' || t.tipo === filtroGeralTipo;
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

        return passaGeralTipo && passaTipoHeader && passaFornecedor && passaCategoria && passaData;
    });

    UI.updateKPIs(filtradas);
    ChartManager.renderAll(filtradas);
    UI.renderTable(filtradas);
}

function resetarFiltros() {
    ['filtroInicio', 'filtroFim'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['filtroTipo', 'headerFiltroFornecedor', 'headerFiltroCategoria', 'headerFiltroTipo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = 'Tudo';
    });
    aplicarFiltros();
}

async function carregarDados() {
    const tbody = document.getElementById('tabelaCorpo');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center p-20">A carregar dados...</td></tr>';

    try {
        const dadosBrutos = await ApiService.fetchTodasTransacoes();
        STATE.transacoes = dadosBrutos
            .map((item, index) => Formatters.normalizarTransacao(item, index))
            .sort((a, b) => new Date(b.data) - new Date(a.data));

        UI.populateSelectFilters();
        aplicarFiltros();
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center p-20" style="color: red;">Erro ao carregar: ${err.message}</td></tr>`;
    }
}

/**
 * FORMULÁRIO E IA
 */
function atualizarCamposFormulario() {
    const tipo = document.getElementById('formTipo')?.value || 'Saída';
    const groupEntrada = document.getElementById('groupEntrada');
    const groupSaida = document.getElementById('groupSaida');

    if (groupEntrada) groupEntrada.style.display = (tipo === 'Entrada') ? 'block' : 'none';
    if (groupSaida) groupSaida.style.display = (tipo === 'Entrada') ? 'none' : 'block';
}

function preencherCamposComIA(respostaIa) {
    // Extrai o objeto de dados seja da propriedade `data` ou da raiz
    const item = respostaIa.data || respostaIa;

    // 1. Define o Tipo de Transação (padrão 'Saída')
    const selectTipoTransacao = document.getElementById('formTipo');
    if (selectTipoTransacao) {
        selectTipoTransacao.value = item.tipoTransacao || 'Saída';
        atualizarCamposFormulario();
    }

    // 2. Preenche o novo campo: Tipo de Documento
    const rawTipoDoc = item.tipoDocumento || item.tipo_documento || item.tipo;
    if (rawTipoDoc) {
        const selectTipoDoc = document.getElementById('tipoDocumento');
        if (selectTipoDoc) {
            const valorUpper = String(rawTipoDoc).toUpperCase();
            const opcaoExiste = Array.from(selectTipoDoc.options).some(opt => opt.value === valorUpper);
            selectTipoDoc.value = opcaoExiste ? valorUpper : 'OUTROS';
        }
    }

    // 3. Preenche os demais campos com base no tipo
    if (item.id) document.getElementById('saiId').value = item.id;
    if (item.data) document.getElementById('saiData').value = item.data;
    if (item.fornecedor) document.getElementById('saiFornecedor').value = item.fornecedor;
    if (item.cnpj) document.getElementById('saiCnpj').value = item.cnpj;
    if (item.operador) document.getElementById('saiOperador').value = item.operador;
    if (item.formaPagamento) document.getElementById('saiFormaPagamento').value = item.formaPagamento;
    if (item.valor !== undefined && item.valor !== null) document.getElementById('saiValor').value = item.valor;
}

function obterDadosFormulario() {
    const tipoTransacao = document.getElementById('formTipo')?.value;
    const tipoDocumento = document.getElementById('tipoDocumento')?.value || '';

    if (tipoTransacao === 'Entrada') {
        return {
            tipoTransacao: 'Entrada',
            tipoDocumento: tipoDocumento,
            data: document.getElementById('entData')?.value || '',
            fonte: document.getElementById('entFonte')?.value || '',
            categoria: document.getElementById('entCategoria')?.value || '',
            operador: document.getElementById('entOperador')?.value || '',
            descricao: document.getElementById('entDescricao')?.value || '',
            valor: parseFloat(document.getElementById('entValor')?.value) || 0
        };
    } else {
        return {
            tipoTransacao: 'Saída',
            tipoDocumento: tipoDocumento,
            id: document.getElementById('saiId')?.value || '',
            data: document.getElementById('saiData')?.value || '',
            fornecedor: document.getElementById('saiFornecedor')?.value || '',
            cnpj: document.getElementById('saiCnpj')?.value || '',
            operador: document.getElementById('saiOperador')?.value || '',
            formaPagamento: document.getElementById('saiFormaPagamento')?.value || '',
            valor: parseFloat(document.getElementById('saiValor')?.value) || 0
        };
    }
}

/**
 * INICIALIZAÇÃO E LISTENERS
 */
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = "#64748b";
    }

    carregarDados();

    // Listeners dos Filtros
    ['filtroInicio', 'filtroFim', 'filtroTipo', 'headerFiltroFornecedor', 'headerFiltroCategoria', 'headerFiltroTipo']
        .forEach(id => document.getElementById(id)?.addEventListener('change', aplicarFiltros));

    document.getElementById('btnResetarFiltros')?.addEventListener('click', resetarFiltros);
    document.getElementById('btnReloadTable')?.addEventListener('click', carregarDados);

    // Delegação de cliques para botões de abrir/fechar modais
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button, a, .btn');
        if (!btn) return;

        const texto = btn.innerText?.toLowerCase() || '';
        const id = btn.id || '';

        if (id === 'btnOpenMovimentacao' || texto.includes('movimentação')) {
            UI.openModal('modalMovimentacao');
        } else if (id === 'btnOpenDanfe' || texto.includes('upload danfe')) {
            UI.openModal('modalDanfe');
        }

        const closeAttr = btn.getAttribute('data-close');
        if (closeAttr) {
            UI.closeModal(closeAttr);
        }
    });

    document.getElementById('formTipo')?.addEventListener('change', atualizarCamposFormulario);

    // Upload via IA (Modal de Lançamento)
    const btnTriggerAi = document.getElementById('btnTriggerAiUpload');
    const aiInput = document.getElementById('aiFileInput');
    const aiStatus = document.getElementById('aiUploadStatus');

    btnTriggerAi?.addEventListener('click', () => aiInput?.click());

    aiInput?.addEventListener('change', async () => {
        const file = aiInput.files[0];
        if (!file) return;

        try {
            if (aiStatus) aiStatus.innerText = '🤖 Lendo documento com IA...';
            if (btnTriggerAi) btnTriggerAi.disabled = true;

            const dadosExtraidos = await ApiService.uploadDanfe(file);
            preencherCamposComIA(dadosExtraidos);
            if (aiStatus) aiStatus.innerText = '✅ Dados preenchidos! Verifique antes de salvar.';
        } catch (err) {
            if (aiStatus) aiStatus.innerText = '❌ Erro ao ler imagem: ' + err.message;
        } finally {
            if (btnTriggerAi) btnTriggerAi.disabled = false;
            aiInput.value = '';
        }
    });

    // Upload DANFE (Modal Independente)
    const fileDanfeInput = document.getElementById('arquivoDanfe');
    const fileContainer = document.getElementById('fileUploadContainer');
    const nameDisplay = document.getElementById('nomeArquivo');

    fileContainer?.addEventListener('click', () => fileDanfeInput?.click());
    fileDanfeInput?.addEventListener('change', (e) => {
        const name = e.target.files[0]?.name;
        if (nameDisplay) nameDisplay.innerText = name ? `Arquivo selecionado: ${name}` : '';
    });

    document.getElementById('formDanfe')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = fileDanfeInput?.files[0];
        if (!file) {
            alert('Por favor, selecione um arquivo primeiro.');
            return;
        }

        const btnEnv = document.getElementById('btnEnviarDanfe');
        try {
            if (btnEnv) {
                btnEnv.disabled = true;
                btnEnv.innerText = 'Enviando...';
            }
            await ApiService.uploadDanfe(file);
            alert('Documento enviado com sucesso para o n8n!');
            UI.closeModal('modalDanfe');
            fileDanfeInput.value = '';
            if (nameDisplay) nameDisplay.innerText = '';
        } catch (err) {
            alert('Erro no upload: ' + err.message);
        } finally {
            if (btnEnv) {
                btnEnv.disabled = false;
                btnEnv.innerText = 'Enviar para Processamento';
            }
        }
    });

    // Submissão do Formulário de Movimentação
    document.getElementById('formMovimentacao')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSalvar = document.getElementById('btnSalvarRegistro');
        const payload = obterDadosFormulario();
        const urlDestino = payload.tipoTransacao === 'Entrada' ? CONFIG.URL_ENTRADAS : CONFIG.URL_SAIDAS;

        try {
            if (btnSalvar) {
                btnSalvar.disabled = true;
                btnSalvar.innerText = 'Salvando...';
            }

            const res = await fetch(urlDestino, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Falha ao comunicar com o servidor/Google Sheets.');

            alert('Movimentação gravada com sucesso!');
            document.getElementById('formMovimentacao').reset();
            if (aiStatus) aiStatus.innerText = '';
            UI.closeModal('modalMovimentacao');
            carregarDados();

        } catch (err) {
            alert('Erro ao salvar registro: ' + err.message);
        } finally {
            if (btnSalvar) {
                btnSalvar.disabled = false;
                btnSalvar.innerText = 'Salvar Registro';
            }
        }
    });
});
