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
| Endpoint not configured | Deploy proceeds, warning logged — opting out of backups entirely |
| Runner call fails | **Deploy is blocked** |
| Runs clean, but no commit confirmed | **Deploy is blocked** |

A confirmed commit is the only outcome that permits a push. "Ran clean but
recorded no commit" is ambiguous — either the project had nothing uncommitted to
capture, or the no-op run does not commit at all — and the CLI output cannot
distinguish them, so it fails closed. Treating it as the benign case would be
indistinguishable from a failsafe that silently protects nothing on every
deploy.

**Unverified, and this is the load-bearing assumption:** whether the CLI records
a commit for a run that changes nothing is undocumented, and `flutterflow_ai` is
not a public package. The runner returns the CLI's own output and a `committed`
flag rather than assuming, and the app logs both.

**If deploys start blocking with "could not confirm a backup commit", the
mechanism is not working** — that is the expected symptom, not a bug in the
policy. Check the project's FlutterFlow version history. Fixing it means finding
a DSL operation that does commit; until then, clearing
`VITE_FLUTTERFLOW_DSL_DEPLOY_ENDPOINT` deploys without a backup.

## pubspec.yaml dependency sync

Deploys never synthesize a pubspec.yaml. FlutterFlow treats the pushed
`serialized_yaml` as the project's complete dependency set, so the app exports
the project (`exportCode`), reads the real `pubspec.yaml` out of the archive,
adds only the packages the generated code needs, and pushes the merged file
back. If the export cannot be read the deploy fails rather than risk replacing
the project's dependencies.
