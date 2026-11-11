// Spike 03 only. A made-up school with 600 students, shaped like an approved results
// snapshot (brief section 11). The numbers exist to fill a realistic report card for
// measuring time and size. The grade bands, ranking and comments below are
// ILLUSTRATIVE, not the results engine and not any school's convention: those come from
// each school's own schemes and the golden files.

interface CardSubject {
  name: string
  ca1: number
  ca2: number
  exam: number
  total: number
  grade: string
  remark: string
  position: number
}

export interface ReportCardData {
  cardId: string
  school: {
    name: string
    motto: string
    address: string
    phone: string
    email: string
    colour: string
  }
  student: {
    name: string
    admissionNumber: string
    gender: string
    className: string
  }
  term: { session: string; term: string; resumes: string; nextTermFees: string }
  subjects: CardSubject[]
  summary: {
    total: number
    average: string
    position: number
    classSize: number
    classAverage: string
    highestAverage: string
    lowestAverage: string
  }
  traits: { affective: [string, number][]; psychomotor: [string, number][] }
  attendance: { present: number; opened: number }
  comments: { formTeacher: string; principal: string }
  verificationCode: string
}

const SUBJECTS = [
  "English Studies",
  "Mathematics",
  "Basic Science",
  "Basic Technology",
  "Social Studies",
  "Civic Education",
  "Christian Religious Studies",
  "Business Studies",
  "Agricultural Science",
  "Home Economics",
  "Physical and Health Education",
  "Computer Studies",
  "Cultural and Creative Arts",
  "Yoruba",
]

const FIRST = [
  "Ada",
  "Bola",
  "Chidi",
  "Dayo",
  "Emeka",
  "Funke",
  "Gbenga",
  "Halima",
  "Ifeoma",
  "Jide",
  "Kemi",
  "Lanre",
  "Musa",
  "Ngozi",
  "Obinna",
  "Precious",
  "Tolu",
  "Uche",
  "Yemi",
  "Zainab",
]
const LAST = ["Test", "Sample", "Example", "Demo", "Placeholder"]
const ARMS = ["A", "B", "C", "D", "E"]
const LEVELS = ["JSS 1", "JSS 2", "JSS 3"]
const AFFECTIVE = [
  "Punctuality",
  "Neatness",
  "Politeness",
  "Honesty",
  "Relationship with others",
  "Leadership",
]
const PSYCHOMOTOR = [
  "Handwriting",
  "Sports",
  "Drawing and painting",
  "Handling of tools",
  "Verbal fluency",
]

// Illustrative bands only (see the note at the top of the file).
const BANDS: [number, string, string][] = [
  [70, "A", "Excellent"],
  [60, "B", "Very good"],
  [50, "C", "Good"],
  [45, "D", "Fair"],
  [40, "E", "Pass"],
  [0, "F", "Fail"],
]

/** A small seeded random generator, so every run produces the same 600 cards. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

function band(total: number): [string, string] {
  const found = BANDS.find(([min]) => total >= min) ?? BANDS[BANDS.length - 1]
  return found === undefined ? ["F", "Fail"] : [found[1], found[2]]
}

/** Standard competition ranking (1, 2, 2, 4), highest first. */
function rank(values: number[]): number[] {
  return values.map((v) => 1 + values.filter((other) => other > v).length)
}

const COMMENTS = [
  "A hardworking student who participates well in class. Keep it up.",
  "Good effort this term. More attention to Mathematics will help.",
  "A pleasant and respectful student. Needs to read more at home.",
  "Shows steady improvement. Should be more punctual.",
  "An excellent term. A good example to classmates.",
]

/** Builds the 600 cards: 15 classes of 40, across JSS 1 to JSS 3. */
export function buildSchool(): ReportCardData[] {
  const random = seeded(20271)
  const cards: ReportCardData[] = []
  const school = {
    name: "Greenfield Model College (fake)",
    motto: "Knowledge and Character",
    address: "12 Example Road, Ikeja, Lagos",
    phone: "+234 800 000 0000",
    email: "office@greenfield.example",
    colour: "#1F5130",
  }
  let admission = 1
  for (const level of LEVELS) {
    for (const arm of ARMS) {
      const className = `${level}${arm}`
      const students = Array.from({ length: 40 }, () => {
        const ability = 35 + random() * 55
        const subjects = SUBJECTS.map((name) => {
          const score = (max: number): number =>
            Math.max(
              0,
              Math.min(
                max,
                Math.round((ability / 100) * max + (random() - 0.5) * max * 0.4)
              )
            )
          const ca1 = score(20)
          const ca2 = score(20)
          const exam = score(60)
          const total = ca1 + ca2 + exam
          const [grade, remark] = band(total)
          return { name, ca1, ca2, exam, total, grade, remark, position: 0 }
        })
        const total = subjects.reduce((sum, s) => sum + s.total, 0)
        const n = String(admission++).padStart(4, "0")
        return {
          name: `${FIRST[Math.floor(random() * FIRST.length)] ?? "Ada"} ${LAST[Math.floor(random() * LAST.length)] ?? "Test"}`,
          admissionNumber: `GMC/2027/${n}`,
          gender: random() < 0.5 ? "Female" : "Male",
          subjects,
          total,
          average: total / subjects.length,
        }
      })
      // Subject positions, then class positions, within the arm.
      SUBJECTS.forEach((_, i) => {
        const positions = rank(students.map((s) => s.subjects[i]?.total ?? 0))
        students.forEach((s, j) => {
          const subject = s.subjects[i]
          if (subject !== undefined) {
            subject.position = positions[j] ?? 0
          }
        })
      })
      const averages = students.map((s) => s.average)
      const classPositions = rank(averages)
      const classAverage = averages.reduce((a, b) => a + b, 0) / averages.length
      students.forEach((s, j) => {
        cards.push({
          cardId: `${className}-${s.admissionNumber}`,
          school,
          student: {
            name: s.name,
            admissionNumber: s.admissionNumber,
            gender: s.gender,
            className,
          },
          term: {
            session: "2027/2028",
            term: "First term",
            resumes: "05/01/2028",
            nextTermFees: "₦185,000",
          },
          subjects: s.subjects,
          summary: {
            total: s.total,
            average: s.average.toFixed(2),
            position: classPositions[j] ?? 0,
            classSize: students.length,
            classAverage: classAverage.toFixed(2),
            highestAverage: Math.max(...averages).toFixed(2),
            lowestAverage: Math.min(...averages).toFixed(2),
          },
          traits: {
            affective: AFFECTIVE.map((t) => [t, 2 + Math.floor(random() * 4)]),
            psychomotor: PSYCHOMOTOR.map((t) => [
              t,
              2 + Math.floor(random() * 4),
            ]),
          },
          attendance: { present: 58 + Math.floor(random() * 8), opened: 65 },
          comments: {
            formTeacher: COMMENTS[Math.floor(random() * COMMENTS.length)] ?? "",
            principal: "Promising result. We expect even more next term.",
          },
          verificationCode: `GMC-${s.admissionNumber.slice(-4)}-${Math.floor(
            random() * 1e8
          )
            .toString(36)
            .toUpperCase()}`,
        })
      })
    }
  }
  return cards
}

/** "1st", "2nd", "3rd", "4th", "11th", "21st". */
export function ordinal(n: number): string {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${String(n)}th`
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"
  return `${String(n)}${suffix}`
}
