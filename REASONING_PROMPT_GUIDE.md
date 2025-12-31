# Reasoning Prompt Guide

## Overview

X-Ray's reasoning generation answers the critical question: **"Why did the system make this decision?"**

The reasoning prompt has been optimized to provide:
- ✅ **Short, actionable explanations** (15-25 words max)
- ✅ **Causality-focused**: Explains WHY, not just WHAT
- ✅ **Debug-friendly**: Includes specific numbers, thresholds, and failure reasons
- ✅ **No fluff**: Every word adds value

## Key Improvements

### Before (Old Prompt)
```
"Generated 2 search keywords from product title and category using gpt-4 to capture core product attributes and common search patterns"
```
- ❌ Too long (18 words but wordy)
- ❌ Describes what happened, not why
- ❌ Doesn't explain the decision rationale

### After (New Prompt)
```
"Only 3/10 candidates met minRating≥4.0 AND minReviews≥100; 7 failed due to low ratings/reviews"
```
- ✅ Concise (13 words)
- ✅ Explains WHY only 3 passed (decision criteria)
- ✅ Debug-friendly: Shows exact thresholds and failure reasons

## Prompt Philosophy

The new prompt is designed around **3 core questions**:

1. **WHY did this step produce this output?** (decision rationale)
2. **WHAT key metrics or thresholds drove the decision?** (specific numbers)
3. **If something looks wrong, WHAT would explain it?** (debug clues)

### Key Principles

1. **CAUSALITY**: Explain WHY the numbers are what they are
   - Bad: "Filtered 10 candidates down to 3"
   - Good: "Only 3/10 met minRating≥4.0 threshold; 7 failed low ratings"

2. **THRESHOLDS**: Always mention decision criteria
   - Bad: "Retrieved some candidates from search results"
   - Good: "Limited to top 10 of 2,847 matches to prevent downstream overload"

3. **TRADE-OFFS**: Explain why system chose this over alternatives
   - Bad: "Selected HydroFlask as the winner"
   - Good: "Selected HydroFlask (4.7★, 12K reviews) because highest review_count×rating score"

4. **DEBUG CLUES**: If output seems unexpected, explain what caused it
   - Bad: "Validated 1000 records"
   - Good: "Rejected 20/1000 records (2%) due to missing required fields or malformed data"

5. **NO FLUFF**: Every word should add information
   - Bad: "The step successfully processed the input data and returned the output"
   - Good: "Converted 500 XML records to JSON for downstream compatibility"

## Response Format

The prompt enforces:
- **Length**: 1 SHORT sentence (15-25 words max)
- **Focus**: Answer "WHY this decision?" not "what happened?"
- **Numbers**: Always include specific counts, thresholds, percentages
- **Causality**: Explain cause → effect relationships
- **Plain text**: No JSON, no labels, no code fences

## Example Patterns

### 1. Filtering Steps
**Focus**: Why some passed and others failed

```typescript
Input: { candidates: 10, filters: { minRating: 4.0, minReviews: 100 } }
Output: { passed: 3, failed: 7 }

✅ GOOD: "Only 3/10 candidates met minRating≥4.0 AND minReviews≥100; 7 failed due to low ratings/reviews"
❌ BAD: "Filtered 10 candidates down to 3 using the provided criteria"
```

**Why this works**:
- Shows exact thresholds (≥4.0, ≥100)
- Explains WHY 7 failed (low ratings/reviews)
- Debug-friendly: If 7 failures seems high, developer knows to check rating thresholds

### 2. Search Steps
**Focus**: Why this number of results was returned

```typescript
Input: { keyword: "water bottle", limit: 50 }
Output: { total_results: 2847, candidates_fetched: 10 }

✅ GOOD: "Limited to 10 candidates despite 2,847 matches to prevent overwhelming downstream LLM evaluation"
❌ BAD: "The search returned 10 candidates from a total of 2,847 results"
```

**Why this works**:
- Explains the trade-off (prevent overwhelming downstream)
- Shows WHY 10 was chosen (not arbitrary)
- Debug-friendly: Developer understands the system's reasoning

### 3. LLM Evaluation Steps
**Focus**: Why some candidates were rejected

```typescript
Input: { candidates: 6, reference_product: "Steel Bottle" }
Output: { confirmed: 4, false_positives: 2, rejected_reasons: ["not water bottle", "accessory"] }

✅ GOOD: "Rejected 2/6 as false positives (accessories/wrong category) using semantic analysis of title+description"
❌ BAD: "The LLM evaluated 6 candidates and confirmed 4 were competitors"
```

**Why this works**:
- Explains WHY 2 were rejected (specific reasons)
- Shows HOW decision was made (semantic analysis)
- Debug-friendly: Developer can verify if rejection was correct

### 4. Ranking & Selection Steps
**Focus**: Why this specific item was selected

```typescript
Input: { candidates: 5, criteria: ["review_count", "rating"] }
Output: { selected: { title: "HydroFlask", rating: 4.7, reviews: 12000 } }

✅ GOOD: "Selected HydroFlask (4.7★, 12K reviews) because highest review_count×rating score among 5 candidates"
❌ BAD: "Ranked 5 candidates and selected HydroFlask as the top result"
```

**Why this works**:
- Shows WHY this was chosen (highest score)
- Includes specific metrics (4.7★, 12K reviews)
- Debug-friendly: Developer can verify if selection criteria were correct

### 5. Data Validation Steps
**Focus**: Why some records were rejected

```typescript
Input: { records: 1000 }
Output: { valid: 980, invalid: 20, error_types: ["missing_field", "invalid_format"] }

✅ GOOD: "Rejected 20/1000 records (2%) due to missing required fields or malformed data"
❌ BAD: "Validated 1000 records and found 980 valid ones"
```

**Why this works**:
- Shows percentage (2%) for quick assessment
- Explains WHY invalid (missing fields, malformed)
- Debug-friendly: Developer knows what to fix in source data

### 6. Transformation Steps
**Focus**: Why transformation was needed

```typescript
Input: { raw_data: [...], format: "xml" }
Output: { normalized: 500, format: "json" }

✅ GOOD: "Converted 500 XML records to JSON format for downstream processing compatibility"
❌ BAD: "Transformed the data from XML to JSON format"
```

**Why this works**:
- Explains WHY (downstream compatibility)
- Shows count (500 records)
- Purpose-driven (not just "what happened")

## Technical Implementation

### Prompt Structure

```typescript
const prompt = `You are analyzing a pipeline step to answer: "Why did the system make this decision?"

## YOUR GOAL
Provide a SHORT, ACTIONABLE explanation that helps developers DEBUG issues by answering:
1. WHY did this step produce this output? (the decision rationale)
2. WHAT key metrics or thresholds drove the decision?
3. If something looks wrong, WHAT would explain it?

## STEP DATA
Step: ${step.name}
Input: ${JSON.stringify(step.input ?? {}, null, 2)}
Output: ${JSON.stringify(step.output ?? {}, null, 2)}

## RESPONSE RULES
- Length: 1 SHORT sentence (15-25 words max)
- Focus: Answer "WHY this decision?" not "what happened?"
- Include: Specific numbers (counts, thresholds, percentages)
- Causality: Explain cause → effect relationships
- Debug-friendly: Mention what might be wrong if numbers look suspicious
- Format: Plain text only (no JSON, no labels, no code fences)

... [examples and principles] ...
`;
```

### OpenAI Configuration

```typescript
const completion = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: prompt }],
  max_tokens: 80, // Enough for 15-25 word sentences
  temperature: 0.1, // Low for consistent, factual reasoning
});
```

### Fallback Strategy

X-Ray uses a **two-tier reasoning system**:

1. **Fast Numeric Reasoning** (no API cost)
   - For simple numeric transformations
   - Examples: "📊 3/10 passed", "🔍 2847→10 results"
   - Instant, zero latency

2. **LLM-Powered Reasoning** (OpenAI API)
   - For complex decisions requiring causality
   - Examples: "Only 3/10 met minRating≥4.0 AND minReviews≥100; 7 failed due to low ratings/reviews"
   - High-quality, debug-friendly

```typescript
// Try numeric reasoning first (free)
const numericReasoning = generateNumericReasoning(step);
if (numericReasoning) {
  return numericReasoning;
}

// Fall back to LLM if needed
if (process.env.OPENAI_API_KEY) {
  return await openaiExplainStep(step);
}

// Final fallback
return `✅ ${step.name} processed (${step.durationMs ?? 0}ms)`;
```

## Usage in Production

### 1. Server-Side Reasoning (Default)
```typescript
// demo-app/src/1-basic-example.ts
const xray = new XRay(executionId, { pipeline: 'my-pipeline' });
xray.startStep('filter_candidates', { candidates: 10 });
// ... do work ...
xray.endStep('filter_candidates', { passed: 3, failed: 7 });

const execution = xray.end({ status: 'success' });
await xrayClient.saveExecution(execution); // No reasoning yet

// When user views execution in dashboard:
// → ExecutionReasoningTrigger calls /api/reasoning/process
// → ReasoningQueue generates reasoning using NEW PROMPT
// → Short, actionable explanations appear in UI
```

### 2. Client-Side Reasoning (Advanced)
```typescript
// demo-app/src/7-standalone-reasoning.ts
import { ReasoningQueue, createOpenAIGenerator } from 'xray-sdk';

const generator = createOpenAIGenerator(openai); // Uses NEW PROMPT
const queue = new ReasoningQueue(storage, generator);
await queue.processExecution(executionId);

const executionWithReasoning = await storage.getExecutionById(executionId);
await xrayClient.saveExecution(executionWithReasoning);
```

## Testing the New Prompt

Run the test script to see examples:

```bash
cd x-ray
npx tsx test-reasoning-prompt.ts
```

Expected output:
```
Test 1: Filtering Step
✅ Reasoning: Only 3/10 candidates met minRating≥4.0 AND minReviews≥100; 7 failed due to low ratings/reviews

Test 2: Search Step
✅ Reasoning: Limited to 10 candidates despite 2,847 matches to prevent overwhelming downstream LLM evaluation

Test 3: Data Validation
✅ Reasoning: Rejected 20/1000 records (2%) due to missing required fields or malformed data
```

## Benefits for Debugging

### Before (Old Prompt)
```
User: "Why are only 3 competitors showing up?"
Developer: *Opens code, searches logs, checks database*
Developer: "Let me trace through the filtering logic..."
```

### After (New Prompt)
```
User: "Why are only 3 competitors showing up?"
Developer: *Looks at X-Ray reasoning*
Reasoning: "Only 3/10 candidates met minRating≥4.0 AND minReviews≥100; 7 failed due to low ratings/reviews"
Developer: "Ah, the rating threshold is too high. Let me lower it to 3.5"
```

**Time saved**: 10 minutes → 10 seconds

## Summary

The new reasoning prompt provides:

✅ **Immediate understanding**: Users know WHY at a glance
✅ **Debug-friendly**: Specific numbers and failure reasons
✅ **Causality-focused**: Explains decisions, not just outcomes
✅ **Concise**: 15-25 words, no fluff
✅ **Production-ready**: Works with both server-side and client-side reasoning

This dramatically improves the X-Ray debugging experience by answering the most important question: **"Why did the system make this decision?"**
