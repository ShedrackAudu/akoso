## 12. Report cards, transcripts and testimonials

Generate report cards from published snapshots using HTML templates rendered to PDF by the Gotenberg container in the worker. Never render PDFs in the web process.

Templates:

- **Nursery:** skill-area rubric, narrative comments, attendance, photo, no positions.
- **Primary**, **JSS** and **SSS:** subject table (components, total, grade, remark, subject position if on), summary (total, average, position "5th out of 42" if on, class average, highest, lowest), traits, comments, attendance, next-term resumption date and next-term fees, school logo, signatures and stamp.
- **Third term:** adds cumulative average and promotion status.
- **Mid-term progress report** (section 11): components entered so far, attendance and a comment.

At least two layout variants per level; schools choose and brand them. Schools can override the labels and headings on their report cards (for example, local-language headings or their own term names) without code. Use A4 portrait, readable when printed in black and white. Every template carries the small footer "Results prepared with Akoso" (section 4.0); the school's logo, name and colours lead the page.

Generation:

- Bulk per class or whole school as a background job with a progress bar.
- Output: individual PDFs, a merged PDF per class, and a zip.
- Cache PDFs by a hash of their inputs; re-download does not re-render.
- 600 report cards in under 10 minutes; each PDF under 300 KB.

Publishing:

- Publish per class or school; parents see the report card in the app and receive a notification (WhatsApp with PDF where opted in).
- Optional fee gate: withhold online access for families with a balance above a school-set threshold; the school can override per student. Never withhold the printed card automatically.

Also generate:

- **Transcripts** covering multiple sessions (e.g. JSS1–SSS3) from stored snapshots, in one click per student.
- **Testimonials** for leavers from an editable template.
- **Leaving (transfer) certificates** for students who leave mid-session, showing their last published results and attendance.
- **Result verification:** a QR code on each report card and transcript that opens a page confirming the document is genuine, without exposing other data.

