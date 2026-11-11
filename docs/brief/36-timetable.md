## 36. Timetable

Manual timetable builder with clash detection. No automatic solver.

- Bell schedule per level: school days, periods with start and end times, breaks and assembly.
- Rooms (classrooms, labs, halls) with optional capacity.
- Place a subject, teacher and room into each period for each class arm, by tapping a cell or dragging on desktop.
- Clash detection when saving: the same teacher, room or class arm in two places at once is blocked; a teacher above a school-set weekly period limit gets a warning.
- Check that each subject receives its configured periods per week, and show any shortfall.
- Views and printouts: per class arm, per teacher, per room, and a master timetable (A4/A3 landscape PDF and Excel).
- Teachers see their own timetable in the teacher workspace (section 19). Parents see their child's class timetable in the parent app.
- One timetable per term, with copy-from-previous-term.
- Tables: `bell_schedules`, `periods`, `rooms`, `timetable_entries`.
- Effort: 1.0. Depends on school structure (section 8) and staff (section 9).

Acceptance: no double-booked teacher, room or class arm can be saved; a full timetable prints legibly per class and per teacher.

