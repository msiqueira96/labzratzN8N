<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Financeiro | Fluxo de Caixa</title>

    <!-- Google Fonts & Chart.js -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <!-- Estilos Separados -->
    <link rel="stylesheet" href="style.css">
</head>

<body>

    <div class="app-container">

        <!-- Sidebar / Navegação -->
        <aside class="sidebar">
            <div>
                <div class="brand">
                    <div class="brand-logo">F</div>
                    <div class="brand-text">
                        <h2>FLUXO 2.0</h2>
                        <span>CONTROL PANEL</span>
                    </div>
                </div>

                <ul class="nav-menu">
                    <li class="nav-item active">
                        <a href="#" data-tab="dashboard">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z">
                                </path>
                            </svg>
                            Dashboard
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="#" data-tab="entradas">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 4v16m8-8H4"></path>
                            </svg>
                            Entradas
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="#" data-tab="saidas">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4">
                                </path>
                            </svg>
                            Saídas
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="#" id="btnOpenDanfe">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12">
                                </path>
                            </svg>
                            Upload DANFE
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="#" data-tab="config">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z">
                                </path>
                            </svg>
                            Configurações
                        </a>
                    </li>
                </ul>
            </div>

            <div class="user-card">
                <div class="avatar">OP</div>
                <div class="user-info">
                    <h4>Operador Caixas</h4>
                    <p>Permissão: Acesso Total</p>
                </div>
            </div>
        </aside>

        <!-- Conteúdo Principal -->
        <main class="main-content">

            <header class="top-header">
                <div class="header-title">
                    <h1>Fluxo de Caixa <span>Dashboard</span></h1>
                    <p class="header-subtitle">Acompanhamento e extração automatizada via n8n</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-secondary" id="btnResetarFiltros">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
                            </path>
                        </svg>
                        Resetar Filtros
                    </button>
                    <button class="btn btn-primary" id="btnOpenMovimentacao">
                        + Nova Movimentação
                    </button>
                </div>
            </header>

            <div class="filter-bar">
                <div class="filter-group">
                    <label for="filtroInicio">Início:</label>
                    <input type="date" id="filtroInicio">
                    <label for="filtroFim" class="ml-12">Fim:</label>
                    <input type="date" id="filtroFim">
                </div>
                <div class="filter-group">
                    <label for="filtroTipo">Tipo (Visão Geral):</label>
                    <select id="filtroTipo">
                        <option value="Tudo">Todos os Lançamentos</option>
                        <option value="Entrada">Somente Entradas</option>
                        <option value="Saída">Somente Saídas</option>
                    </select>
                </div>
            </div>

            <div class="dashboard-grid">

                <div class="kpi-column">
                    <div class="kpi-card highlight">
                        <div class="kpi-header">
                            <h3>SALDO NO PERÍODO</h3>
                            <svg width="18" height="18" fill="none" stroke="#93c5fd" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                                </path>
                            </svg>
                        </div>
                        <div class="kpi-value" id="kpiSaldo">R$ 0,00</div>
                        <div class="kpi-subtext">
                            <div class="sub-item">
                                <span>Status Atual</span>
                                <strong id="kpiStatusSaldo">Consolidado</strong>
                            </div>
                        </div>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-header">
                            <h3>TOTAL ENTRADAS</h3>
                            <svg width="18" height="18" fill="none" stroke="#10b981" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                            </svg>
                        </div>
                        <div class="kpi-value val-entrada" id="kpiEntradas">R$ 0,00</div>
                        <div class="kpi-subtext">
                            <div class="sub-item">
                                <span>Maior Entrada</span>
                                <strong id="kpiMaiorEntrada">R$ 0,00</strong>
                            </div>
                        </div>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-header">
                            <h3>TOTAL SAÍDAS</h3>
                            <svg width="18" height="18" fill="none" stroke="#f43f5e" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"></path>
                            </svg>
                        </div>
                        <div class="kpi-value val-saida" id="kpiSaidas">R$ 0,00</div>
                        <div class="kpi-subtext">
                            <div class="sub-item">
                                <span>Maior Despesa</span>
                                <strong id="kpiMaiorSaida">R$ 0,00</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="charts-column">

                    <div class="chart-card">
                        <div class="chart-card-header">
                            <h3>Fluxo por Período (Entradas vs Saídas)</h3>
                            <div class="chart-legend-fixed">
                                <span class="legend-item"><span class="legend-box entrada"></span> Entradas</span>
                                <span class="legend-item"><span class="legend-box saida"></span> Saídas</span>
                            </div>
                        </div>

                        <div class="chart-split-box">
                            <div class="yaxis-fixed-panel">
                                <canvas id="chartYAxisCanvas"></canvas>
                            </div>

                            <div class="bars-scrollable-area" id="barsScrollArea">
                                <div class="bars-scrollable-inner" id="barsInnerContainer">
                                    <canvas id="chartBarsCanvas"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="two-charts-row">
                        <div class="chart-card">
                            <div class="chart-card-header">
                                <h3>Despesas por Categoria</h3>
                            </div>
                            <div class="chart-container">
                                <canvas id="chartCategoriasDonut"></canvas>
                            </div>
                        </div>

                        <div class="chart-card">
                            <div class="chart-card-header">
                                <h3>Proporção Entrada x Saída</h3>
                            </div>
                            <div class="chart-container">
                                <canvas id="chartProporcaoPie"></canvas>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            <div class="table-card">
                <div class="table-card-header">
                    <h3>Últimas Transações Registradas</h3>
                    <button class="btn btn-secondary" id="btnReloadTable">Atualizar Tabela</button>
                </div>
                <div class="table-scroll-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>
                                    <div class="header-filter-wrapper">
                                        <span>Fornecedor / Descrição</span>
                                        <select id="headerFiltroFornecedor" class="header-filter-select">
                                            <option value="Tudo">▼ Todos</option>
                                        </select>
                                    </div>
                                </th>
                                <th>
                                    <div class="header-filter-wrapper">
                                        <span>Categoria</span>
                                        <select id="headerFiltroCategoria" class="header-filter-select">
                                            <option value="Tudo">▼ Todas</option>
                                        </select>
                                    </div>
                                </th>
                                <th>
                                    <div class="header-filter-wrapper">
                                        <span>Tipo</span>
                                        <select id="headerFiltroTipo" class="header-filter-select">
                                            <option value="Tudo">▼ Todos</option>
                                            <option value="Entrada">Entrada</option>
                                            <option value="Saída">Saída</option>
                                        </select>
                                    </div>
                                </th>
                                <th class="text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody id="tabelaCorpo"></tbody>
                    </table>
                </div>
            </div>

        </main>

    </div>

    <!-- Modais -->
    <div class="modal-overlay" id="modalMovimentacao">
        <div class="modal-box">
            <div class="modal-header">
                <h3>Nova Movimentação</h3>
                <button class="close-btn" data-close="modalMovimentacao">&times;</button>
            </div>
            <form id="formMovimentacao">
                <div class="form-group">
                    <label for="formTipo">Tipo de Transação</label>
                    <select class="form-control" id="formTipo" required>
                        <option value="Entrada">Entrada</option>
                        <option value="Saída">Saída</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="formData">Data</label>
                    <input type="date" class="form-control" id="formData" required>
                </div>
                <div class="form-group">
                    <label for="formFornecedor">Fornecedor / Descrição</label>
                    <input type="text" class="form-control" id="formFornecedor"
                        placeholder="Ex: Mercado Livre / Cliente X" required>
                </div>
                <div class="form-group">
                    <label for="formCategoria">Categoria</label>
                    <input type="text" class="form-control" id="formCategoria"
                        placeholder="Ex: Insumos, Serviços, Vendas" required>
                </div>
                <div class="form-group">
                    <label for="formValor">Valor (R$)</label>
                    <input type="number" step="0.01" class="form-control" id="formValor" placeholder="0.00" required>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" data-close="modalMovimentacao">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btnSalvarMov">Salvar Registro</button>
                </div>
            </form>
        </div>
    </div>

    <div class="modal-overlay" id="modalDanfe">
        <div class="modal-box">
            <div class="modal-header">
                <h3>Upload de Documento (PDF ou Imagem)</h3>
                <button class="close-btn" data-close="modalDanfe">&times;</button>
            </div>
            <form id="formDanfe">
                <p class="modal-info-text">
                    O arquivo será processado via Webhook n8n para envio ao Google Drive e extração automatizada de
                    dados.
                </p>
                <div class="file-upload-area" id="fileUploadContainer">
                    <svg width="36" height="36" fill="none" stroke="var(--blue)" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12">
                        </path>
                    </svg>
                    <p class="upload-title">Clique para escolher a Nota Fiscal ou Imagem</p>
                    <input type="file" id="arquivoDanfe" accept="application/pdf,image/*" hidden>
                    <div id="nomeArquivo" class="file-name-display"></div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" data-close="modalDanfe">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btnEnviarDanfe">Enviar para o Drive</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Script JS -->
    <script src="script.js"></script>
</body>

</html>
