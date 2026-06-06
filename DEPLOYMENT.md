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

`CustomClass` artifacts deploy through a Cloud Run runner that executes FlutterFlow AI DSL `addCustomClass`.

Deploy the runner:

```bash
PROJECT_ID=low-code-connect REGION=us-west1 ./scripts/deploy_cloud_run_ffai.sh
```

The script prints the runner URL. Build the site with:

```bash
VITE_FLUTTERFLOW_DSL_DEPLOY_ENDPOINT="https://ccc-ffai-runner-y5cyj3473a-uw.a.run.app/deployCustomClasses" npm run build
```

The Cloud Run runner accepts the existing browser-provided FlutterFlow API key and project ID over HTTPS, writes a generated edit DSL script, and runs `flutterflow ai run` inside the container.
