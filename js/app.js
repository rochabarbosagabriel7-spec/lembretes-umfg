// ========================================
// CONFIGURAÇÃO
// ========================================

// Endereço da API (perfil "https" do launchSettings.json).
// Se você rodar a API pelo perfil "http", troque para "http://localhost:5207".
const API_URL = "https://localhost:7063";

// A API aplica os filtros de data mesmo quando o campo não é enviado
// (por causa dos valores padrão do DTO). Por isso, quando o usuário deixa
// uma data em branco, enviamos um intervalo bem amplo.
const DATA_MINIMA = "1900-01-01";
const DATA_MAXIMA = "2999-12-31";

// Estado da tela
const estado = {
    paginaAtual: 1,
    totalPaginas: 1,
    ordem: "DataCadastro",
    direcao: "DESC",
    idParaExcluir: null,
    carregando: false
};


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const $ = (id) => document.getElementById(id);

const modalFormulario = $("modalFormulario");
const formLembrete = $("formLembrete");
const tituloFormulario = $("tituloFormulario");
const lembreteId = $("lembreteId");
const descricao = $("descricao");
const erroDescricao = $("erroDescricao");
const contadorDescricao = $("contadorDescricao");
const btnSalvar = $("btnSalvar");

const modalExcluir = $("modalExcluir");
const textoExcluir = $("textoExcluir");

const formFiltro = $("formFiltro");
const filtroDescricao = $("filtroDescricao");
const filtroCadastroInicial = $("filtroCadastroInicial");
const filtroCadastroFinal = $("filtroCadastroFinal");
const filtroAtualizacaoInicial = $("filtroAtualizacaoInicial");
const filtroAtualizacaoFinal = $("filtroAtualizacaoFinal");
const erroCadastro = $("erroCadastro");
const erroAtualizacao = $("erroAtualizacao");
const tamanhoPagina = $("tamanhoPagina");

const listaLembretes = $("listaLembretes");
const mensagemVazia = $("mensagemVazia");
const carregando = $("carregando");
const resumoRegistros = $("resumoRegistros");
const paginaAtualElemento = $("paginaAtual");
const numerosPagina = $("numerosPagina");

const avisoErro = $("avisoErro");
const avisoErroTexto = $("avisoErroTexto");

const btnPrimeira = $("btnPrimeira");
const btnAnterior = $("btnAnterior");
const btnProximo = $("btnProximo");
const btnUltima = $("btnUltima");


// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    atualizarIndicadoresOrdenacao();
    filtrarLembretes();
});


// ========================================
// COMUNICAÇÃO COM A API
// ========================================

// Envolve o fetch para diferenciar "API fora do ar" de "API respondeu com erro".
async function requisitar(caminho, opcoes = {}) {
    let response;

    try {
        response = await fetch(`${API_URL}${caminho}`, opcoes);
    } catch (erro) {
        // fetch só lança exceção quando não há resposta (API desligada, CORS, certificado...)
        const falha = new Error("Sem comunicação com a API.");
        falha.tipo = "rede";
        throw falha;
    }

    if (!response.ok) {
        let detalhe = "";
        try { detalhe = await response.text(); } catch { /* sem corpo */ }

        const falha = new Error(detalhe || `A API respondeu com status ${response.status}.`);
        falha.tipo = "http";
        falha.status = response.status;
        throw falha;
    }

    esconderAvisoErro();
    return response;
}

// Monta a query string usada por /lembretes/filtro e /lembretes/imprimir
function montarParametros() {
    const params = new URLSearchParams();

    params.append("NumeroPagina", estado.paginaAtual);
    params.append("TamanhoPagina", tamanhoPagina.value);
    params.append("Ordem", estado.ordem);
    params.append("Direcao", estado.direcao);
    params.append("Descricao", filtroDescricao.value.trim());
    params.append("DataCadastroInicial", filtroCadastroInicial.value || DATA_MINIMA);
    params.append("DataCadastroFinal", filtroCadastroFinal.value || DATA_MAXIMA);
    params.append("DataAtualizacaoInicial", filtroAtualizacaoInicial.value || DATA_MINIMA);
    params.append("DataAtualizacaoFinal", filtroAtualizacaoFinal.value || DATA_MAXIMA);

    return params;
}


// ========================================
// GET /lembretes/filtro
// ========================================

async function filtrarLembretes() {
    if (!validarFiltros()) {
        return;
    }

    mostrarCarregando(true);

    try {
        const params = montarParametros();
        console.log("GET /lembretes/filtro ->", Object.fromEntries(params));

        const response = await requisitar(`/lembretes/filtro?${params}`);
        const resultado = await response.json();

        const total = Number(resultado.total) || 0;
        const tamanho = Number(resultado.tamanhoPagina) || Number(tamanhoPagina.value);
        estado.totalPaginas = Math.max(1, Math.ceil(total / tamanho));

        // Se a página atual ficou vazia (ex.: após excluir o último item), volta uma página
        if (resultado.lembretes.length === 0 && estado.paginaAtual > 1 && total > 0) {
            estado.paginaAtual = estado.totalPaginas;
            return filtrarLembretes();
        }

        renderizarLembretes(resultado.lembretes);
        atualizarResumo(total, tamanho, resultado.lembretes.length);
        renderizarPaginacao();

    } catch (erro) {
        console.error(erro);
        listaLembretes.innerHTML = "";
        mensagemVazia.classList.add("oculto");
        resumoRegistros.textContent = "Não foi possível carregar os lembretes.";
        tratarErro(erro, "Erro ao buscar os lembretes.");

    } finally {
        mostrarCarregando(false);
    }
}


// ========================================
// GET /lembretes/imprimir
// ========================================

async function imprimirLembretes() {
    if (!validarFiltros()) {
        return;
    }

    try {
        const response = await requisitar(`/lembretes/imprimir?${montarParametros()}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "relatorio-lembretes.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 10000);
        mostrarToast("Relatório gerado com sucesso!", "sucesso");

    } catch (erro) {
        console.error(erro);
        tratarErro(erro, "Não foi possível gerar o relatório.");
    }
}


// ========================================
// POST /lembretes
// ========================================

async function criarLembrete() {
    try {
        await requisitar("/lembretes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descricao: descricao.value.trim() })
        });

        mostrarToast("Lembrete cadastrado com sucesso!", "sucesso");
        fecharFormulario();

        estado.paginaAtual = 1;
        await filtrarLembretes();

    } catch (erro) {
        console.error(erro);
        tratarErro(erro, "Não foi possível cadastrar o lembrete.");
    }
}


// ========================================
// GET /lembretes/{id}
// ========================================

async function buscarLembrete(id) {
    try {
        const response = await requisitar(`/lembretes/${encodeURIComponent(id)}`);
        const lembrete = await response.json();

        abrirFormulario(lembrete);

    } catch (erro) {
        console.error(erro);

        if (erro.status === 404) {
            mostrarToast("Este lembrete não existe mais.", "erro");
            filtrarLembretes();
            return;
        }

        tratarErro(erro, "Não foi possível buscar o lembrete.");
    }
}


// ========================================
// PUT /lembretes/{id}
// ========================================

async function atualizarLembrete() {
    try {
        await requisitar(`/lembretes/${encodeURIComponent(lembreteId.value)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descricao: descricao.value.trim() })
        });

        mostrarToast("Lembrete atualizado com sucesso!", "sucesso");
        fecharFormulario();
        await filtrarLembretes();

    } catch (erro) {
        console.error(erro);
        tratarErro(erro, "Não foi possível atualizar o lembrete.");
    }
}


// ========================================
// DELETE /lembretes/{id}
// ========================================

function confirmarExclusao(id, textoDescricao) {
    estado.idParaExcluir = id;
    textoExcluir.textContent = textoDescricao;
    modalExcluir.showModal();
}

async function excluirLembrete() {
    const id = estado.idParaExcluir;
    modalExcluir.close();

    if (!id) {
        return;
    }

    try {
        await requisitar(`/lembretes/${encodeURIComponent(id)}`, { method: "DELETE" });

        mostrarToast("Lembrete excluído com sucesso!", "sucesso");
        await filtrarLembretes();

    } catch (erro) {
        console.error(erro);
        tratarErro(erro, "Não foi possível excluir o lembrete.");

    } finally {
        estado.idParaExcluir = null;
    }
}


// ========================================
// RENDERIZAÇÃO
// ========================================

function renderizarLembretes(lembretes) {
    listaLembretes.innerHTML = "";

    if (!lembretes || lembretes.length === 0) {
        mensagemVazia.classList.remove("oculto");
        return;
    }

    mensagemVazia.classList.add("oculto");

    lembretes.forEach(lembrete => {
        const tr = document.createElement("tr");

        // textContent evita que HTML digitado na descrição seja executado
        const tdDescricao = criarCelula("Descrição", lembrete.descricao, "col-descricao");
        const tdCadastro = criarCelula("Cadastro", formatarData(lembrete.dataCadastro));
        const tdAtualizacao = criarCelula("Atualização", formatarData(lembrete.dataAtualizacao));

        const tdStatus = criarCelula("Status", "");
        const etiqueta = document.createElement("span");
        etiqueta.className = `etiqueta ${lembrete.isAtivo ? "etiqueta-ativo" : "etiqueta-inativo"}`;
        etiqueta.textContent = lembrete.isAtivo ? "Ativo" : "Inativo";
        tdStatus.appendChild(etiqueta);

        const tdAcoes = criarCelula("Ações", "", "col-acoes");
        const acoes = document.createElement("div");
        acoes.className = "acoes";

        const btnEditar = document.createElement("button");
        btnEditar.type = "button";
        btnEditar.className = "botao-icone botao-editar";
        btnEditar.textContent = "Editar";
        btnEditar.addEventListener("click", () => buscarLembrete(lembrete.id));

        const btnExcluir = document.createElement("button");
        btnExcluir.type = "button";
        btnExcluir.className = "botao-icone botao-excluir";
        btnExcluir.textContent = "Excluir";
        btnExcluir.addEventListener("click", () => confirmarExclusao(lembrete.id, lembrete.descricao));

        acoes.append(btnEditar, btnExcluir);
        tdAcoes.appendChild(acoes);

        tr.append(tdDescricao, tdCadastro, tdAtualizacao, tdStatus, tdAcoes);
        listaLembretes.appendChild(tr);
    });
}

function criarCelula(rotulo, texto, classe = "") {
    const td = document.createElement("td");
    td.dataset.rotulo = rotulo; // usado no layout de cartões no celular
    if (classe) td.className = classe;
    td.textContent = texto;
    return td;
}

function atualizarResumo(total, tamanho, quantidadeNaPagina) {
    if (total === 0) {
        resumoRegistros.textContent = "0 registros";
        return;
    }

    const inicio = (estado.paginaAtual - 1) * tamanho + 1;
    const fim = inicio + quantidadeNaPagina - 1;
    const palavra = total === 1 ? "registro" : "registros";

    resumoRegistros.textContent = `Exibindo ${inicio}–${fim} de ${total} ${palavra}`;
}

function renderizarPaginacao() {
    const { paginaAtual, totalPaginas } = estado;

    paginaAtualElemento.textContent = `Página ${paginaAtual} de ${totalPaginas}`;

    btnPrimeira.disabled = paginaAtual <= 1;
    btnAnterior.disabled = paginaAtual <= 1;
    btnProximo.disabled = paginaAtual >= totalPaginas;
    btnUltima.disabled = paginaAtual >= totalPaginas;

    // Mostra no máximo 5 números ao redor da página atual
    numerosPagina.innerHTML = "";
    let inicio = Math.max(1, paginaAtual - 2);
    let fim = Math.min(totalPaginas, inicio + 4);
    inicio = Math.max(1, fim - 4);

    for (let numero = inicio; numero <= fim; numero++) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "botao-pagina" + (numero === paginaAtual ? " ativa" : "");
        botao.textContent = numero;
        botao.setAttribute("aria-label", `Página ${numero}`);
        if (numero === paginaAtual) botao.setAttribute("aria-current", "page");
        botao.addEventListener("click", () => irParaPagina(numero));
        numerosPagina.appendChild(botao);
    }
}

function irParaPagina(numero) {
    const destino = Math.min(Math.max(1, numero), estado.totalPaginas);

    if (destino === estado.paginaAtual || estado.carregando) {
        return;
    }

    estado.paginaAtual = destino;
    filtrarLembretes();
}


// ========================================
// ORDENAÇÃO (clique no título da coluna)
// ========================================

document.querySelectorAll(".ordenar").forEach(botao => {
    botao.addEventListener("click", () => {
        const campo = botao.dataset.ordem;

        if (estado.ordem === campo) {
            estado.direcao = estado.direcao === "ASC" ? "DESC" : "ASC";
        } else {
            estado.ordem = campo;
            // texto começa em A→Z; datas começam pelas mais recentes
            estado.direcao = campo === "Descricao" ? "ASC" : "DESC";
        }

        estado.paginaAtual = 1;
        atualizarIndicadoresOrdenacao();
        filtrarLembretes();
    });
});

function atualizarIndicadoresOrdenacao() {
    document.querySelectorAll(".ordenar").forEach(botao => {
        const th = botao.closest("th");
        const ativo = botao.dataset.ordem === estado.ordem;

        botao.classList.toggle("ativo", ativo);
        botao.querySelector(".seta").textContent = ativo ? (estado.direcao === "ASC" ? "▲" : "▼") : "↕";
        th.setAttribute("aria-sort", ativo ? (estado.direcao === "ASC" ? "ascending" : "descending") : "none");
        botao.title = ativo
            ? `Ordenado ${estado.direcao === "ASC" ? "crescente" : "decrescente"} — clique para inverter`
            : "Clique para ordenar por esta coluna";
    });
}


// ========================================
// FORMULÁRIO (modal)
// ========================================

$("btnNovo").addEventListener("click", () => abrirFormulario());
$("btnImprimir").addEventListener("click", imprimirLembretes);
$("btnCancelar").addEventListener("click", fecharFormulario);

function abrirFormulario(lembrete = null) {
    formLembrete.reset();
    lembreteId.value = lembrete ? lembrete.id : "";
    descricao.value = lembrete ? lembrete.descricao : "";
    tituloFormulario.textContent = lembrete ? "Editar lembrete" : "Novo lembrete";

    mostrarErroCampo(descricao, erroDescricao, false);
    atualizarContador();

    modalFormulario.showModal();
    descricao.focus();
}

function fecharFormulario() {
    modalFormulario.close();
    formLembrete.reset();
    lembreteId.value = "";
}

descricao.addEventListener("input", () => {
    atualizarContador();
    if (descricao.value.trim()) {
        mostrarErroCampo(descricao, erroDescricao, false);
    }
});

function atualizarContador() {
    contadorDescricao.textContent = `${descricao.value.length}/500`;
}

formLembrete.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!descricao.value.trim()) {
        mostrarErroCampo(descricao, erroDescricao, true);
        mostrarToast("Preencha a descrição do lembrete.", "aviso");
        descricao.focus();
        return;
    }

    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando…";

    try {
        if (lembreteId.value) {
            await atualizarLembrete();
        } else {
            await criarLembrete();
        }
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = "Salvar";
    }
});


// ========================================
// MODAL DE EXCLUSÃO
// ========================================

$("btnCancelarExcluir").addEventListener("click", () => {
    estado.idParaExcluir = null;
    modalExcluir.close();
});

$("btnConfirmarExcluir").addEventListener("click", excluirLembrete);


// ========================================
// FILTROS
// ========================================

formFiltro.addEventListener("submit", (event) => {
    event.preventDefault();
    estado.paginaAtual = 1;
    filtrarLembretes();
});

$("btnLimpar").addEventListener("click", () => {
    formFiltro.reset();
    mostrarErroCampo(filtroCadastroInicial, erroCadastro, false);
    mostrarErroCampo(filtroAtualizacaoInicial, erroAtualizacao, false);
    estado.paginaAtual = 1;
    filtrarLembretes();
});

tamanhoPagina.addEventListener("change", () => {
    estado.paginaAtual = 1;
    filtrarLembretes();
});

function validarFiltros() {
    const cadastroValido = intervaloValido(filtroCadastroInicial.value, filtroCadastroFinal.value);
    const atualizacaoValida = intervaloValido(filtroAtualizacaoInicial.value, filtroAtualizacaoFinal.value);

    mostrarErroCampo(filtroCadastroInicial, erroCadastro, !cadastroValido);
    mostrarErroCampo(filtroAtualizacaoInicial, erroAtualizacao, !atualizacaoValida);

    if (!cadastroValido || !atualizacaoValida) {
        mostrarToast("Corrija o período informado nos filtros.", "aviso");
        return false;
    }

    return true;
}

function intervaloValido(inicial, final) {
    // datas no formato yyyy-mm-dd podem ser comparadas como texto
    return !inicial || !final || inicial <= final;
}


// ========================================
// PAGINAÇÃO
// ========================================

btnPrimeira.addEventListener("click", () => irParaPagina(1));
btnAnterior.addEventListener("click", () => irParaPagina(estado.paginaAtual - 1));
btnProximo.addEventListener("click", () => irParaPagina(estado.paginaAtual + 1));
btnUltima.addEventListener("click", () => irParaPagina(estado.totalPaginas));


// ========================================
// MENSAGENS E UTILITÁRIOS
// ========================================

$("btnTentarNovamente").addEventListener("click", filtrarLembretes);

function tratarErro(erro, mensagemPadrao) {
    if (erro.tipo === "rede") {
        avisoErroTexto.textContent = `Verifique se ela está em execução em ${API_URL} e tente novamente.`;
        avisoErro.classList.remove("oculto");
        mostrarToast("Erro na comunicação com a API.", "erro");
        return;
    }

    mostrarToast(mensagemPadrao, "erro");
}

function esconderAvisoErro() {
    avisoErro.classList.add("oculto");
}

function mostrarCarregando(ativo) {
    estado.carregando = ativo;
    carregando.classList.toggle("oculto", !ativo);
    listaLembretes.classList.toggle("esmaecido", ativo);
    if (ativo) mensagemVazia.classList.add("oculto");
}

function mostrarErroCampo(campo, mensagem, temErro) {
    campo.classList.toggle("invalido", temErro);
    campo.setAttribute("aria-invalid", temErro ? "true" : "false");
    mensagem.classList.toggle("oculto", !temErro);
}

function formatarData(data) {
    if (!data) {
        return "-";
    }

    return new Date(data).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

// tipo: "sucesso" | "erro" | "aviso"
function mostrarToast(mensagem, tipo = "sucesso") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    toast.setAttribute("role", tipo === "erro" ? "alert" : "status");
    toast.textContent = mensagem;

    $("toasts").appendChild(toast);

    setTimeout(() => {
        toast.classList.add("saindo");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
