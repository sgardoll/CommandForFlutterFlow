import 'dart:async';
import 'dart:convert';
import 'dart:io';

const maxClassesPerRequest = 20;
const maxCodeBytes = 500000;

Future<void> main() async {
  final port = int.tryParse(Platform.environment['PORT'] ?? '') ?? 8080;
  final server = await HttpServer.bind(InternetAddress.anyIPv4, port);
  stdout.writeln('FlutterFlow AI runner listening on $port');

  await for (final request in server) {
    unawaited(_handle(request));
  }
}

Future<void> _handle(HttpRequest request) async {
  try {
    _writeCorsHeaders(request.response);

    if (request.method == 'OPTIONS') {
      request.response.statusCode = HttpStatus.noContent;
      await request.response.close();
      return;
    }

    if (request.method != 'POST' || request.uri.path != '/deployCustomClasses') {
      await _json(request, HttpStatus.notFound, {
        'success': false,
        'error': 'Not found.',
      });
      return;
    }

    final payload = await _readJson(request);
    final apiKey = _stringField(payload, 'apiKey', maxLength: 10000);
    final projectId = _stringField(payload, 'projectId', maxLength: 200);
    final baseUrl = _stringField(payload, 'baseUrl', maxLength: 500, required: false);
    final commitMessage = _stringField(
      payload,
      'commitMessage',
      maxLength: 300,
      required: false,
    );
    final dryRun = payload['dryRun'] == true;
    final classes = _normalizeClasses(payload['customClasses']);

    final workspace = Directory(
      Platform.environment['FFAI_WORKSPACE'] ?? '/workspace/custom_code_connect',
    );
    final initResult = await _ensureWorkspace(workspace, apiKey);
    if (initResult != null) {
      await _json(request, HttpStatus.badGateway, {
        'success': false,
        'error': 'FlutterFlow AI workspace initialization failed.',
        'details': _trimOutput(
          '${initResult.stderr}'.isNotEmpty ? initResult.stderr : initResult.stdout,
        ),
        'exitCode': initResult.exitCode,
      });
      return;
    }

    final scriptFile = await _writeDeployScript(workspace, classes);
    final args = <String>[
      'ai',
      dryRun ? 'validate' : 'run',
      scriptFile.path,
      '--project-id',
      projectId,
      '--api-key',
      apiKey,
    ];
    if (baseUrl.isNotEmpty) {
      args.addAll(['--base-url', baseUrl]);
    }
    if (commitMessage.isNotEmpty) {
      args.addAll(['--commit-message', commitMessage]);
    }

    final result = await Process.run(
      'flutterflow',
      args,
      workingDirectory: workspace.path,
      environment: {
        'FF_API_KEY': apiKey,
        'FLUTTERFLOW_API_KEY': apiKey,
      },
    ).timeout(const Duration(minutes: 5));

    if (result.exitCode != 0) {
      await _json(request, HttpStatus.badGateway, {
        'success': false,
        'error': 'FlutterFlow AI DSL deploy failed.',
        'details': _trimOutput('${result.stderr}'.isNotEmpty ? result.stderr : result.stdout),
        'exitCode': result.exitCode,
      });
      return;
    }

    await _json(request, HttpStatus.ok, {
      'success': true,
      'message': 'Custom classes deployed through FlutterFlow AI DSL addCustomClass.',
      'deployed': classes
          .map((entry) => {
                'artifactId': entry.artifactId,
                'className': entry.className,
              })
          .toList(),
      'dryRun': dryRun,
    });
  } on TimeoutException {
    await _json(request, HttpStatus.gatewayTimeout, {
      'success': false,
      'error': 'FlutterFlow AI DSL deploy timed out.',
    });
  } on FormatException catch (error) {
    await _json(request, HttpStatus.badRequest, {
      'success': false,
      'error': error.message,
    });
  } catch (error, stackTrace) {
    stderr.writeln(error);
    stderr.writeln(stackTrace);
    await _json(request, HttpStatus.internalServerError, {
      'success': false,
      'error': '$error',
    });
  }
}

Future<ProcessResult?> _ensureWorkspace(Directory workspace, String apiKey) async {
  final packageConfig = File('${workspace.path}/.dart_tool/package_config.json');
  if (packageConfig.existsSync()) {
    return null;
  }

  final parent = workspace.parent;
  await parent.create(recursive: true);
  final workspaceName = workspace.path.split(Platform.pathSeparator).last;
  final result = await Process.run(
    'flutterflow',
    ['ai', 'init', workspaceName, '--yes', '--api-key', apiKey],
    workingDirectory: parent.path,
    environment: {
      'FF_API_KEY': apiKey,
      'FLUTTERFLOW_API_KEY': apiKey,
    },
  ).timeout(const Duration(minutes: 5));

  if (result.exitCode != 0) {
    return result;
  }
  return null;
}

void _writeCorsHeaders(HttpResponse response) {
  final allowedOrigin = Platform.environment['ALLOWED_ORIGIN'] ?? '*';
  response.headers
    ..set('Access-Control-Allow-Origin', allowedOrigin)
    ..set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    ..set('Access-Control-Allow-Headers', 'Content-Type')
    ..set('Vary', 'Origin');
}

Future<Map<String, dynamic>> _readJson(HttpRequest request) async {
  final raw = await utf8.decoder.bind(request).join();
  final decoded = jsonDecode(raw);
  if (decoded is! Map<String, dynamic>) {
    throw const FormatException('Request body must be a JSON object.');
  }
  return decoded;
}

String _stringField(
  Map<String, dynamic> source,
  String key, {
  required int maxLength,
  bool required = true,
}) {
  final value = source[key];
  if (value == null || value == '') {
    if (required) throw FormatException('Missing $key.');
    return '';
  }
  if (value is! String) {
    throw FormatException('$key must be a string.');
  }
  final trimmed = value.trim();
  if (required && trimmed.isEmpty) {
    throw FormatException('Missing $key.');
  }
  if (utf8.encode(trimmed).length > maxLength) {
    throw FormatException('$key is too long.');
  }
  return trimmed;
}

List<CustomClassEntry> _normalizeClasses(Object? value) {
  if (value is! List) {
    throw const FormatException('customClasses must be an array.');
  }
  if (value.isEmpty) {
    throw const FormatException('At least one custom class is required.');
  }
  if (value.length > maxClassesPerRequest) {
    throw const FormatException('Too many custom classes in one deploy request.');
  }

  return value.indexed.map((item) {
    final index = item.$1;
    final raw = item.$2;
    if (raw is! Map<String, dynamic>) {
      throw FormatException('customClasses[$index] must be an object.');
    }

    final className = _stringField(raw, 'className', maxLength: 120);
    if (!RegExp(r'^[A-Z][A-Za-z0-9_]*$').hasMatch(className)) {
      throw FormatException('Invalid custom class name: $className.');
    }

    final content = _stringField(raw, 'content', maxLength: maxCodeBytes);
    return CustomClassEntry(
      artifactId: _stringField(raw, 'artifactId', maxLength: 200, required: false),
      className: className,
      content: content,
    );
  }).toList();
}

Future<File> _writeDeployScript(
  Directory workspace,
  List<CustomClassEntry> classes,
) async {
  final dslDir = Directory('${workspace.path}/dsl')..createSync(recursive: true);
  final calls = classes.map((entry) {
    final name = _dartSingleQuoted(entry.className);
    final code = _dartRawString(entry.content);
    return '''
          if (findCustomClass(project, name: $name) == null) {
            addCustomClass(
              project,
              name: $name,
              code: $code,
            );
          }
''';
  }).join('\n');

  final script = '''
library;

import 'dart:io';

import 'package:flutterflow_ai/flutterflow_ai.dart';

Future<void> main(List<String> args) async {
  final options = _parseCliOptions(args);
  try {
    await flutterFlowAI(
      (app) {
        app.raw((project) {
$calls        });
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
''';

  final file = File('${dslDir.path}/deploy_custom_classes.dart');
  await file.writeAsString(script);
  return file;
}

String _dartSingleQuoted(String value) {
  return "'${value.replaceAll(r'\', r'\\').replaceAll("'", r"\'")}'";
}

String _dartRawString(String value) {
  if (!value.contains("'''")) {
    return "r'''\n$value\n'''";
  }
  return '"""${value.replaceAll(r'\', r'\\').replaceAll(r'$', r'\$').replaceAll('"""', r'\"\"\"')}"""';
}

String _trimOutput(Object value) {
  final text = '$value'.trim();
  if (text.length <= 4000) return text;
  return '${text.substring(0, 4000)}...';
}

Future<void> _json(
  HttpRequest request,
  int statusCode,
  Map<String, Object?> payload,
) async {
  request.response.statusCode = statusCode;
  request.response.headers.contentType = ContentType.json;
  request.response.write(jsonEncode(payload));
  await request.response.close();
}

final class CustomClassEntry {
  const CustomClassEntry({
    required this.artifactId,
    required this.className,
    required this.content,
  });

  final String artifactId;
  final String className;
  final String content;
}
