<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;
$name = isset($input['name']) ? trim($input['name']) : '';
$score = isset($input['score']) ? intval($input['score']) : null;

if (!$name || $score === null) { echo json_encode(['success'=>false,'message'=>'Parámetros faltantes']); exit; }

try {
    $stmt = $pdo->prepare('SELECT puntaje FROM puntaje WHERE usuario = ?');
    $stmt->execute([$name]);
    $row = $stmt->fetch();
    if (!$row) { echo json_encode(['success'=>false,'message'=>'Usuario no registrado']); exit; }
    $current = intval($row['puntaje']);
    if ($current !== -1) {
        echo json_encode(['success'=>false,'message'=>'Ya existe puntaje registrado','saved'=>false]);
        exit;
    }
    $upd = $pdo->prepare('UPDATE puntaje SET puntaje = ?, fecha = NOW() WHERE usuario = ? AND puntaje = ?');
    $upd->execute([$score, $name, -1]);
    if ($upd->rowCount() > 0) {
        echo json_encode(['success'=>true,'message'=>'Puntaje guardado','saved'=>true]);
    } else {
        echo json_encode(['success'=>false,'message'=>'No se pudo guardar','saved'=>false]);
    }
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Error del servidor']);
    exit;
}