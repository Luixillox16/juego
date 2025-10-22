<?php
// api/register.php
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 0); // 0 en producción; 1 para debug en local

require_once __DIR__ . '/../db.php'; // ajustar ruta según dónde lo coloques

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) $input = $_POST;
$name = isset($input['name']) ? trim($input['name']) : '';

if (!$name) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nombre requerido']);
    exit;
}

// validación simple: letras, números, guion y guion bajo, 3-16 chars
if (!preg_match('/^[A-Za-z0-9_\-]{3,16}$/', $name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nombre inválido']);
    exit;
}

try {
    // comprobar si ya existe
    $stmt = $pdo->prepare('SELECT usuario FROM puntaje WHERE usuario = ?');
    $stmt->execute([$name]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => true, 'message' => 'Usuario ya registrado', 'registered' => true]);
        exit;
    }

    // insertar nuevo usuario con puntaje -1 (sin puntuación aún)
    $ins = $pdo->prepare('INSERT INTO puntaje (usuario, puntaje, fecha) VALUES (?, ?, NULL)');
    $ins->execute([$name, -1]);

    echo json_encode(['success' => true, 'message' => 'Usuario registrado correctamente', 'registered' => true]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor', 'error' => $e->getMessage()]);
    exit;
}
