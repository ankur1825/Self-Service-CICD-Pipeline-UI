# Cloud Migration development UI overlay

Render this chart only with an immutable UI image built from `feature/cloud-migration-enterprise`:

```bash
helm template horizon-cloud-migration-ui horizon-self-service-cicd-pipeline-ui-dashboard \
  -f deploy/cloud-migration-dev/ui-values.yaml \
  --set-string image.tag=UI_COMMIT_SHA
```

The resulting release uses `cloud-migration-dev.horizonrelevance.com/pipeline`, a dedicated non-root service account, health probes, resource limits, and the isolated `horizon-cloud-migration-dev` namespace.

For the complete image publishing, secret generation, deployment order, and acceptance procedure, follow the backend repository's `deploy/cloud-migration-dev/README.md`. Keep the UI and backend commit SHAs together in the release evidence bundle.
