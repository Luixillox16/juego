<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';
$name = isset($_GET['name']) ? trim($_GET['name']) : '';
if (!$name) { echo json_encode(['success'=>false,'message'=>'name missing']); exit; }
try {
  $stmt = $pdo->prepare('SELECT usuario FROM puntaje WHERE usuario = ?');
  $stmt->execute([$name]);
  $row = $stmt->fetch();
  echo json_encode(['success'=>true,'registered'=> (bool)$row]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'server error']);
}
