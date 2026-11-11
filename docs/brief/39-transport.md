## 39. Transport

No GPS tracking (out of scope, section 24).

- Routes with ordered stops, vehicles (plate number, capacity) and assigned drivers and bus minders (staff records).
- Students assigned to a route, stop and direction (morning, afternoon or both) per term.
- The bus fee is added automatically as an optional fee item (section 13) for assigned students, with an amount per route or per stop.
- Daily manifest per route and run, on the driver's or minder's phone, works offline (section 20).
- Mark each student as boarded or alighted with a tap; absent from the bus is flagged against the attendance register.
- Optional parent notification on boarding and drop-off (push first; SMS/WhatsApp use credits, section 17).
- Capacity warnings when assignments exceed a vehicle's seats.
- Tables: `vehicles`, `routes`, `route_stops`, `transport_assignments`, `transport_runs`, `transport_events`.
- Effort: 0.5. Depends on fees (section 13) and student attendance (section 21).

Acceptance: the driver or minder marks each pickup and drop-off, offline if needed, and every event syncs with time and staff name.

