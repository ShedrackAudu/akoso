## 18. Parent app

Build an installable PWA for parents, optimised for 3G and costly data.

- Login with phone number and OTP in under 2 minutes; no password needed.
- Switch between children.
- Home: each child's balance, the fees account number to pay into (with a copy button), latest result, attendance and announcements.
- Pay any amount, transfer first: the fees account number (with a copy button) is the main way to pay, and "Pay by card" is a smaller second option, because Paystack's fee on a transfer is capped at ₦300 while a card payment can cost up to ₦2,000. Download receipts and statements.
- View and download published report cards and past results.
- Homework, attendance, events (with RSVP), newsletters and PTA bookings.
- Messages with the form teacher.
- Report an absence or lateness for a child (reason and days), which the form teacher sees on the register (section 21).
- Manage authorised collectors and one-time pickup codes (section 21).
- Consent and privacy settings, notification preferences and message language (the app itself stays in English, section 4.1).

Performance: under 200 KB transferred on first load and under 50 KB on repeat visits; usable on a 2 GB Android phone; passes the Lighthouse PWA installability checks. The PWA is installed from the browser at `app.akoso.ng`; there is no Play Store or App Store version until the Expo app is ready (section 5). The parent welcome and install screens use the line "Your child's school life, in your hand."; staff see a staff welcome after login.

**Installing on phones:** show simple, illustrated install steps. On Android: the browser's install prompt or "Add to Home screen". On iPhone: Safari → Share → "Add to Home Screen"; explain that iPhones only show notifications from a web app added to the Home Screen. Critical messages to iPhone parents who haven't installed it fall back to WhatsApp or SMS.

**Parent activation pack:** for each school, generate the printable payment-account consent slip (section 29.1) and a printable flyer (PDF) with a QR code that opens `app.akoso.ng` with the school preselected, plus ready-to-paste WhatsApp broadcast text, so schools can get parents onto the app quickly. Track activation per school (section 31).

