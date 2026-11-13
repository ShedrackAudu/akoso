# Account recovery by Akoso support

For people a school cannot help itself (spec: `docs/specs/stage-1-sign-in-part-b.md`,
sections 5 and 6). A school changes a sign-in number or resets a second step on its
own, from **School settings → People with access**, except in the cases below.

## When it comes to Akoso

| Case                                                                           | Why the school can't do it                                                                     |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| The person also belongs to **another school** (a parent with children in two)  | One account spans schools. One school's administrator must not change access to another school |
| A **second number change within 30 days** for the same person                  | The limit (`limits.contact_change`) stops a takeover being repeated                            |
| The school's **only proprietor** has lost their authenticator and backup codes | Nobody at the school may reset a proprietor except another proprietor                          |

## Steps

1. **Open a support ticket** naming the person, the school or schools, and what they
   lost. Never write an ID document number in the ticket.
2. **Check identity with each school the person belongs to.** Ask each school's
   proprietor or administrator to confirm, in person or by video call, that they know
   the person and that the request is genuine. Record who confirmed, when and how in
   the ticket. All schools must agree; one refusal stops the change.
3. **For a number change,** ask the person for the new number and send them a code from
   it in front of a school's staff, as the school's own flow does.
4. **Make the change** with the founder's approval, in a recorded break-glass session
   (brief 28.3), until the admin app's support tools exist (sign-in part B, pull request
   2, and later). Sign the person out everywhere.
5. **Tell the person and every school** what changed and when. Send a notice to the old
   number and any email on file.
6. **Record it** in each school's audit log (action `identity.phone.changed_by_support`
   or `identity.mfa.reset_by_support`) and close the ticket with a summary.

## Break-glass: a lone Owner locked out of the admin app

If the only Owner loses every passkey and every recovery code:

1. Someone with production database access opens a recorded break-glass session
   (brief 28.3) with the founder's approval.
2. They take the Owner role from the old record:
   `delete from platform.team_role_grants where role = 'owner' and user_id = '<id>';`
   (the record itself stays for the audit log).
3. They run `pnpm team:invite-owner <email> "Name"` with the production migration
   role's connection, and give the 30-minute link to the Owner in person.
4. The Owner enrols, makes new recovery codes and adds a second passkey at once.
5. Record the session, who did it and why, in the incident log.
