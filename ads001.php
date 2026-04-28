<?php
// Configurações de Banco de Dados
$host = 'localhost';
$user = 'root';
$pass = '';
$db   = 'quiz_db';

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die("Erro de conexão: " . $conn->connect_error);
}

// Inicialização do Banco
$conn->query("CREATE DATABASE IF NOT EXISTS $db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
$conn->select_db($db);
$conn->query("CREATE TABLE IF NOT EXISTS resultados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    pontos INT NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// ===================== PERGUNTAS - ANÁLISE E DESENVOLVIMENTO DE SISTEMAS =====================
$perguntas = [
    // 1. Ler Nome, Idade e Nota
    ["q" => "Em Portugol, qual comando é usado para ler dados do usuário?", 
     "o" => ["escreva()", "leia()", "imprima()", "input()"], "c" => 1],

    ["q" => "Qual é a sintaxe correta para declarar variáveis em Portugol?", 
     "o" => ["var nome: texto", "nome <- ''", "declare nome como texto", "texto nome"], "c" => 0],

    ["q" => "Para ler nome, idade e nota de um aluno, qual sequência de comandos é mais adequada?", 
     "o" => ["leia(nome, idade, nota)", "leia(nome)\nleia(idade)\nleia(nota)", "escreva(nome, idade, nota)", "ler(nome idade nota)"], "c" => 1],

    // 2. Área do Triângulo
    ["q" => "Qual é a fórmula correta para calcular a área de um triângulo em Portugol?", 
     "o" => ["area = base * altura", "area = (base * altura) / 2", "area = base + altura / 2", "area = base ^ altura"], "c" => 1],

    ["q" => "Qual tipo de variável é mais adequado para armazenar a área de um triângulo?", 
     "o" => ["inteiro", "caracter", "real", "logico"], "c" => 2],

    // 3. Par ou Ímpar
    ["q" => "Qual operador é usado para verificar se um número é par em Portugol?", 
     "o" => ["% 2 == 0", "% 2 != 0", "/ 2 == 0", "mod 2 = 1"], "c" => 0],

    ["q" => "Qual estrutura condicional é mais indicada para verificar se um número é par ou ímpar?", 
     "o" => ["enquanto", "se...entao...senao", "para", "escolha"], "c" => 1],

    ["q" => "Em Portugol, o operador de módulo é representado por:", 
     "o" => ["mod", "%", "resto", "Todos os anteriores estão corretos dependendo da implementação"], "c" => 3],

    // 4. Programa de Login
    ["q" => "Qual estrutura é mais adequada para fazer verificação de usuário e senha?", 
     "o" => ["se (usuario = 'admin' e senha = '123')", "enquanto usuario errado", "para i de 1 ate 3", "escolha caso"], "c" => 0],

    ["q" => "Para limitar tentativas de login, qual laço é mais apropriado?", 
     "o" => ["enquanto", "para", "faca...enquanto", "Todos podem ser usados"], "c" => 3],

    ["q" => "Qual operador lógico deve ser usado para verificar usuário E senha corretos?", 
     "o" => ["ou", "e", "não", "xor"], "c" => 1],

    // 5. Somar 5 números
    ["q" => "Qual laço de repetição é mais adequado para somar 5 números fixos?", 
     "o" => ["enquanto", "faca...enquanto", "para", "se"], "c" => 2],

    ["q" => "Qual variável é essencial para acumular a soma dos números?", 
     "o" => ["contador", "soma", "media", "total"], "c" => 1],

    ["q" => "Se você quiser somar 5 números digitados pelo usuário, qual abordagem é melhor?", 
     "o" => ["Repetir leia() 5 vezes manualmente", "Usar um laço 'para' de 1 até 5", "Usar enquanto com contador", "Ambas 2 e 3 estão corretas"], "c" => 3],

    // Perguntas gerais de Portugol
    ["q" => "Em Portugol, o comando para exibir mensagem na tela é:", 
     "o" => ["leia()", "escreva()", "imprime()", "mostre()"], "c" => 1],

    ["q" => "Qual símbolo é usado para atribuição de valor em Portugol?", 
     "o" => ["=", "<-", "=>", "=="], "c" => 1],

    ["q" => "O tipo 'logico' em Portugol aceita quais valores?", 
     "o" => ["0 e 1", "sim e não", "verdadeiro e falso", "true e false"], "c" => 2],

    ["q" => "Qual das opções abaixo é um comentário em Portugol?", 
     "o" => ["// comentário", "/* comentário */", "// ou /* */", "Todos os acima"], "c" => 3],

    ["q" => "Para declarar uma variável do tipo texto em Portugol, usamos:", 
     "o" => ["cadeia", "string", "texto", "caractere"], "c" => 0],

    ["q" => "Qual é a estrutura correta de um programa básico em Portugol?", 
     "o" => ["algoritmo ... inicio ... fim", "programa ... begin ... end", "main() {...}", "inicio ... fim"], "c" => 0],

    ["q" => "O que significa o operador '<-' em Portugol?", 
     "o" => ["Comparação", "Atribuição", "Subtração", "Menor que"], "c" => 1]
];

session_start();

if (!isset($_SESSION['perguntas_sorteadas'])) {
    shuffle($perguntas);
    $_SESSION['perguntas_sorteadas'] = $perguntas;
}
$perguntas_sessao = $_SESSION['perguntas_sorteadas'];

$nome = $_POST['nome'] ?? '';
$acao = $_POST['acao'] ?? '';
$erro_nome = '';
$mensagem = '';

// Verifica nome duplicado
if ($acao === 'iniciar' && !empty($nome)) {
    $nome_limpo = trim($nome);
    $check = $conn->prepare("SELECT id FROM resultados WHERE nome = ? LIMIT 1");
    $check->bind_param("s", $nome_limpo);
    $check->execute();
    $result_check = $check->get_result();

    if ($result_check->num_rows > 0) {
        $erro_nome = "Este nome já registrou uma pontuação. Use um nome diferente!";
    } else {
        $_SESSION['quiz_nome'] = $nome_limpo;
        $_SESSION['quiz_atual'] = 0;
        $_SESSION['quiz_pontos'] = 0;
        $_SESSION['quiz_device'] = bin2hex(random_bytes(16));
    }
}

if ($acao === 'responder' && isset($_SESSION['quiz_atual'])) {
    $resposta = (int)$_POST['resposta'];
    $atual = $_SESSION['quiz_atual'];
    if ($resposta === $perguntas_sessao[$atual]['c']) {
        $_SESSION['quiz_pontos']++;
    }
    $_SESSION['quiz_atual']++;
}

if ($acao === 'salvar' && isset($_SESSION['quiz_nome'])) {
    $stmt = $conn->prepare("INSERT INTO resultados (nome, pontos, device_id) VALUES (?, ?, ?)");
    $stmt->bind_param("sis", $_SESSION['quiz_nome'], $_SESSION['quiz_pontos'], $_SESSION['quiz_device']);
    $stmt->execute();
    $mensagem = "✅ Resultado salvo com sucesso!";
    unset($_SESSION['quiz_nome'], $_SESSION['quiz_atual'], $_SESSION['quiz_pontos'], $_SESSION['perguntas_sorteadas']);
}
?>

<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quiz Portugol • ADS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .ranking-card { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(10px); }
    </style>
</head>
<body class="bg-gradient-to-br from-slate-950 via-indigo-950 to-black text-white min-h-screen">

<div class="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
    
    <div class="lg:col-span-3">
        <?php if (!isset($_SESSION['quiz_nome']) && $acao !== 'salvar'): ?>
            <div class="min-h-[60vh] flex items-center justify-center">
                <div class="text-center bg-slate-900/80 border border-indigo-500/30 rounded-3xl p-10 max-w-md w-full shadow-2xl">
                    <i class="fa-solid fa-laptop-code text-7xl text-indigo-400 mb-6"></i>
                    <h1 class="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-8">
                        Lógica de Programação<br><span class="text-2xl">Portugol</span>
                    </h1>
                    
                    <?php if ($erro_nome): ?>
                        <div class="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-xl mb-6 text-sm">
                            <i class="fa-solid fa-triangle-exclamation mr-2"></i> <?= $erro_nome ?>
                        </div>
                    <?php endif; ?>

                    <form method="POST" class="space-y-6">
                        <input type="hidden" name="acao" value="iniciar">
                        <input type="text" name="nome" required placeholder="Seu Nome (único)" 
                               value="<?= htmlspecialchars($nome) ?>"
                               class="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-5 text-lg focus:outline-none focus:border-indigo-500 transition">
                        <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 py-6 rounded-2xl text-xl font-semibold transition-all">
                            INICIAR QUIZ
                        </button>
                    </form>
                    <p class="text-slate-400 text-sm mt-6">20 perguntas • Turma ADS</p>
                </div>
            </div>

        <?php elseif (isset($_SESSION['quiz_atual']) && $_SESSION['quiz_atual'] < count($perguntas_sessao)): ?>
            <?php 
                $atual = $_SESSION['quiz_atual'];
                $p = $perguntas_sessao[$atual];
                $progresso = round(($atual / count($perguntas_sessao)) * 100);
            ?>
            <div class="bg-slate-900/90 border border-slate-700 rounded-3xl p-8 md:p-10 shadow-2xl">
                <div class="flex justify-between items-center mb-6">
                    <span class="text-indigo-400 font-mono">Questão <?= $atual + 1 ?> de <?= count($perguntas_sessao) ?></span>
                    <div class="px-4 py-2 bg-indigo-500/20 rounded-full text-indigo-300 font-bold">
                        Pontuação: <span id="placar-vivo-topo"><?= $_SESSION['quiz_pontos'] ?></span>
                    </div>
                </div>
                <div class="h-2 bg-slate-800 rounded-full mb-10 overflow-hidden">
                    <div class="h-full bg-indigo-500 transition-all duration-500" style="width: <?= $progresso ?>%"></div>
                </div>
                <h2 class="text-2xl md:text-3xl font-semibold mb-10"><?= htmlspecialchars($p['q']) ?></h2>
                
                <form method="POST" class="grid gap-4">
                    <input type="hidden" name="acao" value="responder">
                    <?php foreach ($p['o'] as $i => $opcao): ?>
                        <button type="submit" name="resposta" value="<?= $i ?>" 
                                class="group flex items-center gap-4 bg-slate-800/50 hover:bg-indigo-900/40 border border-slate-700 hover:border-indigo-500 p-6 rounded-2xl text-left transition-all">
                            <span class="w-10 h-10 flex items-center justify-center bg-slate-700 group-hover:bg-indigo-600 rounded-xl font-mono"><?= chr(65 + $i) ?></span>
                            <span><?= htmlspecialchars($opcao) ?></span>
                        </button>
                    <?php endforeach; ?>
                </form>
            </div>

        <?php else: ?>
            <div class="text-center bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-12 max-w-lg mx-auto shadow-2xl">
                <h2 class="text-3xl font-bold mb-4">Quiz Concluído!</h2>
                <div class="text-8xl font-black text-indigo-400 my-8">
                    <?= $_SESSION['quiz_pontos'] ?? 0 ?> / <?= count($perguntas_sessao) ?>
                </div>
                <?php if ($mensagem) echo "<p class='text-cyan-400 mb-6'>$mensagem</p>"; ?>
                
                <form method="POST" class="flex flex-col gap-4">
                    <input type="hidden" name="acao" value="salvar">
                    <button type="submit" class="bg-indigo-600 py-4 rounded-2xl font-bold hover:bg-indigo-500 transition-colors">
                        SALVAR NO RANKING
                    </button>
                    <a href="programacao.php" class="bg-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-600 transition-colors">
                        VOLTAR AO INÍCIO
                    </a>
                </form>
            </div>
        <?php endif; ?>
    </div>

    <!-- Sidebar Ranking -->
    <div class="lg:col-span-1">
        <div class="sticky top-8 space-y-6">
            <div class="ranking-card border border-indigo-500/50 p-6 rounded-3xl text-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                <h3 class="text-gray-400 uppercase text-xs font-bold tracking-widest mb-2">Sua Pontuação</h3>
                <div id="meu-placar-realtime" class="text-5xl font-black text-indigo-400">
                    <?= $_SESSION['quiz_pontos'] ?? 0 ?>
                </div>
                <p class="text-slate-500 text-sm mt-2"><?= $_SESSION['quiz_nome'] ?? 'Aguardando...' ?></p>
            </div>

            <div class="ranking-card border border-slate-700 p-6 rounded-3xl shadow-xl">
                <div class="flex items-center gap-3 mb-6">
                    <i class="fa-solid fa-trophy text-yellow-500"></i>
                    <h3 class="font-bold text-lg">Top 5 - Portugol</h3>
                </div>
                <div id="lista-ranking" class="space-y-4">
                    <p class="text-slate-500 text-sm">Carregando ranking...</p>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
function atualizarRanking() {
    fetch('programacao.php?get_ranking=1')
        .then(response => response.json())
        .then(data => {
            const meuPlacar = document.getElementById('meu-placar-realtime');
            const placarTopo = document.getElementById('placar-vivo-topo');
            if(meuPlacar) meuPlacar.innerText = data.meu;
            if(placarTopo) placarTopo.innerText = data.meu;

            const lista = document.getElementById('lista-ranking');
            if (data.top.length === 0) {
                lista.innerHTML = '<p class="text-slate-500 text-sm italic">Nenhum recorde ainda.</p>';
                return;
            }

            let html = '';
            data.top.forEach((user, index) => {
                const cores = ['text-yellow-400', 'text-slate-300', 'text-orange-400', 'text-slate-400', 'text-slate-400'];
                html += `
                    <div class="flex justify-between items-center bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
                        <div class="flex items-center gap-3">
                            <span class="font-mono font-bold ${cores[index] || 'text-slate-500'}">#${index + 1}</span>
                            <span class="text-sm font-medium truncate">${user.nome}</span>
                        </div>
                        <span class="bg-indigo-900/50 px-3 py-1 rounded text-xs font-bold text-indigo-300">${user.pontos} pts</span>
                    </div>
                `;
            });
            lista.innerHTML = html;
        });
}

setInterval(atualizarRanking, 1500);
atualizarRanking();

<?php if (isset($_SESSION['quiz_pontos']) && $_SESSION['quiz_pontos'] >= 15): ?>
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
<?php endif; ?>
</script>

</body>
</html>
<?php $conn->close(); ?>