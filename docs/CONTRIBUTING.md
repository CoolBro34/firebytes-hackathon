# Contributing

## Add a Worker route

1. Put route logic in the focused file under `src/worker/` (or create a module and add it to the fixed `MODULES` list in `build/build_worker.py`).
2. Add an `import`/`export` in the source modules and route it from `src/worker/index.js`. Preserve existing status codes, response bodies, headers, auth allowlist, and route order unless the task explicitly requests a behavior change.
3. Add a top comment describing the module's routes and dependencies, and JSDoc for exported or non-trivial functions.
4. Rebuild with `python3 build/build_worker.py`. The generated `worker.js` is not edited by hand.

## Add a staff entity

1. Add its label, fields, defaults, seed data, summary/chart definitions, and any attention rules to `src/presets/coding_in_color.js`.
2. Apply the preset with `python3 build/apply_preset.py src/presets/coding_in_color.js && rm -f src/index.html.bak`.
3. Keep sensitive data out of seed records and document any collection or consent rules.

## Build and test loop

```sh
python3 build/apply_preset.py src/presets/coding_in_color.js && rm -f src/index.html.bak
npm run build
node tests/run_all.mjs
```

`npm test` combines the build and complete test runner. Existing test files are regression contracts; add new suites as `tests/test_*.mjs` so the runner discovers them automatically.
