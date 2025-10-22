<?php
// api/get_leaderboard.php
header('Content-Type: application/json; charset=utf-8');
// Para depuración local puedes activar display_errors = 1, pero ponlo 0 en producción:
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Intentamos localizar db.php en varias rutas relativas comunes
$candidates = [
    __DIR__ . '/../db.php',        // carpeta padre (esperado)
    __DIR__ . '/db.php',          // mismo directorio api/
    __DIR__ . '/../../db.php',    // dos niveles arriba
    __DIR__ . '/../../config/db.php', // posible carpeta config
];

$included = false;
$tried = [];
foreach ($candidates as $c) {
    $tried[] = $c;
    if (file_exists($c)) {
        require_once $c;
        $included = true;
        break;
    }
}

if (!$included) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo localizar db.php. Rutas intentadas (relativas al script):',
        'tried_paths' => $tried,
        'hint' => 'Coloca db.php en el directorio superior del proyecto o ajusta la ruta en este archivo.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ahora $pdo debería estar disponible desde db.php
if (!isset($pdo) || !$pdo) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'db.php cargado pero $pdo no está definido'], JSON_UNESCAPED_UNICODE);
    exit;
}

// limitar y validar parámetro limit
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
if ($limit <= 0) $limit = 50;
if ($limit > 500) $limit = 500;

try {
    $sql = "SELECT usuario, puntaje, fecha FROM puntaje WHERE puntaje IS NOT NULL AND puntaje <> -1 ORDER BY puntaje DESC, fecha ASC LIMIT :lim";
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        if (!empty($r['fecha'])) {
            $ts = strtotime($r['fecha']);
            $r['fecha'] = $ts !== false ? date('c', $ts) : $r['fecha'];
        } else {
            $r['fecha'] = null;
        }
        $r['puntaje'] = isset($r['puntaje']) ? intval($r['puntaje']) : null;
        $r['usuario'] = isset($r['usuario']) ? $r['usuario'] : '';
    }

    echo json_encode(['success' => true, 'data' => $rows], JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al consultar la BD', 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}
