# Runbooks

Step-by-step guides for operating Akoso (brief sections 28 and 31). **None is written
yet**; each is written with the stage that makes it real, and all are finalised in
Stage 9.

| Runbook                         | Covers                                                                                                             | Stage |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----- |
| Deploy                          | Staging and production deploys; the change freeze in results and resumption weeks                                  | 1     |
| Rollback                        | One-click rollback; backward-compatible migrations                                                                 | 1     |
| Restore                         | Point-in-time recovery; the termly restore drill into staging in under 2 hours                                     | 5     |
| Payment-provider outage         | Switching collection from Paystack to Monnify with the emergency switch                                            | 4, 7  |
| Messaging outage                | Pausing a channel; fallbacks                                                                                       | 5     |
| Results corrupted               | Detecting it, stopping publishing, recomputing from scores, telling schools                                        | 3     |
| Data breach                     | Internal incident record, impact assessment, notifying the NDPC within 72 hours and affected schools without delay | 5     |
| Post-mortem template            |                                                                                                                    | 5     |
| Incident communication template | For the status page and messages to schools                                                                        | 5     |
