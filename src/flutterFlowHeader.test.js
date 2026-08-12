import assert from "node:assert/strict";
import test from "node:test";
import { applyFlutterFlowHeader, stripFlutterFlowHeader } from "./flutterFlowHeader.js";

const WIDGET_HEADER = `// Automatic FlutterFlow imports
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import 'package:flutter/material.dart';
// Begin custom widget code
// DO NOT REMOVE OR MODIFY THE CODE ABOVE!

`;

test("leaves code without a header untouched when stripping", () => {
  const code = "class Widget extends StatefulWidget {}";

  assert.equal(stripFlutterFlowHeader(code), code);
});

test("removes a header the generator already emitted", () => {
  const code = `${WIDGET_HEADER}class Widget extends StatefulWidget {}`;

  assert.equal(stripFlutterFlowHeader(code), "class Widget extends StatefulWidget {}");
});

test("both generation shapes produce byte-identical deploy content", () => {
  const withHeader = `${WIDGET_HEADER}class Widget extends StatefulWidget {}`;
  const bare = "import 'package:flutter/material.dart';\n\nclass Widget extends StatefulWidget {}";

  assert.equal(
    applyFlutterFlowHeader(withHeader, WIDGET_HEADER),
    applyFlutterFlowHeader(bare, WIDGET_HEADER),
  );
});

test("applies exactly one header", () => {
  const result = applyFlutterFlowHeader(
    `${WIDGET_HEADER}class Widget extends StatefulWidget {}`,
    WIDGET_HEADER,
  );

  assert.equal(result.match(/DO NOT REMOVE OR MODIFY THE CODE ABOVE!/g).length, 1);
  assert.equal(result.match(/\/\/ Automatic FlutterFlow imports/g).length, 1);
});

test("drops body imports the header already provides", () => {
  const result = applyFlutterFlowHeader(
    "import 'package:flutter/material.dart';\nimport 'package:qr_flutter/qr_flutter.dart';\n\nclass W {}",
    WIDGET_HEADER,
  );

  assert.equal(result.match(/package:flutter\/material\.dart/g).length, 1);
  assert.ok(result.includes("import 'package:qr_flutter/qr_flutter.dart';"));
});

test("matches header imports by URI even when the header carries trailing comments", () => {
  const commentedHeader = `// Automatic FlutterFlow imports
import '/custom_code/actions/index.dart'; // Imports custom actions
// DO NOT REMOVE OR MODIFY THE CODE ABOVE!

`;
  const result = applyFlutterFlowHeader(
    "import '/custom_code/actions/index.dart';\n\nclass W {}",
    commentedHeader,
  );

  assert.equal(result.match(/custom_code\/actions\/index\.dart/g).length, 1);
});

test("keeps a package import that only shares a prefix with a header import", () => {
  const result = applyFlutterFlowHeader(
    "import 'package:flutter/material_extras.dart';\n\nclass W {}",
    WIDGET_HEADER,
  );

  assert.ok(result.includes("package:flutter/material_extras.dart"));
});

test("keeps a prefixed import of a URI the header also provides", () => {
  const result = applyFlutterFlowHeader(
    "import 'package:flutter/material.dart' as material;\n\nclass W { material.Widget? w; }",
    WIDGET_HEADER,
  );

  assert.ok(result.includes("import 'package:flutter/material.dart' as material;"));
});

test("keeps a show/hide import of a URI the header also provides", () => {
  const result = applyFlutterFlowHeader(
    "import 'package:flutter/material.dart' show Colors;\n\nclass W {}",
    WIDGET_HEADER,
  );

  assert.ok(result.includes("show Colors"));
});

test("still drops a plain duplicate that carries a trailing comment", () => {
  const result = applyFlutterFlowHeader(
    "import 'package:flutter/material.dart'; // needed\n\nclass W {}",
    WIDGET_HEADER,
  );

  assert.equal(result.match(/package:flutter\/material\.dart/g).length, 1);
});
