# Curiosity Report: Linters (ESLint)

## Why I Picked This

While working on the `jwt-pizza-service` backend I kept seeing the ESLint configuration and editor warnings. I realized I was relying on lint feedback without truly understanding how a linter works under the hood. That sparked my curiosity to dive deeper into linting—specifically ESLint—purely from a developer viewpoint focused on quality, reliability, and DevOps integration.

## What A Linter Is

To me, a linter feels like a fast, always‑on code reviewer. It reads my source files without running them, tokenizes the code, builds an Abstract Syntax Tree (AST), and then compares that AST against a library of rules. Each rule is just logic that inspects certain node types in the AST and decides: report a problem, suggest an improvement, or silently pass. Because it never executes the code, it is safe, quick, and consistent.

## Brief Origin Story I Found Interesting

I learned the term “lint” goes back to Stephen Johnson at Bell Labs (late 1970s) when he wrote a C program to catch issues the compiler was letting slide—things like weak type usage across separately compiled files. That historical intent (stricter checking than the compiler) still resonates today: ESLint catches patterns the JS runtime would happily execute but that are risky, unclear, or inconsistent.

## How ESLint Works

1. I point ESLint at files (CLI or editor integration).
2. ESLint selects a parser (default is Espree) to turn code into an AST.
3. Config (my `eslint.config.mjs`) determines environments, globals, plugins, and rule severity levels.
4. Each enabled rule registers AST node listeners; as ESLint traverses the AST, those listeners fire.
5. A rule can call `context.report()` to flag a problem. If the rule provides a fixer, ESLint can apply it in `--fix` mode.
6. Results are aggregated into a formatted report (CLI) or inline diagnostics (IDE).

Internally, this means every performance hit I add (for example, too many complex custom rules) gets multiplied by number of files × rules × AST nodes. Knowing that helps me stay intentional about adding new rules.

## Experiments I Ran Locally

I wanted hands‑on confirmation, so I performed these small trials:

1. Introduced an unused variable and watched ESLint flag it as a warning; after removal the warning disappeared—verifying rule responsiveness.
2. Added an obvious equality mistake (`if (a = b)`) to see assignment vs. comparison detection—ESLint reported it immediately (`no-cond-assign`).
3. Ran with `--fix` to see which issues are auto‑correctable (spacing, semicolons, quote style). Style consistency improved instantly.
4. Sketched a tiny custom rule to understand the `create(context)` shape. Even a stub rule logging `Identifier` nodes confirmed how granular the traversal is.

## Custom Rule Skeleton

```js
// my-rule.js
module.exports = {
	meta: {
		type: 'suggestion',
		docs: { description: 'disallow foo identifiers' },
		fixable: 'code',
		schema: []
	},
	create(context) {
		return {
			Identifier(node) {
				if (node.name === 'foo') {
					context.report({
						node,
						message: "Avoid identifier name 'foo'",
						fix(fixer) {
							return fixer.replaceText(node, 'renamed');
						}
					});
				}
			}
		};
	}
};
```

Writing this clarified that a rule is simply AST pattern matching + optional fix logic. The power (and danger) lies in writing precise conditions; careless fixes might alter semantics.

## Why ESLint Matters To Me

I see linting as a guardrail in several ways:

- Preventing subtle bugs (assignment in condition, shadowed variables, unreachable code) before runtime.
- Enforcing style and structure so diffs stay small and readable—increases team velocity.
- Surfacing potential security pitfalls (e.g., `eval`, unsafe regex) early with security plugin rules.
- Acting as a fast, deterministic gate in CI; a failing lint step blocks merging low‑quality or inconsistent code.

## Practical Integration Steps I Use

```bash
# Install dependencies (once)
npm install

# Run full lint
npx eslint . --ext .js

# Apply safe fixes
npx eslint . --ext .js --fix
```

`package.json` script addition (if missing):

```json
{
  "scripts": {
    "lint": "eslint . --ext .js"
  }
}
```

I can then wire this into a CI workflow so any push or pull request triggers: install deps → run lint → fail on errors. That creates an automated quality threshold.

## Performance Thoughts I Noted

If lint feels slow, I would:

- Limit glob scope (target `src/` instead of entire repo when possible).
- Cache results (`--cache`) to avoid reprocessing unchanged files.
- Avoid unnecessary heavyweight custom rules or deep AST walks unless value justifies cost.

## Security Angle That Surprised Me

Learning that rule sets can encode secure coding standards (like flagging unsanitized input patterns) means linting can be an early layer in a defense‑in‑depth model before dynamic scanning and SAST tools. That reframed lint from “style enforcer” to “preventative security measure.”

## What I Still Want To Explore

- Writing a project‑specific rule ensuring all database calls route through an abstraction for logging/tracing.
- Measuring rule execution time using ESLint’s timing output to identify slow custom rules.
- Trying an alternative parser (like `@typescript-eslint/parser`) to compare AST differences when moving to TypeScript.

## References I Used

- [ESLint Official Docs](https://eslint.org/docs/latest/)
- [Developer Guide: Working with Rules](https://eslint.org/docs/latest/developer-guide/working-with-rules)
- Historical note on the origin of lint (Bell Labs / Stephen Johnson) cited across multiple retrospective articles.

## Personal Takeaway

This deep dive shifted linting in my mind from a passive editor feature to an active, scriptable quality layer. By understanding the AST + rule flow, I feel more confident tailoring ESLint: tightening rules that matter, disabling noise, and adding custom logic that reinforces architectural decisions. It’s a small investment with a big payoff in reliability and maintainability.
