## 15. Payroll

Build payroll for school staff using Nigerian rules under the Nigeria Tax Act 2025 (in force from 1 January 2026).

- Salary structures and grades: basic, housing, transport and other allowances; deductions; loans and advances.
- PAYE using **versioned tax tables with effective dates**, stored as data so rule changes need no code deploy. Seed the 2026 bands: 0% on the first ₦800,000 of annual taxable income, then 15% up to ₦3m, 18% up to ₦12m, 21% up to ₦25m, 23% up to ₦50m, 25% above. The old Consolidated Relief Allowance is abolished; do not apply it. Rent relief: 20% of annual rent, capped at ₦500,000, using each employee's declared annual rent (with an optional evidence upload).
- Pension: 8% employee and 10% employer, configurable, for employers with 3 or more staff.
- National Housing Fund (2.5% of basic) and NSITF (1%) as configurable per-employee settings (sources differ on whether NHF is now voluntary).
- Monthly payroll run with draft → review → approved → paid states; payslips as PDF; bank payment schedule export; PAYE, pension and NHF remittance schedules. PAYE is paid to the tax authority of each employee's state of residence (e.g. LIRS for Lagos), so PAYE schedules are grouped by state; pension schedules are grouped by each employee's pension fund administrator.
- Optional deduction of a staff member's children's school fees from salary, posted automatically as a payment to the child's billing account (section 9).
- A statutory remittance calendar with reminders to the bursar: PAYE due by the 10th of the following month; pension remitted within 7 working days of paying salaries. Store these deadlines, and the names of the tax and pension authorities, as data (federal tax administration is now the Nigeria Revenue Service, formerly FIRS).
- A parallel-run mode to compare with a school's existing payroll.

Acceptance: a parallel run against two pilot schools' payroll for the same month matches to the naira, or every difference is explained.

I will verify all tax and statutory rates with an accountant before launch. Mark the seeded values as "to be verified" in the admin screen.

