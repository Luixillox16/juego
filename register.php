<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;
$name = isset($input['name']) ? trim($input['name']) : '';

if (!$name) { echo json_encode(['success'=>false,'message'=>'Nombre requerido']); exit; }
if (!preg_match('/^[A-Za-z0-9_\-]{3,16}$/', $name)) {
    echo json_encode(['success'=>false,'message'=>'Nombre inválido']); exit;
}

try {
    $stmt = $pdo->prepare('SELECT usuario FROM puntaje WHERE usuario = ?');
    $stmt->execute([$name]);
    if ($stmt->fetch()) {
        echo json_encode(['success'=>true,'message'=>'Usuario ya registrado','registered'=>true]);
        exit;
    }
    $ins = $pdo->prepare('INSERT INTO puntaje (usuario, puntaje) VALUES (?, ?)');
    $ins->execute([$name, -1]);
    echo json_encode(['success'=>true,'message'=>'Registro creado','registered'=>true]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Error del servidor']);
    exit;
}