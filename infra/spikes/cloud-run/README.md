# Cloud Run provider spike

This directory is the disposable `2D-04` evaluation candidate. It is not
production infrastructure and does not approve Google Cloud as the product
provider.

The candidate uses a private Cloud Run renderer with request concurrency one,
an OIDC-authenticated Cloud Tasks queue and a private regional Cloud Storage
bucket. Only the checked-in fictional 30-anchor fixture is accepted. A render
is committed to object storage only after the local PDF is complete; the HTTP
response contains metadata, never the PDF.

All cloud mutations are routed through `tools/provider-spike.sh`. The command
requires an interactive terminal, an explicit non-production project, a unique
`hs2d04-xxxxxxxx` prefix and an execution-time authorization phrase. CI and
unattended agents are rejected. Resource names use the exact prefix; supported
resources also carry the `ticket=2d-04`, `purpose=provider-spike` and
`owner=height-safety` labels.

Each plan creates an immutable run identifier and local registry. Evidence,
cost and destruction records must all match that run. Existing labelled
resources are validated before reuse; unlabelled queues and service accounts
must be present in the guarded registry. Destruction refuses any target whose
ownership cannot be proved. The image is built locally and pushed directly to
the namespaced repository, avoiding implicit Cloud Build source and log
storage.

`lifecycle.json` applies only to fictional spike output and is not a product
retention decision. The destroy command inventories and removes the exact
candidate resources, and the separate verification command must prove that no
matching resource remains.
