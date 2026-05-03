<?php
// Configurações de conexão
$host = "localhost";
$user = "root";
$pass = "";
$db_name = isset($_POST['db_name']) ? $_POST['db_name'] : '';

$conn = null;
$resultado = null;
$erro = null;

// Tenta conectar se um banco for selecionado
if (!empty($db_name)) {
    $conn = new mysqli($host, $user, $pass, $db_name);
    if ($conn->connect_error) {
        $erro = "Falha na conexão: " . $conn->connect_error;
    }
}

// Executa o comando SQL
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['sql_command']) && $conn) {
    $sql = $_POST['sql_command'];
    
    // Executa a query
    $resultado = $conn->query($sql);
    
    if (!$resultado) {
        $erro = "Erro no MySQL: " . $conn->error;
    }
}
?>

<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>Terminal SQL Acadêmico</title>
    <style>
        :root {
            --neon-cyan: #00f2ff;
            --neon-magenta: #bc13fe;
            --terminal-black: #121212;
        }

        body {
            background-color: #080808;
            color: #e0e0e0;
            font-family: 'Courier New', Courier, monospace;
            padding: 20px;
        }

        .terminal-container {
            max-width: 1000px;
            margin: 0 auto;
            border: 2px solid #333;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
        }

        .terminal-header {
            background: #222;
            padding: 10px;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
        }

        .status-dot {
            height: 12px; width: 12px; border-radius: 50%; display: inline-block;
        }

        textarea {
            width: 100%;
            height: 150px;
            background: var(--terminal-black);
            color: var(--neon-cyan);
            border: none;
            padding: 15px;
            font-size: 16px;
            resize: vertical;
            outline: none;
        }

        .btn-run {
            background: var(--neon-magenta);
            color: white;
            border: none;
            padding: 10px 25px;
            cursor: pointer;
            font-weight: bold;
            float: right;
            margin: 10px;
            border-radius: 4px;
        }

        .output {
            background: #1a1a1a;
            padding: 20px;
            border-top: 1px solid #333;
            min-height: 100px;
            clear: both;
        }

        .error { color: #ff5555; background: #331111; padding: 10px; border-radius: 4px; }
        .success { color: #55ff55; }

        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #444; padding: 8px; text-align: left; }
        th { background: #333; color: var(--neon-cyan); }
    </style>
</head>
<body>

<div class="terminal-container">
    <form method="POST">
        <div class="terminal-header">
            <span>SQL Terminal v1.0</span>
            <div>
                <label>Banco:</label>
                <select name="db_name" required>
                    <option value="">Selecione...</option>
                    <?php
                    $temp_conn = new mysqli($host, $user, $pass);
                    $dbs = $temp_conn->query("SHOW DATABASES");
                    while($row = $dbs->fetch_array()) {
                        if(!in_array($row[0], ['information_schema', 'performance_schema', 'mysql', 'phpmyadmin'])) {
                            $sel = ($db_name == $row[0]) ? 'selected' : '';
                            echo "<option value='{$row[0]}' $sel>{$row[0]}</option>";
                        }
                    }
                    ?>
                </select>
            </div>
        </div>

        <textarea name="sql_command" placeholder="Digite seu comando SQL aqui... (Ex: SELECT * FROM alunos)"><?php echo isset($_POST['sql_command']) ? $_POST['sql_command'] : ''; ?></textarea>
        
        <button type="submit" class="btn-run">EXECUTAR COMANDO (_>)</button>
    </form>

    <div class="output">
        <?php if ($erro): ?>
            <div class="error">> <?php echo $erro; ?></div>
        <?php elseif ($resultado === true): ?>
            <div class="success">> Comando executado com sucesso! Linhas afetadas: <?php echo $conn->affected_rows; ?></div>
        <?php elseif ($resultado instanceof mysqli_result): ?>
            <div class="success">> <?php echo $resultado->num_rows; ?> registros encontrados:</div>
            <table>
                <thead>
                    <tr>
                        <?php while($f = $resultado->fetch_field()) echo "<th>{$f->name}</th>"; ?>
                    </tr>
                </thead>
                <tbody>
                    <?php while($row = $resultado->fetch_assoc()): ?>
                        <tr>
                            <?php foreach($row as $v) echo "<td>".htmlspecialchars($v)."</td>"; ?>
                        </tr>
                    <?php endwhile; ?>
                </tbody>
            </table>
        <?php else: ?>
            <span style="color: #666;">Aguardando comando...</span>
        <?php endif; ?>
    </div>
</div>

</body>
</html>