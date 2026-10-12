# Graduation Day project update — meeting notes

Implemented demo features: Graduation Day event title, register ID or derived demo Net ID login, student detail welcome popup, session-only guest count (0–10), registration counter wording, removal of gate number from displayed pass, cinema-style seat highlighting, South Indian vegetarian/non-vegetarian menu filters, six campus search/directions cards, optional browser-permission GPS, and QR access retained.

Pending official inputs: Graduation date/time, permitted university logo, official SSO and Net ID format, actual auditorium seating chart, verified registration desk locations, parking access, campus routes, event food selection, document request/certification workflow, and authorized live event participant counts. Do not present this as official student event authentication.

Privacy and safety: Demo account IDs only, no production SSO. Guest counts exist only in the HTTP session. GPS coordinates remain in browser and are used only to construct Google Maps directions when student chooses a link. Map searches are not verified indoor routes.

Venue source: SRMIST lists Dr. T. P. Ganesan Auditorium in their booking information. Before the event, obtain organizers' final venue information and approved public website URL.
Added: session-only document requirement selector (event pass, graduation certificate, other). It is NOT a submitted/approved SRM request. Removed sample food price display from frontend cards while preserving database price fields for older API compatibility.
