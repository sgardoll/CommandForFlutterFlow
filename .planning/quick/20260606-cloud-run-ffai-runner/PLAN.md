# Quick Task 17: Move CustomClass DSL Runner to Cloud Run

## Goal

Replace the PHP FlutterFlow AI DSL runner with a Cloud Run service that can execute `addCustomClass` deploys for browser-initiated CustomClass artifacts.

## Success Criteria

- Browser deploy code targets a configured Cloud Run endpoint instead of a colocated PHP script.
- Cloud Run service builds without embedding FlutterFlow API keys or project secrets.
- Runtime requests initialize the FlutterFlow AI workspace using the supplied API key.
- Existing planner/deploy tests and production build still pass.
- Cloud Run service is deployed to `low-code-connect/us-west1` and responds publicly.

## Verification

- `dart analyze` in `cloud-run/ffai-runner`
- `bash -n scripts/deploy_cloud_run_ffai.sh`
- `npm test`
- `npm run build`
- `git diff --check`
- `curl` preflight and invalid POST against deployed Cloud Run endpoint
