<?php
// api/save_score.php
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/../db.php'; // ajustar ruta si es necesario

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;
$name = isset($input['name']) ? trim($input['name']) : '';
$score = isset($input['score']) ? intval($input['score']) : null;

if (!$name || $score === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Parámetros faltantes']);
    exit;
}

try {
    // obtener puntaje actual
    $stmt = $pdo->prepare('SELECT puntaje FROM puntaje WHERE usuario = ?');
    $stmt->execute([$name]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Usuario no registrado']);
        exit;
    }

    $current = intval($row['puntaje']);

    // comportamiento:
    // - si current === -1 (sin puntaje), registramos la nueva puntuación
    // - si ya tiene puntaje, solo actualizamos si la nueva puntuación es mayor
    if ($current === -1) {
        $upd = $pdo->prepare('UPDATE puntaje SET puntaje = ?, fecha = NOW() WHERE usuario = ?');
        $upd->execute([$score, $name]);
        echo json_encode(['success' => true, 'saved' => true, 'message' => 'Puntaje guardado', 'puntaje' => $score]);
        exit;
    } else {
        if ($score > $current) {
            $upd = $pdo->prepare('UPDATE puntaje SET puntaje = ?, fecha = NOW() WHERE usuario = ?');
            $upd->execute([$score, $name]);
            echo json_encode(['success' => true, 'saved' => true, 'message' => 'Puntaje actualizado', 'puntaje' => $score]);
            exit;
        } else {
            echo json_encode(['success' => true, 'saved' => false, 'message' => 'No se actualiza: puntaje no supera el actual', 'puntaje_actual' => $current]);
            exit;
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor', 'error' => $e->getMessage()]);
    exit;
}
