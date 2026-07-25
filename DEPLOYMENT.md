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

## Pre-deploy backup commit

The Cloud Run AI-DSL runner is **still required**, for a different job than
before: recording a restore point before each deploy.

`syncCustomCodeChanges` has no commit message in its request and leaves no
commit behind, so a push overwrites custom code with nothing to roll back to.
The DSL CLI does accept `--commit-message`, so the runner's `/commitSnapshot`
endpoint runs a no-op DSL script purely to make FlutterFlow record a commit of
the project's current state. The app calls it before every push.

Deploy the runner:

```bash
PROJECT_ID=low-code-connect REGION=us-west1 ./scripts/deploy_cloud_run_ffai.sh
```

The script prints the runner URL. Build the site with the **deploy** endpoint;
the snapshot endpoint is derived from it:

```bash
VITE_FLUTTERFLOW_DSL_DEPLOY_ENDPOINT="https://<runner-host>/deployCustomClasses" npm run build
```

Behaviour when the backup cannot be made:

| Situation | Result |
|---|---|
| Endpoint not configured | Deploy proceeds, warning logged — no backup is taken |
| Runner call fails | **Deploy is blocked**, so the project keeps a restore point |
| Runs clean, no commit recorded | Deploy proceeds; nothing was uncommitted, so the latest existing commit is the restore point |

**Unverified:** whether the CLI records a commit for a run that changes nothing
is undocumented, and `flutterflow_ai` is not a public package. The runner
returns the CLI's own output and a `committed` flag rather than assuming, and
the app logs both. Check a real deploy's console output and the project's
FlutterFlow version history to confirm a commit appears; if it does not, this
approach needs a DSL operation that does commit.

## pubspec.yaml dependency sync

Deploys never synthesize a pubspec.yaml. FlutterFlow treats the pushed
`serialized_yaml` as the project's complete dependency set, so the app exports
the project (`exportCode`), reads the real `pubspec.yaml` out of the archive,
adds only the packages the generated code needs, and pushes the merged file
back. If the export cannot be read the deploy fails rather than risk replacing
the project's dependencies.
