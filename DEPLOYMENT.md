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

`CustomClass` artifacts deploy through the same `syncCustomCodeChanges` call as
actions and widgets. FlutterFlow's VS Code extension now supports standalone
custom code files (`CodeType.CODE_FILE`, wire type `"C"`), so a generated class
is pushed as `lib/custom_code/<file>.dart` with no extra infrastructure.

The Cloud Run AI-DSL runner (`cloud-run/ffai-runner`,
`scripts/deploy_cloud_run_ffai.sh`) that previously handled these deploys is no
longer called by the app and can be torn down. `VITE_FLUTTERFLOW_DSL_DEPLOY_ENDPOINT`
is no longer read at build time.

## pubspec.yaml dependency sync

Deploys never synthesize a pubspec.yaml. FlutterFlow treats the pushed
`serialized_yaml` as the project's complete dependency set, so the app exports
the project (`exportCode`), reads the real `pubspec.yaml` out of the archive,
adds only the packages the generated code needs, and pushes the merged file
back. If the export cannot be read the deploy fails rather than risk replacing
the project's dependencies.
