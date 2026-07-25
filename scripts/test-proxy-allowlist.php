<?php

declare(strict_types=1);

require_once __DIR__ . '/../public/api/proxy-utils.php';

$gemini = ccc_allowed_paths('gemini');
$anthropic = ccc_allowed_paths('anthropic');
$openai = ccc_allowed_paths('openai');

$cases = [
  ['v1beta/models/gemini-2.0-flash:generateContent', $gemini, true, 'Gemini generateContent'],
  ['/v1beta/models/gemini-2.0-flash:streamGenerateContent', $gemini, false, 'normalization belongs to request guard'],
  ['v1/models/gemini-2.0-flash:countTokens', $gemini, true, 'Gemini countTokens'],
  ['v1beta/models', $gemini, true, 'Gemini models'],
  ['v1/messages', $anthropic, true, 'Anthropic messages'],
  ['v1/messages/count_tokens', $anthropic, true, 'Anthropic count tokens'],
  ['v1/chat/completions', $openai, true, 'OpenAI chat completions'],
  ['v1/responses', $openai, true, 'OpenAI responses'],
  ['v1/models/gpt-4o', $openai, true, 'OpenAI model'],
  ['http://169.254.169.254/latest/meta-data/', $gemini, false, 'cloud metadata URL'],
  ['https://evil.example/x', $openai, false, 'absolute HTTPS URL'],
  ['//evil.example/x', $gemini, false, 'protocol-relative URL'],
  ['\\evil.example/x', $gemini, false, 'backslash host'],
  ['file:///etc/passwd', $gemini, false, 'file URL'],
  ['gopher://evil.example/', $gemini, false, 'gopher URL'],
  ['user@evil.example/v1/models', $openai, false, 'userinfo disguise'],
  ['http%3A%2F%2Fevil.example', $openai, false, 'encoded absolute URL'],
  ['../../../etc/passwd', $gemini, false, 'path traversal'],
  ['v1/models/../../admin', $openai, false, 'mid-path traversal'],
  ['%2e%2e%2f%2e%2e%2fadmin', $openai, false, 'encoded traversal'],
  ["v1/models\r\nHost: evil.example", $openai, false, 'CRLF injection'],
  ["v1/models\x00", $openai, false, 'null byte'],
  ['v1/models ', $openai, false, 'trailing whitespace'],
  ['', $gemini, false, 'empty path'],
  [str_repeat('a', 600), $gemini, false, 'over-length path'],
  ['v1/organizations/keys', $openai, false, 'unlisted OpenAI endpoint'],
  ['v1beta/tunedModels/x:generateContent', $gemini, false, 'unlisted Gemini surface'],
  ['v1/messages', $openai, false, 'provider endpoint mismatch'],
  ['v1/chat/completions', $anthropic, false, 'provider endpoint mismatch'],
  ['v1/models/gpt 4o', $openai, false, 'space in model name'],
];

$failures = 0;
foreach ($cases as [$path, $allowlist, $expected, $label]) {
  $actual = ccc_is_allowed_path($path, $allowlist);
  if ($actual !== $expected) {
    $failures++;
    fwrite(STDERR, "FAIL: {$label}\n");
  }
}

printf("%d/%d proxy path cases passed\n", count($cases) - $failures, count($cases));
exit($failures === 0 ? 0 : 1);
