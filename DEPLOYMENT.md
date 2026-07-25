# Deployment

## Web FTP target

- Host: `ftp.connectio.com.au`
- Port: `21`
- Username: `opencode_upload@connectio.com.au`
- Password: stored in macOS Keychain as generic password service `dreamflowCommandForFlutterFlow.ftp`.

Retrieve password for agent-driven deployment:

```bash
security find-generic-password -s dreamflowCommandForFlutterFlow.ftp -a opencode_upload@connectio.com.au -w
```

Build and upload `dist/`:

```bash
npm run build
python3 scripts/deploy_ftp.py
```

If no deploy script exists, upload every file under `dist/` to the FTP account root, preserving subdirectories.

## FlutterFlow custom-class deploys

FlutterFlow's VS Code extension supports editing existing standalone Custom Code
Files through `syncCustomCodeChanges` (`CodeType.CODE_FILE`, wire type `"C"`).
That endpoint looks up an existing `FFCustomCodeFile` by filename and does not
create a missing entity.

For a new `CustomClass`, the web app calls the Cloud Run AI-DSL runner to
upsert the complete class source with `addCustomClass` or `updateCustomClass`.
That class file is then excluded from the extension-style sync; the remaining
bundle files and dependency changes still use `syncCustomCodeChanges`. Existing
code files that appear in project exports use the normal sync path directly.

The production runner defaults to:

```text
https://ccc-ffai-runner-y5cyj3473a-uw.a.run.app/deployCustomClasses
```

Override it at build time with `VITE_FLUTTERFLOW_CLASS_PROVISION_ENDPOINT`.
`VITE_FLUTTERFLOW_DSL_DEPLOY_ENDPOINT` remains accepted for compatibility.
Deploy the runner with:

```bash
PROJECT_ID=low-code-connect REGION=us-west1 ./scripts/deploy_cloud_run_ffai.sh
```

## pubspec.yaml dependency sync

Deploys never synthesize a pubspec.yaml. FlutterFlow treats the pushed
`serialized_yaml` as the project's complete dependency set, so the app exports
the project (`exportCode`), reads the real `pubspec.yaml` out of the archive,
adds only the packages the generated code needs, and pushes the merged file
back. If the export cannot be read the deploy fails rather than risk replacing
the project's dependencies.
