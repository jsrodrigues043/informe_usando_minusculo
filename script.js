/*
 * PAC-MAN SIMPLIFICADO
 * Projeto educacional com HTML, CSS e JavaScript.
 *
 * Imagens necessárias na mesma pasta:
 * p_direita.png
 * p_esquerda.png
 * p_baixo.png
 * p_cima.png
 * fantasma_a.png
 * fantasma_b.png
 * fantasma_c.png
 * cereja.png
 *
 * Áudios:
 * pacman-die.mp3
 * pac-man-waka-waka.mp3
 *
 * # = parede
 * . = ponto coletável
 * espaço = caminho vazio
 */

const mapaOriginal = [
    "###################",
    "#........#........#",
    "#.###.##.#.##.###.#",
    "#.................#",
    "#.##.#.#####.#.##.#",
    "#....#...#...#....#",
    "####.###.#.###.####",
    "#.................#",
    "#.##.#.#####.#.##.#",
    "#....#...#...#....#",
    "#.###.##.#.##.###.#",
    "#........#........#",
    "#.##.#########.##.#",
    "#.................#",
    "###################"
];

const COLUNAS = mapaOriginal[0].length;
const LINHAS = mapaOriginal.length;

const VELOCIDADE_FANTASMA = 250;

const imagensPacman = {
    direita: "p_direita.png",
    esquerda: "p_esquerda.png",
    baixo: "p_baixo.png",
    cima: "p_cima.png"
};

const imagensFantasmas = [
    "fantasma_a.png",
    "fantasma_b.png",
    "fantasma_c.png"
];

const labirinto = document.getElementById("labirinto");
const elementoPontuacao = document.getElementById("pontuacao");
const elementoMensagem = document.getElementById("mensagem");
const botaoReiniciar = document.getElementById("reiniciar");


/* Efeitos sonoros do jogo */

const somMorte = new Audio("pacman-die.mp3");
const somWaka = new Audio("pac-man-waka-waka.mp3");

somWaka.loop = true;

somMorte.volume = 0.8;
somWaka.volume = 0.5;

function tocarSomWaka() {
    if (somWaka.paused) {
        somWaka.play().catch(erro => {
            console.warn(
                "Não foi possível reproduzir o som:",
                erro
            );
        });
    }
}

function pararSomWaka() {
    somWaka.pause();
    somWaka.currentTime = 0;
}

function tocarSomMorte() {
    pararSomWaka();

    somMorte.currentTime = 0;

    somMorte.play().catch(erro => {
        console.warn(
            "Não foi possível reproduzir o som:",
            erro
        );
    });
}


/* Variáveis do jogo */

let mapa;
let pacman;
let fantasmas;
let pontuacao;
let totalPontos;
let jogoAtivo;

let temporizadorFantasmas;
let temporizadorReinicio;

let direcaoAtual;
let elementosCelulas = [];

// Cerejas e estado temporário de fuga dos fantasmas.
let cerejas = [];
let bonusFugaAtivo = false;
let temporizadorFuga;


// Cria uma cópia do mapa original.
function copiarMapa() {
    return mapaOriginal.map(linha => linha.split(""));
}


// Verifica se uma posição está livre.
function caminhoLivre(x, y) {
    return (
        x >= 0 &&
        x < COLUNAS &&
        y >= 0 &&
        y < LINHAS &&
        mapa[y][x] !== "#"
    );
}


// Retorna a célula HTML correspondente à posição.
function obterCelula(x, y) {
    return elementosCelulas[y][x];
}


// Desenha o labirinto.
function desenharLabirinto() {
    labirinto.innerHTML = "";
    elementosCelulas = [];

    for (let y = 0; y < LINHAS; y++) {
        const linhaElementos = [];

        for (let x = 0; x < COLUNAS; x++) {
            const celula = document.createElement("div");

            celula.classList.add("celula");

            if (mapa[y][x] === "#") {
                celula.classList.add("parede");
            } else if (mapa[y][x] === ".") {
                celula.classList.add("ponto");
            }

            labirinto.appendChild(celula);
            linhaElementos.push(celula);
        }

        elementosCelulas.push(linhaElementos);
    }
}


// Cria a imagem de um personagem.
function criarImagemPersonagem(arquivo, classe) {
    const imagem = document.createElement("img");

    imagem.src = arquivo;
    imagem.alt = classe === "pacman"
        ? "Pac-Man"
        : "Fantasma";

    imagem.classList.add("personagem", classe);

    imagem.onerror = () => {
        console.error("Imagem não encontrada:", arquivo);
    };

    return imagem;
}


// Atualiza a posição visual dos personagens.
function desenharPersonagens() {
    fantasmas.forEach(fantasma => {
        const celula = obterCelula(
            fantasma.x,
            fantasma.y
        );

        if (fantasma.imagem.parentElement !== celula) {
            celula.appendChild(fantasma.imagem);
        }
    });

    const imagemCorreta = imagensPacman[direcaoAtual];

    if (
        pacman.imagem.getAttribute("src") !== imagemCorreta
    ) {
        pacman.imagem.src = imagemCorreta;
    }

    const celulaPacman = obterCelula(
        pacman.x,
        pacman.y
    );

    if (pacman.imagem.parentElement !== celulaPacman) {
        celulaPacman.appendChild(pacman.imagem);
    }
}


// Procura uma posição livre próxima da posição indicada.
function encontrarCaminhoProximo(x, y) {
    if (caminhoLivre(x, y)) {
        return { x, y };
    }

    for (
        let raio = 1;
        raio < Math.max(COLUNAS, LINHAS);
        raio++
    ) {
        for (let dy = -raio; dy <= raio; dy++) {
            for (let dx = -raio; dx <= raio; dx++) {
                if (caminhoLivre(x + dx, y + dy)) {
                    return {
                        x: x + dx,
                        y: y + dy
                    };
                }
            }
        }
    }

    return { x: 1, y: 1 };
}


// Cria os fantasmas em extremos diferentes do labirinto.
function criarFantasmas() {
    const posicoesIniciais = [
        { x: COLUNAS - 2, y: 1 },
        { x: 1, y: LINHAS - 2 },
        { x: COLUNAS - 2, y: LINHAS - 2 }
    ];

    return imagensFantasmas.map((arquivo, indice) => {
        const posicao = posicoesIniciais[indice];

        const inicio = encontrarCaminhoProximo(
            posicao.x,
            posicao.y
        );

        return {
            x: inicio.x,
            y: inicio.y,
            imagem: criarImagemPersonagem(
                arquivo,
                "fantasma"
            )
        };
    });
}


/* Sistema de bônus das cerejas */

// Cria exatamente duas cerejas em extremos do labirinto.
function criarCerejas() {
    const posicoes = [
        { x: 1, y: 1 },
        { x: COLUNAS - 2, y: 11 }
    ];

    return posicoes.map((posicao, indice) => {
        const inicio = encontrarCaminhoProximo(
            posicao.x,
            posicao.y
        );

        const imagem = document.createElement("img");

        imagem.src = "cereja.png";
        imagem.alt = `Cereja bônus ${indice + 1}`;

        imagem.classList.add(
            "personagem",
            "cereja-bonus"
        );

        imagem.style.width = "82%";
        imagem.style.height = "82%";
        imagem.style.objectFit = "contain";
        imagem.style.zIndex = "3";
        imagem.style.pointerEvents = "none";

        imagem.onerror = () => {
            console.error(
                "Imagem não encontrada: cereja.png"
            );
        };

        return {
            x: inicio.x,
            y: inicio.y,
            imagem,
            ativa: true
        };
    });
}


// Mostra as cerejas ativas nas células correspondentes.
function desenharCerejas() {
    cerejas.forEach(cereja => {
        if (!cereja.ativa) return;

        const celula = obterCelula(
            cereja.x,
            cereja.y
        );

        if (cereja.imagem.parentElement !== celula) {
            celula.appendChild(cereja.imagem);
        }
    });
}


// Ativa ou renova o bônus de fuga por dois segundos.
function ativarBonusFuga() {
    bonusFugaAtivo = true;

    // Se já havia um bônus ativo, reinicia o temporizador.
    clearTimeout(temporizadorFuga);

    elementoMensagem.textContent =
        "Bônus de cereja! Os fantasmas estão fugindo por 2 segundos!";

    temporizadorFuga = setTimeout(() => {
        bonusFugaAtivo = false;
        temporizadorFuga = null;

        if (jogoAtivo) {
            elementoMensagem.textContent =
                "O bônus terminou! Os fantasmas voltaram à perseguição.";
        }
    }, 2000);
}


// Verifica se o Pac-Man alcançou uma cereja.
function verificarColetaCereja() {
    const cerejaColetada = cerejas.find(cereja =>
        cereja.ativa &&
        cereja.x === pacman.x &&
        cereja.y === pacman.y
    );

    if (!cerejaColetada) return;

    cerejaColetada.ativa = false;
    cerejaColetada.imagem.remove();

    ativarBonusFuga();
}


// Calcula a distância real, pelas passagens do labirinto,
// entre o Pac-Man e todas as células alcançáveis.
function calcularDistanciasDoPacman() {
    const distancias = new Map();

    const fila = [{
        x: pacman.x,
        y: pacman.y,
        distancia: 0
    }];

    distancias.set(
        chavePosicao(pacman.x, pacman.y),
        0
    );

    const movimentos = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 }
    ];

    for (
        let indice = 0;
        indice < fila.length;
        indice++
    ) {
        const atual = fila[indice];

        for (const movimento of movimentos) {
            const x = atual.x + movimento.x;
            const y = atual.y + movimento.y;

            const chave = chavePosicao(x, y);

            if (
                !caminhoLivre(x, y) ||
                distancias.has(chave)
            ) {
                continue;
            }

            const distancia = atual.distancia + 1;

            distancias.set(chave, distancia);

            fila.push({
                x,
                y,
                distancia
            });
        }
    }

    return distancias;
}


// Escolhe uma célula vizinha que aumente a distância do fantasma
// em relação ao Pac-Man, respeitando paredes e outros fantasmas.
function encontrarPassoDeFuga(
    fantasma,
    indice,
    posicoesOcupadas,
    destinosReservados,
    distanciasPacman
) {
    const ordensDirecao = [
        [
            { x: 0, y: -1 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 0 }
        ],
        [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 0, y: -1 }
        ],
        [
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: 0, y: -1 },
            { x: -1, y: 0 }
        ]
    ];

    const movimentos =
        ordensDirecao[indice % ordensDirecao.length];

    let melhorPosicao = {
        x: fantasma.x,
        y: fantasma.y
    };

    let maiorDistancia =
        distanciasPacman.get(
            chavePosicao(fantasma.x, fantasma.y)
        ) ?? -1;

    for (const movimento of movimentos) {
        const x = fantasma.x + movimento.x;
        const y = fantasma.y + movimento.y;

        const chave = chavePosicao(x, y);

        if (!caminhoLivre(x, y)) continue;
        if (posicoesOcupadas.has(chave)) continue;
        if (destinosReservados.has(chave)) continue;

        // Durante a fuga, o fantasma não deve avançar
        // para a própria célula do Pac-Man.
        if (x === pacman.x && y === pacman.y) {
            continue;
        }

        const distancia = distanciasPacman.get(chave);

        if (
            distancia !== undefined &&
            distancia > maiorDistancia
        ) {
            maiorDistancia = distancia;

            melhorPosicao = { x, y };
        }
    }

    return melhorPosicao;
}


// Conta os pontos disponíveis.
function contarPontos() {
    return mapa.flat().filter(
        celula => celula === "."
    ).length;
}


// Inicia ou reinicia a partida.
function iniciarJogo() {
    clearInterval(temporizadorFantasmas);
    clearTimeout(temporizadorReinicio);
    clearTimeout(temporizadorFuga);

    pararSomWaka();

    somMorte.pause();
    somMorte.currentTime = 0;

    bonusFugaAtivo = false;
    temporizadorFuga = null;

    mapa = copiarMapa();

    pontuacao = 0;
    totalPontos = contarPontos();

    jogoAtivo = true;
    direcaoAtual = "direita";

    pacman = {
        x: 1,
        y: 7,
        imagem: criarImagemPersonagem(
            imagensPacman.direita,
            "pacman"
        )
    };

    fantasmas = criarFantasmas();
    cerejas = criarCerejas();

    elementoPontuacao.textContent = pontuacao;

    elementoMensagem.textContent =
        "Use as setas do teclado para jogar.";

    desenharLabirinto();
    desenharCerejas();
    desenharPersonagens();

    temporizadorFantasmas = setInterval(
        moverFantasmas,
        VELOCIDADE_FANTASMA
    );
}


// Converte uma direção em deslocamento.
function deslocamentoDaDirecao(direcao) {
    const deslocamentos = {
        direita: { x: 1, y: 0 },
        esquerda: { x: -1, y: 0 },
        baixo: { x: 0, y: 1 },
        cima: { x: 0, y: -1 }
    };

    return deslocamentos[direcao];
}


// Controla o Pac-Man pelas setas do teclado.
document.addEventListener("keydown", evento => {
    const direcoes = {
        ArrowRight: "direita",
        ArrowLeft: "esquerda",
        ArrowDown: "baixo",
        ArrowUp: "cima"
    };

    if (!direcoes[evento.key]) return;

    evento.preventDefault();

    if (evento.repeat || !jogoAtivo) return;

    moverPacman(direcoes[evento.key]);
});


// Move o Pac-Man uma célula por pressionamento.
function moverPacman(direcao) {
    if (!jogoAtivo) return;

    direcaoAtual = direcao;

    const deslocamento = deslocamentoDaDirecao(direcao);

    const novoX = pacman.x + deslocamento.x;
    const novoY = pacman.y + deslocamento.y;

    if (caminhoLivre(novoX, novoY)) {
        pacman.x = novoX;
        pacman.y = novoY;
    }

    let coletouPonto = false;

    if (mapa[pacman.y][pacman.x] === ".") {
        mapa[pacman.y][pacman.x] = " ";

        pontuacao += 10;

        elementoPontuacao.textContent = pontuacao;

        obterCelula(pacman.x, pacman.y)
            .classList.remove("ponto");

        coletouPonto = true;
    }

    // Mantém o som de pontuação sincronizado com a coleta.
    if (coletouPonto) {
        tocarSomWaka();
    } else {
        pararSomWaka();
    }

    // A cereja é coletada antes da verificação de colisão,
    // para que o bônus proteja o Pac-Man imediatamente.
    verificarColetaCereja();

    desenharCerejas();
    desenharPersonagens();

    verificarColisao();

    if (!jogoAtivo) return;

    if (pontuacao >= totalPontos * 10) {
        finalizarJogo(true);
    }
}


// Converte coordenadas em uma chave única.
function chavePosicao(x, y) {
    return `${x},${y}`;
}


// Encontra uma rota até o Pac-Man usando busca por custo.
// As rotas já escolhidas recebem penalidades para incentivar
// os fantasmas seguintes a utilizarem caminhos alternativos.
function encontrarRotaFantasma(
    fantasma,
    indice,
    posicoesOcupadas,
    penalidadesRota,
    destinosReservados
) {
    const inicio = {
        x: fantasma.x,
        y: fantasma.y
    };

    const destino = {
        x: pacman.x,
        y: pacman.y
    };

    const chaveInicio = chavePosicao(
        inicio.x,
        inicio.y
    );

    const chaveDestino = chavePosicao(
        destino.x,
        destino.y
    );

    // Cada fantasma tem uma preferência de direção diferente.
    const conjuntosDirecoes = [
        [
            { x: 0, y: -1 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 0 }
        ],
        [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 0, y: -1 }
        ],
        [
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: 0, y: -1 },
            { x: -1, y: 0 }
        ]
    ];

    const movimentos =
        conjuntosDirecoes[indice % conjuntosDirecoes.length];

    const distancias = new Map([
        [chaveInicio, 0]
    ]);

    const anteriores = new Map();
    const visitados = new Set();

    const fila = [{
        x: inicio.x,
        y: inicio.y,
        custo: 0
    }];

    while (fila.length > 0) {
        fila.sort((a, b) => a.custo - b.custo);

        const atual = fila.shift();

        const chaveAtual = chavePosicao(
            atual.x,
            atual.y
        );

        if (visitados.has(chaveAtual)) continue;

        visitados.add(chaveAtual);

        if (chaveAtual === chaveDestino) break;

        for (const movimento of movimentos) {
            const x = atual.x + movimento.x;
            const y = atual.y + movimento.y;

            const chave = chavePosicao(x, y);

            if (!caminhoLivre(x, y)) continue;
            if (visitados.has(chave)) continue;

            // Não atravessa a posição atual de outro fantasma.
            if (
                chave !== chaveDestino &&
                posicoesOcupadas.has(chave)
            ) {
                continue;
            }

            // Evita escolher o destino já reservado por outro fantasma.
            if (
                chave !== chaveDestino &&
                destinosReservados.has(chave)
            ) {
                continue;
            }

            // Células usadas em outras rotas ficam menos atraentes.
            const penalidade =
                penalidadesRota.get(chave) || 0;

            const novoCusto =
                atual.custo + 1 + penalidade;

            if (
                !distancias.has(chave) ||
                novoCusto < distancias.get(chave)
            ) {
                distancias.set(chave, novoCusto);

                anteriores.set(chave, chaveAtual);

                fila.push({
                    x,
                    y,
                    custo: novoCusto
                });
            }
        }
    }

    if (!distancias.has(chaveDestino)) {
        return [];
    }

    // Reconstrói a rota encontrada.
    const rota = [];

    let chaveAtual = chaveDestino;

    while (chaveAtual !== chaveInicio) {
        const [x, y] = chaveAtual
            .split(",")
            .map(Number);

        rota.unshift({ x, y });

        chaveAtual = anteriores.get(chaveAtual);

        if (chaveAtual === undefined) {
            return [];
        }
    }

    return rota;
}


// Planeja e executa o movimento dos três fantasmas.
function moverFantasmas() {
    if (!jogoAtivo) return;

    const posicoesOcupadas = new Set(
        fantasmas.map(fantasma =>
            chavePosicao(fantasma.x, fantasma.y)
        )
    );

    const penalidadesRota = new Map();
    const destinosReservados = new Set();
    const movimentosPlanejados = [];

    const distanciasFuga = bonusFugaAtivo
        ? calcularDistanciasDoPacman()
        : null;

    // Planeja cada movimento antes de alterar as posições.
    fantasmas.forEach((fantasma, indice) => {
        const ocupadasDosOutros = new Set(
            posicoesOcupadas
        );

        ocupadasDosOutros.delete(
            chavePosicao(fantasma.x, fantasma.y)
        );

        const rota = bonusFugaAtivo
            ? []
            : encontrarRotaFantasma(
                fantasma,
                indice,
                ocupadasDosOutros,
                penalidadesRota,
                destinosReservados
            );

        // Durante o bônus, cada fantasma procura aumentar
        // a distância em relação ao Pac-Man.
        // Fora do bônus, usa a IA de perseguição.
        const proximaPosicao = bonusFugaAtivo
            ? encontrarPassoDeFuga(
                fantasma,
                indice,
                ocupadasDosOutros,
                destinosReservados,
                distanciasFuga
            )
            : (
                rota.length > 0
                    ? rota[0]
                    : {
                        x: fantasma.x,
                        y: fantasma.y
                    }
            );

        movimentosPlanejados.push({
            fantasma,
            x: proximaPosicao.x,
            y: proximaPosicao.y
        });

        const chaveDestino = chavePosicao(
            proximaPosicao.x,
            proximaPosicao.y
        );

        // O destino do Pac-Man não é reservado.
        if (
            proximaPosicao.x !== pacman.x ||
            proximaPosicao.y !== pacman.y
        ) {
            destinosReservados.add(chaveDestino);
        }

        // Penaliza as células da rota para diversificar os caminhos.
        rota.forEach(posicao => {
            if (
                posicao.x === pacman.x &&
                posicao.y === pacman.y
            ) {
                return;
            }

            const chave = chavePosicao(
                posicao.x,
                posicao.y
            );

            penalidadesRota.set(
                chave,
                (penalidadesRota.get(chave) || 0) + 5
            );
        });
    });

    // Evita que dois fantasmas ocupem o mesmo destino.
    const destinosAplicados = new Set();

    for (const movimento of movimentosPlanejados) {
        const chaveDestino = chavePosicao(
            movimento.x,
            movimento.y
        );

        const vaiColidirComPacman =
            movimento.x === pacman.x &&
            movimento.y === pacman.y;

        if (
            !vaiColidirComPacman &&
            destinosAplicados.has(chaveDestino)
        ) {
            continue;
        }

        if (!vaiColidirComPacman) {
            destinosAplicados.add(chaveDestino);
        }

        movimento.fantasma.x = movimento.x;
        movimento.fantasma.y = movimento.y;
    }

    desenharPersonagens();

    verificarColisao();
}


// Verifica se algum fantasma alcançou o Pac-Man.
function verificarColisao() {
    if (!jogoAtivo) return;

    // Durante o bônus, o Pac-Man fica protegido contra captura.
    if (bonusFugaAtivo) return;

    const houveColisao = fantasmas.some(fantasma =>
        fantasma.x === pacman.x &&
        fantasma.y === pacman.y
    );

    if (houveColisao) {
        finalizarJogo(false);
    }
}


// Encerra a partida por vitória ou colisão.
function finalizarJogo(venceu) {
    if (!jogoAtivo) return;

    jogoAtivo = false;

    clearInterval(temporizadorFantasmas);
    clearTimeout(temporizadorFuga);

    temporizadorFuga = null;
    bonusFugaAtivo = false;

    pararSomWaka();

    if (venceu) {
        elementoMensagem.textContent =
            "Você venceu! Todos os pontos foram coletados!";
    } else {
        tocarSomMorte();

        elementoMensagem.textContent =
            "Um fantasma alcançou o Pac-Man! Reiniciando o jogo...";

        temporizadorReinicio = setTimeout(
            iniciarJogo,
            1200
        );
    }
}


// O botão permite reiniciar a partida.
botaoReiniciar.addEventListener(
    "click",
    iniciarJogo
);


// Inicia a primeira partida.
iniciarJogo();