# MiyarHire AI — AI Agentic Hiring System

**The hardest part of hiring is finding the right person for the job.**

MiyarHire AI is a bilingual, agent-driven hiring platform. A coordinated group
of AI agents collects and standardizes applications, extracts selection criteria
from job descriptions, creates role-specific assessments, shortlists suitable
candidates, and conducts structured interviews in English or Arabic. The system
then combines application, assessment, and interview evidence into explainable
scorecards. Recruiters remain responsible for every final hiring decision.

| | |
| --- | --- |
| **Sector** | HR Technology / Applied Artificial Intelligence |
| **Stage** | Research and Development; working prototype, not publicly available |
| **Primary markets** | MENA and international employers |
| **Languages** | English and Arabic, with additional languages planned |
| **Looking for** | Pilot customers, HR and recruitment partners, technology partners, investment |

This folder holds the conference presentation for the project. To read the deck,
open [index.html](index.html) in a browser — there is no build step. The rest of
this file summarizes the project itself; see [docs/](docs/) for how the
presentation is built and where each slide's content comes from.

---

## The problem

Hiring teams receive large numbers of applications in different formats and
languages. Reviewing resumes, designing assessments, scheduling interviews, and
comparing candidates by hand takes significant time and produces inconsistent
results. Information gets missed under pressure, candidates receive different
questions, and criteria are often unclear. Employers hiring across English- and
Arabic-speaking markets face the added burden of localization and right-to-left
interfaces.

Companies need a faster, more structured process — without removing human
judgment, compromising candidate privacy, or turning unexplained AI scores into
automatic hiring decisions.

## The solution

Not an ATS. An applicant tracking system stores applications and waits for a
human to act on each one. This is a full hiring pipeline in which AI agents
carry the work end to end: setting the job-specific exam, administering and
monitoring it, scheduling and conducting the interview, and scoring the
candidate against the job description in real time.

Each agent performs a defined task and passes structured information to the next
stage, which makes the process easier to monitor, audit, and improve than a
single general-purpose assistant.

### Core agents

1. **Candidate Intake & Standardization** — parses English and Arabic resumes
   into one structured format; flags missing information and duplicates.
2. **JD & Resume Criteria** — reads the job description; defines must-have,
   preferred, and knockout criteria with scoring weights for recruiter approval.
3. **Test & Assessment Designer** — creates role-specific technical, behavioral,
   language, and situational tests with matching bilingual rubrics.
4. **Screening & Shortlisting** — ranks candidates against approved criteria and
   gives evidence-based reasons for every recommendation.
5. **Multilingual Interview** — conducts structured text, voice, or video
   interviews in English or Arabic; produces transcripts linked to findings.
6. **Final Evaluation & Scoring** — combines screening, assessment, and
   interview evidence into comparative scorecards for the recruiter.

### Supporting agents

**Scheduling** (time zones, rescheduling, reminders) · **Communication**
(invitations, status updates, recruiter-approved messages) · **Bias &
Compliance** (process consistency, scoring anomalies, consent and audit records)
· **Integration** (ATS, HRIS, email, calendars, approved video tools).

### What the interview analysis does and does not do

Voice and video responses are analysed for job-relevant signals no recruiter can
capture consistently across hundreds of applicants: clarity and structure of
answers, depth of evidence for claimed skills, consistency across resume,
assessment and interview, language proficiency, and assessment-integrity
indicators. Every score traces back to the exact answer or transcript segment
that produced it.

The system does **not** infer emotion, personality, or character from faces,
accents, or voices.

## How it works

1. A recruiter uploads or connects the job description and applications.
2. The platform standardizes candidate data and proposes job-specific criteria.
3. The recruiter approves the criteria, scoring weights, and knockout rules.
4. Candidates complete a relevant assessment when required.
5. The system recommends a shortlist with supporting evidence.
6. Selected candidates complete an English or Arabic interview.
7. The platform produces a final comparative scorecard.
8. The recruiter or hiring manager makes and records the final decision.

## Compared with the traditional process

| Stage | Traditional | With the platform |
| --- | --- | --- |
| Screening | Resumes read by hand in mixed formats and languages; review stops when time runs out | Every application standardized and scored against the same approved criteria |
| Assessment design | Generic tests reused across roles, or skipped | Role-specific assessment and rubric generated from the job description, recruiter-approved |
| Assessment delivery | Unsupervised take-home tests give little assurance about who completed them | Integrity monitoring during delivery; anomalies flagged for human review |
| Scheduling | Days of email and time-zone coordination | Invitations, availability matching, reminders, and rescheduling handled automatically |
| Interviewing | Quality varies by interviewer, day, and fatigue; notes written from memory | Structured English or Arabic interviews, same core questions for every candidate, full transcript retained |
| Evaluation | Candidates compared through impressions recorded hours later | Resume, assessment, and interview evidence combined into a real-time match score and side-by-side scorecard |
| Decision record | The reason for a rejection is rarely documented | Every recommendation links to its evidence, on a complete audit trail |

## Target customers

Medium and large companies processing high application volumes, recruitment
agencies managing several roles and clients, and employers hiring across
English- and Arabic-speaking markets. Secondary: graduate and internship
programs; customer service, hospitality, healthcare, and technology employers;
public-sector and education organizations with structured recruitment needs.

## Business model

- **Software subscription** — monthly or annual, by recruiter seats, hiring
  volume, and enabled features.
- **Usage pricing** — per completed assessment or AI-led interview.
- **Enterprise deployment** — custom integrations, security controls,
  localization, onboarding, and support.
- **Recruitment partner plan** — multi-client workspaces for agencies and
  outsourced hiring providers.

## Trust, fairness, and data protection

Employment decisions significantly affect candidates, so the system is designed
for strong human oversight and must be reviewed against the laws of each market.
Safeguards: recruiter approval of criteria, questions, weights, and knockout
rules; human review before any rejection, shortlisting, or selection decision;
explanations linking scores to job-relevant evidence; regular testing for
language quality, scoring consistency, and bias; a route for candidates to
request clarification or human review; data minimization, informed consent,
encryption, access control, retention limits, and audit records; no emotion
recognition or personality claims from appearance, accent, or voice; and
accessible alternatives when a candidate cannot use a given format.

Legal, HR, and data-protection specialists should confirm the final workflow,
notices, lawful basis, and risk classification before production deployment.

## Technical approach

A modular agent architecture over a shared, permission-based candidate record.
Structured schemas let each agent exchange only the data its task needs.
Versioned job criteria and scoring rubrics keep results traceable, and audit
logs record agent outputs, human approvals, and changes. The stack combines
language models, speech recognition, text-to-speech, document parsing, workflow
orchestration, and secure integrations, selected and evaluated for English and
Arabic accuracy, latency, cost, and security. Recruiters work in a dashboard;
candidates use a mobile-friendly bilingual interface.

## Roadmap

| Phase | Milestone |
| --- | --- |
| 1 | Candidate intake, JD criteria, English/Arabic resume parsing, recruiter dashboard |
| 2 | Assessment creation, explainable screening, human-approved shortlisting |
| 3 | English/Arabic text and voice interviews, transcripts, scheduling, communication |
| 4 | Video support, final comparative scorecards, ATS integrations, analytics |
| 5 | Independent fairness and security evaluation, enterprise pilots, more languages |

## Success measures

Recruiter time saved on initial screening · time from application close to
approved shortlist · assessment and interview completion rates · agreement
between system-assisted and expert human review · English and Arabic
transcription and evaluation quality · candidate satisfaction, accessibility,
and request-for-review rates · fairness indicators across legally appropriate
groups · hiring-manager satisfaction and stage conversion.

## The ask

- Pilot customers hiring at scale in English and Arabic.
- HR and recruitment experts to validate workflows and evaluation rubrics.
- ATS, calendar, communications, and assessment integration partners.
- Investment or grant support for product development, evaluation, compliance
  readiness, and market entry.

---

## Repository layout

```
site/
├── index.html              the 36-slide bilingual presentation
├── README.md               this file
├── assets/
│   ├── css/                styles.css, pages.css, theme.css
│   ├── js/                 script.js, translations.js
│   ├── img/                illustrations, icons, animated GIFs, poster
│   ├── fonts/              bundled Inter faces and licences
│   └── tools/              animation-scenes.html — GIF source scenes
└── docs/
    ├── presentation-guide.md   viewing, editing, keyboard shortcuts, printing
    ├── sources.md              slide-by-slide source map and qualifications
    └── assets.md               illustration inventory and GIF rebuild steps
```

Open `index.html` directly in a browser. Everything works offline except the
stage-one demonstration on slide 27, which streams from YouTube; over `file://`
that slide shows its local poster instead. To play it inline, serve the folder
with `python3 -m http.server` and open `http://localhost:8000/`.

## Source and status

The narrative above is drawn from [`project_Des.txt`](../project_Des.txt). The
product is at research-and-development stage with a working prototype covering
resume screening, job-specific assessment generation, structured bilingual
interviews, and combined scorecards; it is not yet publicly available. Features
beyond that prototype describe the platform design and roadmap rather than
deployed capability. Project name, pricing, target dates, initial market,
funding ask, and team details remain to be confirmed — see
[docs/sources.md](docs/sources.md) for what each claim rests on.
