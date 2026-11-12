// Passwords too common to allow (spec section 3). Checked locally: nothing is sent to an
// outside service. A short list of the most-used passwords and obvious school ones; the
// 10-character minimum already rules out most others.
const COMMON = new Set(
  [
    "1234567890",
    "12345678910",
    "123456789a",
    "0123456789",
    "1111111111",
    "0000000000",
    "1q2w3e4r5t",
    "qwertyuiop",
    "asdfghjkl1",
    "password12",
    "password123",
    "password1234",
    "passw0rd123",
    "iloveyou12",
    "abcdefghij",
    "abc1234567",
    "welcome123",
    "letmein123",
    "football12",
    "princess12",
    "sunshine12",
    "qwerty1234",
    "admin12345",
    "administrator",
    "changeme12",
    "school1234",
    "school12345",
    "teacher123",
    "teacher1234",
    "student123",
    "principal1",
    "proprietor",
    "bursar1234",
    "akoso12345",
    "akosoakoso",
    "nigeria123",
    "nigeria1234",
    "lagos12345",
    "abuja12345",
    "jesus12345",
    "godisgood1",
    "godisgood123",
    "blessing12",
    "blessed123",
  ].map((password) => password.toLowerCase())
)

/** True when the password is on the common list, ignoring case. */
export const isCommonPassword = (password: string): boolean =>
  COMMON.has(password.trim().toLowerCase())
