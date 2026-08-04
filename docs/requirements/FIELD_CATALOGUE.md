# Field Catalogue

Provisional catalogue. Requiredness and terminology need partner validation.

| Record | Fields |
| --- | --- |
| Company | name, settings, created/updated timestamps |
| User | company, identity, role, active state |
| Client | name, contact details, external reference |
| Site | client, name/address, access notes, site reference |
| Anchor | stable ID, site, label/register ID, location, type, manufacturer/model when known, install context, history/status, notes |
| Job | site, reference, planned date, status, assigned inspector |
| Inspection | job, revision, inspector, started/submitted timestamps, workflow status, notes |
| Anchor inspection | anchor or new-anchor reference, location confirmation, observations, outcome, accessibility, notes |
| Photo | private object key, capture time, local ID, anchor-inspection link, upload state, checksum, metadata policy |
| Defect | anchor inspection, recorded description, severity if validated, evidence links |
| Recommendation | anchor inspection, recorded action, owner/due context if validated |
| Review action | reviewer, action, comment, requested change, timestamp |
| Report revision | job, source inspection revision, template version, file, creator/reviewer, created time |

Measurements, equipment, signatures, inspection frequency, replacement links,
history references and import provenance remain conditional fields until
validated. Never infer a compliance result from any field.
