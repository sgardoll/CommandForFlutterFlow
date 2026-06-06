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

`CustomClass` artifacts deploy through `/api/flutterflow-dsl-deploy.php`, which shells out to FlutterFlow AI and runs a generated edit DSL script using `addCustomClass`.

The PHP host must have:

- PHP with `proc_open` enabled
- `flutterflow` available on `PATH`, or `FLUTTERFLOW_AI_BIN` set to the absolute CLI path
- a writable temp directory, or `CCC_FFAI_WORKSPACE_ROOT` set to a writable persistent directory

The frontend endpoint can be overridden with `VITE_FLUTTERFLOW_DSL_DEPLOY_ENDPOINT` if the DSL runner is moved to BuildShip or another backend.
