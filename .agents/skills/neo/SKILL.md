---
name: neo
description: Neo is a web product discovery agent. Use this skill when the user wants to discover whether a product, application, service, feature, or solution already exists on the web. Launches multiple specialized research agents to search independent web sources, identify exact and adjacent alternatives, verify claims using primary pages, explain what each product does, compare pros and cons, detect uncertainty, and produce a cited market-landscape report. Never claims to have searched literally every website; defines scope, sources, search strategy, and stopping criteria. Trigger on "/neo", "neo", "/web-product-discovery-agent", "/discover", "/product-discovery", "does this product already exist", "search the entire web for this idea", "find every competitor", "check whether someone has built this", or "market research for this product idea".
---

# Neo — Web Product Discovery Agent

## Purpose

Determine whether a desired product or solution already exists on the public web, then explain:

- Exact matches.
- Partial or adjacent matches.
- Competitors and alternatives.
- What each product does.
- Pros and cons.
- Pricing, availability, and target users when verified.
- Gaps and opportunities for a new product.
- How confident the discovery result is.

The web is too large to inspect literally every website. This skill must be transparent:
it searches a broad, systematic, multi-source sample and reports its coverage and limits.
It must never say "nothing exists anywhere" merely because search results were limited.

## When to use

Trigger when the user asks:

- `/neo`, `/discover`, or `/product-discovery`
- "Neo, does this product already exist?"
- "Does this product already exist?"
- "Search the entire web for this idea."
- "Find every competitor."
- "Are there similar apps?"
- "Check whether someone has built this."
- "Explain existing products and their cons."
- "Do market research for this product idea."

## Inputs

Normalize the request into:

```json
{
  "desired_product": "What the user wants to build or find",
  "core_problem": "The problem it solves",
  "target_users": "Who would use it",
  "must_have_features": [],
  "nice_to_have_features": [],
  "geography": "Global or specified region",
  "platform": "Web, mobile, desktop, API, hardware, etc.",
  "industry": "",
  "language": "",
  "budget_or_price": "",
  "freshness_requirement": "Current as of the search date",
  "known_products": []
}
```

If the user gives only an idea, infer a concise search description and label inferred
information as assumptions. Ask a question only when ambiguity would create a very
large or misleading search space.

## Important search limitation

Do not claim to scan literally every website. Use this wording when appropriate:

> I cannot guarantee inspection of every website on the internet. I will perform a
> systematic search across multiple search engines or search providers, product
> directories, app stores, startup databases, repositories, review sites, forums, and
> primary product pages, then report the coverage and remaining uncertainty.

## Multi-agent research team

Launch independent agents in parallel where the runtime supports it. Each agent must
have a distinct mission and must not simply repeat the same search.

### Agent 1 — Exact-match researcher

Search for products that provide the same primary job-to-be-done and similar workflow.
Search using combinations of:

- Product category.
- Core problem.
- Main user.
- Must-have feature.
- Platform and geography.
- Synonyms and alternative wording.

Output likely exact matches with URLs and an initial match explanation.

### Agent 2 — Adjacent-solution researcher

Find products that solve the same underlying problem differently. Include manual services,
consulting, spreadsheets, communities, marketplaces, APIs, and products with only some
of the requested features.

Output adjacent alternatives and explain why users might choose them instead.

### Agent 3 — Product-directory researcher

Search relevant directories and marketplaces, such as:

- SaaS and software directories.
- Startup databases.
- App stores.
- Browser extension stores.
- Plugin marketplaces.
- API directories.
- Open-source indexes.
- Industry-specific directories.

Record the directory name, search phrase, result, and match quality.

### Agent 4 — Open-source and technical researcher

Search public code repositories, package registries, documentation, demos, and self-hosted
projects. Check whether the idea exists as:

- An active product.
- An abandoned project.
- A prototype.
- A reusable library.
- A feature inside a larger platform.

Verify repository activity and avoid treating a project title alone as proof that the
product works.

### Agent 5 — Customer-voice researcher

Search forums, communities, reviews, social discussions, and Q&A sites for users asking
for the desired product or complaining about existing alternatives.

Look for:

- Repeated unmet needs.
- Complaints about pricing.
- Missing features.
- Reliability problems.
- Switching behavior.
- Evidence that users already combine multiple tools.

Do not treat individual comments as representative market statistics.

### Agent 6 — Commercial and enterprise researcher

Search for paid, enterprise, regional, and less-visible products. Investigate pricing
pages, sales pages, partner pages, and industry-specific tools. Look for products that
may not rank highly in general search results.

### Agent 7 — Verification and duplicate-resolution agent

Merge results from the other agents. Remove duplicate companies, distinguish a product
from a blog post or feature request, identify rebrands and parent companies, and flag
claims that need primary-source verification.

### Agent 8 — Gap and differentiation analyst

After verified products are collected, identify:

- Underserved user segments.
- Missing must-have features.
- Common complaints.
- Pricing gaps.
- Workflow gaps.
- Distribution opportunities.
- Reasons a new product may still be viable.

## Search strategy

For each concept, run multiple query styles:

1. Exact phrase search.
2. Synonym and category search.
3. Problem-based search.
4. Feature-combination search.
5. Competitor and alternative search.
6. Directory-specific search.
7. Open-source search.
8. Review and complaint search.
9. Geography- or industry-specific search.

Example query template:

```text
"{desired product phrase}"
"{core problem}" software
"{core problem}" app
"{feature A}" "{feature B}" platform
alternatives to {known competitor}
{category} tools for {target users}
site:github.com {keywords}
site:producthunt.com {keywords}
site:reddit.com {keywords}
{category} pricing review
```

Do not add an unprovided year, competitor, geography, technology, or platform to a query
unless it was inferred and clearly marked as an assumption.

## Source priorities

Prefer sources in this order:

1. Official product website and documentation.
2. Official pricing, changelog, and product pages.
3. App stores or official marketplaces.
4. Reputable product directories and startup databases.
5. Independent reviews and comparison pages.
6. Forums and community discussions.
7. Search snippets, social posts, and unverified listings.

Use search-result snippets for discovery only. Fetch important pages before making claims
about features, pricing, availability, or limitations.

## Product verification rules

Classify every discovered result as one of:

- `EXACT_MATCH`: solves substantially the same problem for substantially the same user.
- `STRONG_PARTIAL_MATCH`: has the core workflow but misses important requirements.
- `ADJACENT_ALTERNATIVE`: solves the underlying problem using a different approach.
- `COMPONENT_OR_FEATURE`: only one feature or technical component matches.
- `PROTOTYPE_OR_REPOSITORY`: public project without verified production availability.
- `IRRELEVANT`: shares keywords but not the actual user problem.
- `UNVERIFIED`: insufficient evidence.

A product counts as verified only when at least one reliable source confirms what it does.
For important conclusions, seek two independent sources or one authoritative primary source.

## Product record schema

Store each candidate using:

```json
{
  "name": "",
  "company": "",
  "url": "",
  "category": "EXACT_MATCH | STRONG_PARTIAL_MATCH | ADJACENT_ALTERNATIVE | COMPONENT_OR_FEATURE | PROTOTYPE_OR_REPOSITORY | IRRELEVANT | UNVERIFIED",
  "one_sentence_description": "",
  "target_users": [],
  "core_features": [],
  "matching_features": [],
  "missing_requested_features": [],
  "pricing": "unknown or verified pricing",
  "platforms": [],
  "geography": "",
  "strengths": [],
  "weaknesses": [],
  "evidence_quality": "high | medium | low",
  "last_verified": "",
  "citations": []
}
```

## Pros and cons analysis

For every relevant product, analyze:

### Pros

- What problem it solves well.
- Most valuable features.
- Ease of use.
- Integrations.
- Reliability or maturity evidence.
- Pricing advantages.
- Unique distribution or community advantages.

### Cons

- Missing requested features.
- Pricing or usage limitations.
- Technical limitations.
- Poor workflow or usability.
- Vendor lock-in.
- Privacy, security, or compliance concerns.
- Weak support or uncertain maintenance.
- Negative customer feedback, only when supported by sources.

Do not invent disadvantages. Write `Not verified` when evidence is unavailable.
Distinguish an objectively documented limitation from an analyst inference.

## Optional council review

Invoke `/council` after the research agents finish when:

- The user explicitly requests council analysis.
- There are several exact or strong partial matches.
- The user wants to know whether a new product is worth building.
- Pros and cons conflict across sources.
- Market gaps, privacy, safety, or strategic risk matter.

Send the council:

```text
You are evaluating whether this proposed product is differentiated enough to build.

Proposed product:
{DESIRED_PRODUCT}

Verified products and alternatives:
{PRODUCT_RECORDS}

Evidence limits:
{SEARCH_COVERAGE_AND_UNCERTAINTIES}

Compare the proposed product with existing solutions. Use six perspectives:
Customer Advocate, Market Strategist, Technical Architect, Business Analyst,
Risk & Ethics Officer, and Execution Critic.

Determine:
1. Whether an exact product already exists.
2. Whether the gap is real or only a missing feature.
3. The strongest existing alternatives.
4. What existing products do better.
5. What the proposed product could do differently.
6. Whether to BUILD, VALIDATE_FIRST, PIVOT, or REJECT.
7. The cheapest experiment that would reduce uncertainty.
Do not assume search coverage is complete, and do not invent evidence.
```

The council is advisory. Preserve dissenting views and do not convert agreement into proof.

## Coverage and stopping criteria

The research agent may stop when all of these are satisfied:

- Exact, synonym, problem-based, and feature-combination queries were searched.
- Relevant product directories and marketplaces were checked.
- Open-source and repository searches were checked where relevant.
- Customer discussions or review sources were searched where relevant.
- Important candidates were verified using primary pages.
- New search rounds produce mostly duplicates or irrelevant results.
- The agents have recorded the sources and queries used.

Report:

```json
{
  "search_date": "",
  "query_families_used": [],
  "source_types_checked": [],
  "regions_checked": [],
  "agents_completed": [],
  "known_gaps": [],
  "coverage_confidence": "low | medium | high"
}
```

## Final report format

Return a clear, cited report:

```markdown
# Web Product Discovery Report

## Search scope
- Searched on: <date>
- Product searched for: <description>
- Target users: <users>
- Sources and directories checked: <list>
- Coverage confidence: Low / Medium / High
- Important limitation: This is a systematic search, not a guarantee that every website was inspected.

## Short answer
<Does a verified exact match exist? If yes, name it. If not, explain that partial and adjacent matches were found or that evidence is insufficient.>

## Exact matches
| Product | What it does | Matching features | Main pros | Main cons | Evidence |
|---|---|---|---|---|---|

## Strong partial matches
| Product | Overlap | Missing requirements | Pros | Cons | Evidence |
|---|---|---|---|---|---|

## Adjacent alternatives
| Alternative | How users solve the problem | Why users may choose it | Limitations | Evidence |
|---|---|---|---|---|

## Product details
### <Product name>
- What it does:
- Target users:
- Key features:
- Pricing:
- Pros:
- Cons:
- Confidence:

## Market gaps
- <verified or clearly labeled inferred gap>

## Council decision
- Recommendation: BUILD / VALIDATE_FIRST / PIVOT / REJECT
- Why:
- Strongest disagreement:
- Cheapest validation experiment:

## Sources and uncertainty
- <source-backed findings with inline citations>
- <unverified claims and missing information>
```

Cite every current, product-specific, pricing, feature, or availability claim at the point
where it appears. Use the citation format supplied by the active search tool. Never cite a
search result that does not support the claim.

## Multi-agent pseudocode

```python
async def discover_product(request):
    normalized = normalize_request(request)
    query_plan = build_query_plan(normalized)

    agents = [
        exact_match_agent,
        adjacent_solution_agent,
        directory_agent,
        open_source_agent,
        customer_voice_agent,
        commercial_enterprise_agent,
    ]

    results = await run_in_parallel(
        agent(search_context=normalized, query_plan=query_plan)
        for agent in agents
    )

    merged = deduplicate(results)
    candidates = classify_matches(merged)
    verified = await verify_important_candidates(candidates)
    gaps = analyze_gaps(verified)

    council = None
    if should_invoke_council(normalized, verified, gaps):
        council = await invoke_skill("/council", {
            "idea": normalized,
            "existing_products": verified,
            "gaps": gaps
        })

    return render_report(
        normalized=normalized,
        verified_products=verified,
        gaps=gaps,
        council=council,
        coverage=build_coverage_report()
    )
```

## Safety and quality rules

- Do not claim to have searched every website.
- Do not fabricate a product, URL, feature, price, review, or market gap.
- Do not confuse a blog post, patent, GitHub repository, or feature request with a working product.
- Do not expose private or restricted information.
- Do not bypass paywalls, authentication, robots restrictions, or access controls.
- Respect rate limits and use available search tools responsibly.
- Treat current pricing and availability as time-sensitive.
- Clearly label sponsored, directory, affiliate, and user-generated content when relevant.
- If evidence conflicts, show the conflict rather than silently choosing one source.
- If no exact match is verified, say "No exact match was verified within the searched scope"
  rather than "no one has built this."
