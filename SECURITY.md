# X-Ray Security Best Practices

## 🔒 API Key Security

### ✅ SAFE: Client-Side Reasoning (Recommended)

**Pattern:** Generate reasoning on the developer's infrastructure, then send execution WITH reasoning to X-Ray server.

```typescript
import { XRay, MemoryStorage, ReasoningQueue, createOpenAIGenerator } from 'xray-sdk';
import OpenAI from 'openai';
import { createXRayClient } from './lib/xrayClient';

// Step 1: Track execution
const xray = new XRay(executionId, { pipeline: 'my-pipeline' });
xray.startStep('process_data', { input: 'data' });
// ... do work ...
xray.endStep('process_data', { output: 'result' });
const execution = xray.end({ status: 'success' });

// Step 2: Generate reasoning CLIENT-SIDE using YOUR OpenAI key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const storage = new MemoryStorage();
await storage.saveExecution(execution);

const generator = createOpenAIGenerator(openai);
const reasoningQueue = new ReasoningQueue(storage, generator);
await reasoningQueue.processExecution(executionId);

// Step 3: Get execution WITH reasoning
const executionWithReasoning = await storage.getExecutionById(executionId);

// Step 4: Send to X-Ray server (reasoning already included)
const client = createXRayClient();
await client.saveExecution(executionWithReasoning);
```

**Benefits:**
- ✅ Your OpenAI API key **NEVER** leaves your infrastructure
- ✅ Full control over API costs
- ✅ No trust required in X-Ray server
- ✅ Can work offline
- ✅ Zero security risk

---

### ✅ SAFE: Server-Side Reasoning (Default)

**Pattern:** Send execution WITHOUT reasoning, let X-Ray server generate reasoning using its own OpenAI key.

```typescript
import { XRay } from 'xray-sdk';
import { createXRayClient } from './lib/xrayClient';

// Step 1: Track execution
const xray = new XRay(executionId, { pipeline: 'my-pipeline' });
xray.startStep('process_data', { input: 'data' });
// ... do work ...
xray.endStep('process_data', { output: 'result' });
const execution = xray.end({ status: 'success' });

// Step 2: Send to X-Ray server WITHOUT reasoning
const client = createXRayClient();
await client.saveExecution(execution);

// Step 3: User views execution in dashboard → server generates reasoning
// (Server uses its own OpenAI key, may have rate limits)
```

**Benefits:**
- ✅ No OpenAI API key needed
- ✅ Simple implementation
- ✅ Good for quick testing
- ✅ Zero security risk

**Considerations:**
- ⚠️ Server may rate-limit reasoning generation
- ⚠️ Server pays for API costs (not you)
- ⚠️ Reasoning generated on-demand (may have slight delay)

---

### ❌ DANGEROUS: Never Do This

**WRONG:** Sending your OpenAI API key to X-Ray server

```typescript
// ❌ DON'T DO THIS - SECURITY RISK
const execution = {
  executionId: '...',
  steps: [...],
  developerOpenAiKey: process.env.OPENAI_API_KEY  // ❌ NEVER SEND YOUR KEY
};
await client.saveExecution(execution);
```

**Why this is dangerous:**
- 🚨 Your API key is stored in X-Ray's database (plaintext)
- 🚨 Anyone with database access can steal your key
- 🚨 Database breach = all developer keys compromised
- 🚨 X-Ray server could misuse your key (accidental or intentional)
- 🚨 Keys logged in server logs
- 🚨 You have no control over key usage
- 🚨 Can't revoke without contacting X-Ray team

---

## 🎯 Recommended Architecture

### For Individual Developers / Small Teams
**Use client-side reasoning** (Example 7 in demo-app)
- Full control over API costs
- No security risks
- Best for production use

### For Enterprise / Large Teams
**Option 1:** Client-side reasoning + central X-Ray dashboard
- Each team generates their own reasoning
- Central dashboard for visualization
- No API key sharing needed

**Option 2:** X-Ray proxy service
- Your organization runs X-Ray server
- Server uses organization's OpenAI key
- Internal rate limits and cost control
- Never expose keys to external parties

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Never send OpenAI API keys to X-Ray server
- [ ] Use client-side reasoning for sensitive workloads
- [ ] Review demo-app example 7 for secure patterns
- [ ] Rotate API keys regularly
- [ ] Use environment variables for keys (never hardcode)
- [ ] Implement rate limiting on your reasoning generation
- [ ] Monitor OpenAI API usage for anomalies
- [ ] Use read-only X-Ray API keys when possible
- [ ] Encrypt execution data if it contains sensitive info
- [ ] Review X-Ray server logs for suspicious activity

---

## 📚 Examples

See the demo-app for complete examples:

- `src/1-basic-example.ts` - Basic execution tracking (no reasoning)
- `src/7-standalone-reasoning.ts` - **SECURE CLIENT-SIDE REASONING** ✅
- `SECURITY.md` - This document

---

## 🆘 What If Keys Are Exposed?

If you accidentally exposed your OpenAI API key:

1. **Immediately revoke** the key in OpenAI dashboard
2. Generate a new API key
3. Update your environment variables
4. Review OpenAI usage logs for unauthorized calls
5. If X-Ray stored your key, contact them to delete it
6. Implement monitoring to detect future exposures

---

## 📞 Security Contact

If you discover a security vulnerability in X-Ray:
- **DO NOT** open a public GitHub issue
- Contact the security team privately
- Provide details and reproduction steps
- Allow time for fix before public disclosure

---

## 📖 Additional Resources

- [OpenAI API Key Best Practices](https://platform.openai.com/docs/guides/production-best-practices/api-keys)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
