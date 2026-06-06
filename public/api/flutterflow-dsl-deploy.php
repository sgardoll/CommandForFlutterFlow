<?php

declare(strict_types=1);

require_once __DIR__ . '/proxy-utils.php';

function ccc_json_response(int $statusCode, array $payload): void {
  http_response_code($statusCode);
  header('Content-Type: application/json');
  echo json_encode($payload);
  exit;
}

function ccc_read_json_body(): array {
  $raw = file_get_contents('php://input');
  $decoded = json_decode($raw ?: '', true);
  if (!is_array($decoded)) {
    ccc_json_error(400, 'Request body must be JSON.');
  }
  return $decoded;
}

function ccc_string_field(array $source, string $key, int $maxLength, bool $required = true): string {
  $value = $source[$key] ?? '';
  if (!is_string($value)) {
    ccc_json_error(400, $key . ' must be a string.');
  }
  $value = trim($value);
  if ($required && $value === '') {
    ccc_json_error(400, 'Missing ' . $key . '.');
  }
  if (strlen($value) > $maxLength) {
    ccc_json_error(400, $key . ' is too long.');
  }
  return $value;
}

function ccc_shell_arg_array(array $args): string {
  return implode(' ', array_map('escapeshellarg', $args));
}

function ccc_run_command(array $args, string $cwd, array $env, int $timeoutSeconds = 180): array {
  $command = ccc_shell_arg_array($args);
  $descriptorSpec = [
    0 => ['pipe', 'r'],
    1 => ['pipe', 'w'],
    2 => ['pipe', 'w'],
  ];

  $process = proc_open($command, $descriptorSpec, $pipes, $cwd, $env);
  if (!is_resource($process)) {
    ccc_json_error(500, 'Failed to start FlutterFlow AI command.');
  }

  fclose($pipes[0]);
  stream_set_blocking($pipes[1], false);
  stream_set_blocking($pipes[2], false);

  $stdout = '';
  $stderr = '';
  $startedAt = time();
  $timedOut = false;

  while (true) {
    $status = proc_get_status($process);
    $stdout .= stream_get_contents($pipes[1]) ?: '';
    $stderr .= stream_get_contents($pipes[2]) ?: '';

    if (!$status['running']) break;
    if (time() - $startedAt > $timeoutSeconds) {
      $timedOut = true;
      proc_terminate($process);
      break;
    }
    usleep(100000);
  }

  $stdout .= stream_get_contents($pipes[1]) ?: '';
  $stderr .= stream_get_contents($pipes[2]) ?: '';
  fclose($pipes[1]);
  fclose($pipes[2]);

  $exitCode = proc_close($process);
  if ($timedOut) {
    return [
      'exitCode' => 124,
      'stdout' => $stdout,
      'stderr' => trim($stderr . "\nTimed out after {$timeoutSeconds} seconds."),
    ];
  }

  return [
    'exitCode' => $exitCode,
    'stdout' => $stdout,
    'stderr' => $stderr,
  ];
}

function ccc_flutterflow_binary(): string {
  $configured = getenv('FLUTTERFLOW_AI_BIN') ?: '';
  if ($configured !== '') return $configured;
  return 'flutterflow';
}

function ccc_workspace_root(): string {
  $configured = getenv('CCC_FFAI_WORKSPACE_ROOT') ?: '';
  if ($configured !== '') return rtrim($configured, DIRECTORY_SEPARATOR);
  return rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'ccc_flutterflow_ai';
}

function ccc_ensure_workspace(string $workspaceRoot, string $flutterflowBin, array $env): string {
  $workspace = $workspaceRoot . DIRECTORY_SEPARATOR . 'custom_code_connect';
  if (is_dir($workspace . DIRECTORY_SEPARATOR . '.flutterflow')) {
    return $workspace;
  }

  if (!is_dir($workspaceRoot) && !mkdir($workspaceRoot, 0700, true)) {
    ccc_json_error(500, 'Failed to create FlutterFlow AI workspace root.');
  }

  $result = ccc_run_command(
    [$flutterflowBin, 'ai', 'init', 'custom_code_connect', '--yes'],
    $workspaceRoot,
    $env,
    300,
  );

  if ($result['exitCode'] !== 0) {
    ccc_json_response(500, [
      'success' => false,
      'error' => 'Failed to initialize FlutterFlow AI workspace.',
      'details' => trim($result['stderr'] ?: $result['stdout']),
    ]);
  }

  return $workspace;
}

function ccc_dart_single_quote(string $value): string {
  return "'" . str_replace(['\\', "'"], ['\\\\', "\\'"], $value) . "'";
}

function ccc_dart_raw_triple_single(string $value): string {
  if (str_contains($value, "'''")) {
    return '"""' . str_replace(['\\', '$', '"""'], ['\\\\', '\\$', '\\"\\"\\"'], $value) . '"""';
  }
  return "r'''\n" . $value . "\n'''";
}

function ccc_write_custom_class_script(string $workspace, array $classes): string {
  $dslDir = $workspace . DIRECTORY_SEPARATOR . 'dsl';
  if (!is_dir($dslDir) && !mkdir($dslDir, 0700, true)) {
    ccc_json_error(500, 'Failed to create DSL directory.');
  }

  $calls = '';
  foreach ($classes as $class) {
    $name = ccc_dart_single_quote($class['className']);
    $code = ccc_dart_raw_triple_single($class['content']);
    $calls .= <<<DART
    if (findCustomClass(project, name: {$name}) == null) {
      addCustomClass(
        project,
        name: {$name},
        code: {$code},
      );
    }

DART;
  }

  $script = <<<DART
library;

import 'dart:io';

import 'package:flutterflow_ai/flutterflow_ai.dart';

Future<void> main(List<String> args) async {
  final options = _parseCliOptions(args);
  try {
    await flutterFlowAI(
      (app) {
        app.raw((project) {
{$calls}        });
      },
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      projectId: options.projectId,
      dryRun: options.dryRun,
      commitMessage: options.commitMessage,
    );
  } catch (error) {
    stderr.writeln('Error: \${formatFlutterFlowAIError(error)}');
    exit(1);
  }
}

final class _CliOptions {
  const _CliOptions({
    this.apiKey,
    this.baseUrl,
    this.projectId,
    this.commitMessage,
    this.dryRun = false,
  });

  final String? apiKey;
  final String? baseUrl;
  final String? projectId;
  final String? commitMessage;
  final bool dryRun;
}

_CliOptions _parseCliOptions(List<String> args) {
  String? apiKey;
  String? baseUrl;
  String? projectId;
  String? commitMessage;
  var dryRun = false;

  for (var i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--api-key':
        apiKey = _requireValue(args, ++i, '--api-key');
      case '--base-url':
        baseUrl = _requireValue(args, ++i, '--base-url');
      case '--project-id':
        projectId = _requireValue(args, ++i, '--project-id');
      case '--commit-message':
        commitMessage = _requireValue(args, ++i, '--commit-message');
      case '--dry-run':
        dryRun = true;
      default:
        stderr.writeln('Unknown option: \${args[i]}');
        exit(64);
    }
  }

  return _CliOptions(
    apiKey: apiKey,
    baseUrl: baseUrl,
    projectId: projectId,
    commitMessage: commitMessage,
    dryRun: dryRun,
  );
}

String _requireValue(List<String> args, int index, String flag) {
  if (index >= args.length) {
    stderr.writeln('Missing value for \$flag.');
    exit(64);
  }
  return args[index];
}
DART;

  $file = $dslDir . DIRECTORY_SEPARATOR . 'deploy_custom_classes.dart';
  if (file_put_contents($file, $script) === false) {
    ccc_json_error(500, 'Failed to write FlutterFlow AI DSL script.');
  }
  return $file;
}

function ccc_normalize_classes(mixed $rawClasses): array {
  if (!is_array($rawClasses)) {
    ccc_json_error(400, 'customClasses must be an array.');
  }
  if (count($rawClasses) === 0) {
    ccc_json_error(400, 'At least one custom class is required.');
  }
  if (count($rawClasses) > 20) {
    ccc_json_error(400, 'Too many custom classes in one deploy request.');
  }

  $classes = [];
  foreach ($rawClasses as $index => $class) {
    if (!is_array($class)) {
      ccc_json_error(400, 'customClasses[' . $index . '] must be an object.');
    }
    $className = ccc_string_field($class, 'className', 120);
    if (!preg_match('/^[A-Z][A-Za-z0-9_]*$/', $className)) {
      ccc_json_error(400, 'Invalid custom class name: ' . $className);
    }
    $content = ccc_string_field($class, 'content', 500000);
    $classes[] = [
      'artifactId' => ccc_string_field($class, 'artifactId', 200, false),
      'className' => $className,
      'content' => $content,
    ];
  }
  return $classes;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  ccc_json_error(405, 'Method not allowed.');
}

$payload = ccc_read_json_body();
$apiKey = ccc_string_field($payload, 'apiKey', 10000);
$projectId = ccc_string_field($payload, 'projectId', 200);
$commitMessage = ccc_string_field($payload, 'commitMessage', 300, false);
$baseUrl = ccc_string_field($payload, 'baseUrl', 500, false);
$dryRun = isset($payload['dryRun']) ? (bool) $payload['dryRun'] : false;
$classes = ccc_normalize_classes($payload['customClasses'] ?? []);

$workspaceRoot = ccc_workspace_root();
$flutterflowBin = ccc_flutterflow_binary();
$env = array_merge($_ENV, [
  'FF_API_KEY' => $apiKey,
  'FLUTTERFLOW_API_KEY' => $apiKey,
  'HOME' => getenv('HOME') ?: sys_get_temp_dir(),
  'PATH' => getenv('PATH') ?: '/usr/local/bin:/usr/bin:/bin',
]);

$workspace = ccc_ensure_workspace($workspaceRoot, $flutterflowBin, $env);
$scriptFile = ccc_write_custom_class_script($workspace, $classes);

$args = [
  $flutterflowBin,
  'ai',
  $dryRun ? 'validate' : 'run',
  $scriptFile,
  '--project-id',
  $projectId,
];
if ($baseUrl !== '') {
  $args[] = '--base-url';
  $args[] = $baseUrl;
}
if ($commitMessage !== '') {
  $args[] = '--commit-message';
  $args[] = $commitMessage;
}

$result = ccc_run_command($args, $workspace, $env, 300);
if ($result['exitCode'] !== 0) {
  ccc_json_response(502, [
    'success' => false,
    'error' => 'FlutterFlow AI DSL deploy failed.',
    'details' => trim($result['stderr'] ?: $result['stdout']),
    'exitCode' => $result['exitCode'],
  ]);
}

ccc_json_response(200, [
  'success' => true,
  'message' => 'Custom classes deployed through FlutterFlow AI DSL addCustomClass.',
  'deployed' => array_map(
    fn(array $class) => [
      'artifactId' => $class['artifactId'],
      'className' => $class['className'],
    ],
    $classes,
  ),
  'dryRun' => $dryRun,
]);
