<?php

declare(strict_types=1);

require_once __DIR__ . '/proxy-utils.php';

$path = $_GET['path'] ?? '';
$path = ltrim($path, '/');

if ($path === '') {
  ccc_json_error(400, 'Missing OpenAI path');
}

$incomingHeaders = ccc_get_request_headers();

// Check for API key in custom header (to avoid Cloudflare WAF blocking Authorization header)
$apiKey = '';
foreach ($incomingHeaders as $name => $value) {
  if (strtolower($name) === 'x-openai-api-key') {
    $apiKey = $value;
    break;
  }
}

// Fallback to Authorization header if custom header not present
if ($apiKey === '') {
  foreach ($incomingHeaders as $name => $value) {
    if (strtolower($name) === 'authorization') {
      // Extract key from "Bearer <key>"
      if (str_starts_with($value, 'Bearer ')) {
        $apiKey = substr($value, 7);
      }
      break;
    }
  }
}

// Fallback to environment variable
if ($apiKey === '') {
  $apiKey = getenv('OPENAI_API_KEY') ?: '';
}

if ($apiKey === '') {
  ccc_json_error(401, 'OpenAI API key is not configured');
}

$overrides = [
  'Authorization' => 'Bearer ' . $apiKey,
];

$targetUrl = 'https://api.openai.com/' . $path;
$outgoingHeaders = ccc_filter_incoming_headers($incomingHeaders, $overrides);

ccc_forward_request($targetUrl, $outgoingHeaders);
