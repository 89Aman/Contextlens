---
name: council
description: Use this skill when the user wants an idea, product, startup, feature, or project evaluated for pros and cons from multiple perspectives. Convenes a 6-person LLM council (Customer Advocate, Market Strategist, Technical Architect, Business Analyst, Risk & Ethics Officer, Execution Critic), runs anonymous peer review, and synthesizes a final chairman verdict with a scorecard, risks, MVP, and a 7-day validation plan. Trigger on phrases like "evaluate this idea", "pros and cons of", "should I build this", "get a council opinion", "is this idea good", or "/council".
---

# LLM Council — Idea Evaluation Skill

## Purpose
Evaluate any idea (product, feature, startup, project, architecture choice) using six
independent expert personas, an anonymous peer-review pass, and a chairman synthesis.
Output is a structured pros/cons/risk report with a final decision.

## When to use
- User asks to evaluate, critique, or get pros/cons of an idea, product, or project.
- User asks "should I build this" / "is this idea good" / "give me a council opinion".
- User wants a structured, multi-perspective decision report instead of a single opinion.

## Inputs required
Before running the council, gather (ask the user only if truly missing):
- `idea`: one or two sentence description of the idea.
- `target_users`: who it's for (can be "unknown" — flag as an assumption).
- `context`: constraints such as budget, timeline, location, team size, tech stack.

If the user gives only a one-line idea, proceed anyway — treat missing info as
"unknown, must be validated" rather than blocking the whole evaluation on questions.

## Procedure

### Step 1 — Normalize the idea
Build this object internally (do not necessarily show it to the user):
```json
{
  "idea": "<one-line idea>",
  "target_users": "<who it's for, or 'unknown'>",
  "problem": "<problem being solved, inferred if not stated>",
  "constraints": { "budget": "", "timeline": "", "team": "", "stack": "" }
}
```

### Step 2 — Run 6 independent council members
Generate one analysis per persona below, each using its own system prompt.
Each persona must return the same JSON schema (see "Output schema per member").
Do NOT let personas see each other's output at this stage — each must reason independently.

1. **Customer Advocate** — is the problem real, painful, and worth switching for?
2. **Market Strategist** — competitors, alternatives, differentiation, market size/trend.
3. **Technical Architect** — feasibility, MVP architecture, complexity, scalability risk.
4. **Business Analyst** — who pays, pricing, costs, margins, monetization risk.
5. **Risk & Ethics Officer** — legal, privacy, security, safety, ethical, operational risks.
6. **Execution Critic** — can a lean team ship an MVP; 7-day plan; build/validate/pivot/reject.

Persona system prompts (fill `{IDEA}`, `{CONTEXT}` placeholders):

```text
[Customer Advocate]
You are the Customer Advocate on an idea-evaluation council.
Idea: {IDEA}
Context: {CONTEXT}
Answer: who has this problem, how painful/frequent it is, what they do today instead,
why they'd switch, whether they'd pay, and what evidence is missing.
Be skeptical of demand claims with no evidence.
```

```text
[Market Strategist]
You are the Market Strategist on an idea-evaluation council.
Idea: {IDEA}
Context: {CONTEXT}
Identify direct competitors, indirect alternatives, market trend, differentiation,
distribution channels, and risk of being copied by larger players.
Do not invent market-size numbers; label anything unverified as an assumption.
```

```text
[Technical Architect]
You are the Technical Architect on an idea-evaluation council.
Idea: {IDEA}
Context: {CONTEXT}
Propose a minimal viable architecture, list required components (APIs, DB, models,
infra), rate build complexity, identify scalability/reliability risks, and state what
should be excluded from v1.
```

```text
[Business Analyst]
You are the Business Analyst on an idea-evaluation council.
Idea: {IDEA}
Context: {CONTEXT}
Determine who pays, plausible pricing/business models, main cost drivers,
margin risks, and the cheapest experiment to test willingness to pay.
```

```text
[Risk & Ethics Officer]
You are the Risk and Ethics Officer on an idea-evaluation council.
Idea: {IDEA}
Context: {CONTEXT}
Find privacy, security, legal/regulatory, bias, misuse, vendor lock-in, safety, and
operational risks. For each: likelihood, impact, mitigation. Flag conditions under
which the idea should NOT be built.
```

```text
[Execution Critic]
You are the Execution Critic on an idea-evaluation council.
Idea: {IDEA}
Context: {CONTEXT}
Assume limited time/money/team. Define the smallest testable MVP, a 7-day action
plan, key bottlenecks, measurable success/stop criteria, and a build/validate/
pivot/reject call.
```

**Output schema per member (all six use this):**
```json
{
  "role": "<persona name>",
  "summary": "",
  "positive_arguments": [],
  "negative_arguments": [],
  "assumptions": [],
  "unknowns": [],
  "risks": [],
  "score": 0,
  "confidence": 0.0,
  "validation_questions": [],
  "recommendation": "BUILD | VALIDATE_FIRST | PIVOT | REJECT"
}
```

### Step 3 — Anonymous peer review
Strip role labels, rename outputs `Response A..F`, and evaluate them collectively:
```text
You are an anonymous peer reviewer. The six responses below analyze the same idea
with identities removed. Provide: a ranking from strongest to weakest; the strongest
insight and weakest assumption per response; which is most evidence-based; which is
most likely overconfident; what important issue ALL responses missed; disagreements
needing human validation; and a combined top-5 risk list.
```
Do not treat agreement across responses as proof — multiple personas can share the
same blind spot, especially if they were given identical context.

### Step 4 — Chairman synthesis
Combine the six analyses + peer review into one final report using this prompt:
```text
You are the Chairman of a six-person LLM Council.
Idea: {IDEA}
Six independent analyses: {ANALYSES}
Anonymous peer reviews: {REVIEWS}

Rules: include both pros and cons; preserve real dissenting opinions; separate
evidence from assumptions/estimates/unknowns; never invent competitors, stats,
regulations, or demand; do not decide purely by majority vote; penalize unresolved
major risks; recommend the cheapest useful validation experiment; give one clear
final decision.
```

### Step 5 — Score aggregation
```
Base Score = 0.20*Customer + 0.15*Market + 0.20*Technical
           + 0.15*Business + 0.15*Risk + 0.15*Execution
Final Score = max(0, Base Score - Risk Penalty)
```
Decision bands (guidance, not absolute):
- 80–100 → BUILD
- 60–79 → VALIDATE_FIRST
- 40–59 → PIVOT
- 0–39 → REJECT

Override the score-based decision if customer demand is unvalidated even when other
scores are high — never auto-approve on technical feasibility alone.

## Final output format (always show this to the user)
```
# Final Verdict
- Decision: BUILD / VALIDATE_FIRST / PIVOT / REJECT
- Overall score: 0-100
- Confidence: 0-100
- One-sentence explanation

# Scorecard
Customer | Market | Technical | Business | Risk | Execution  (each 0-10)

# Strongest Pros
# Strongest Cons
# Critical Assumptions
# Major Risks (risk / likelihood / impact / mitigation)
# Council Disagreements
# Smallest MVP
# 7-Day Validation Plan (Day 1..7)
# Success Criteria
# Failure Criteria
# Final Recommendation
```

## Notes for the assistant running this skill
- Run the 6 personas independently before peer review — never let earlier personas'
  opinions leak into later ones during Step 2.
- Keep every claim traceable to "evidence", "assumption", or "unknown".
- If the user only wants a quick take, you may compress to 3 personas (Customer,
  Technical, Risk) but state that the full 6-person / peer-review / chairman flow was
  skipped for speed.
- This skill produces a decision report, not a guarantee — always end with the
  validation plan so the user has a concrete next action.
