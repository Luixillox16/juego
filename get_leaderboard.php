<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
$limit = max(1, min(200, $limit));
try {
    $stmt = $pdo->prepare('SELECT usuario AS name, puntaje AS score, fecha FROM puntaje WHERE puntaje IS NOT NULL AND puntaje != -1 ORDER BY puntaje DESC LIMIT ?');
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();
    echo json_encode(['success'=>true,'data'=>$rows]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Error del servidor']);
    exit;
}