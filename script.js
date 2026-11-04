// Submissão do Formulário de Movimentação
    document.getElementById('formMovimentacao')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSalvar = document.getElementById('btnSalvarRegistro');
        const aiStatus = document.getElementById('aiUploadStatus');
        const payload = obterDadosFormulario();

        try {
            if (btnSalvar) {
                btnSalvar.disabled = true;
                btnSalvar.innerText = 'Verificando e Salvando...';
            }

            if (aiStatus) {
                aiStatus.style.color = '#2563eb';
                aiStatus.innerText = '⏳ Verificando duplicidade e processando...';
            }

            const res = await fetch(CONFIG.URL_SALVAR, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(payload)
            });

            const resposta = await res.json();

            // Se houver erro de requisição ou duplicidade retornada pelo n8n
            if (!res.ok || resposta.success === false) {
                throw new Error(resposta.message || resposta.mensagem || 'Documento já cadastrado ou falha ao salvar.');
            }

            // Sucesso: exibe a mensagem positiva no robozinho
            if (aiStatus) {
                aiStatus.style.color = '#10b981';
                aiStatus.innerText = '✅ ' + (resposta.message || resposta.mensagem || 'Movimentação gravada com sucesso!');
            }

            // Aguarda 1.5 segundos para o utilizador ler o feedback e fecha o modal com estilo
            setTimeout(() => {
                document.getElementById('formMovimentacao').reset();
                if (aiStatus) aiStatus.innerText = '';
                UI.closeModal('modalMovimentacao');
                carregarDados();
            }, 1500);

        } catch (err) {
            // Erro / Duplicidade: exibe o aviso em vermelho diretamente no robozinho
            if (aiStatus) {
                aiStatus.style.color = '#f43f5e';
                aiStatus.innerText = '⚠️ ' + err.message;
            }
        } finally {
            if (btnSalvar) {
                btnSalvar.disabled = false;
                btnSalvar.innerText = 'Salvar Registro';
            }
        }
    });
