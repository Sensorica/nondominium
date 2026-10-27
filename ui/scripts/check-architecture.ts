/**
 * UI architecture invariants (design D7, issue #148), run by `bun run check`.
 *
 * I1  No .svelte file under src/ imports `effect`, `effect/*` or anything under $lib/services,
 *     directly or through a chain of plain modules (utils, errors, schemas...). A chain
 *     stops at a store, which is the sanctioned way in, and at another .svelte file,
 *     which is checked on its own.
 * I2  No file under src/lib/stores/ imports another *.store.svelte module.
 * I3  src/lib/domain/** imports nothing from svelte, effect, $lib/services or $lib/stores.
 *
 * `checkArchitecture` is the pure rule engine; the CLI below only reads files and prints.
 * Paths are POSIX and relative to the ui/ package root, e.g. `src/lib/stores/ndo.store.svelte.ts`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, posix, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export type SourceFile = { readonly path: string; readonly source: string };

export type RuleId = 'I1' | 'I2' | 'I3';

export type Violation = {
  readonly rule: RuleId;
  readonly path: string;
  readonly specifier: string;
  readonly message: string;
  /** For a transitive I1 hit: the modules walked after `specifier`, ending at the forbidden import. */
  readonly via?: readonly string[];
};

const RULE_TEXT: Record<RuleId, string> = {
  I1: 'a .svelte file must not import effect or $lib/services',
  I2: 'a store must not import another *.store.svelte',
  I3: 'the domain layer must not import svelte, effect, $lib/services or $lib/stores'
};

const SERVICES_DIR = 'src/lib/services';
const STORES_DIR = 'src/lib/stores';
const DOMAIN_DIR = 'src/lib/domain';

// Static imports and re-exports (`import x from 'm'`, `import 'm'`, `export * from 'm'`)
// and dynamic `import('m')`, including a backtick literal with no interpolation.
// Type-only imports count: the boundary is the module graph.
const IMPORT_PATTERNS = [
  /\bimport\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"]+)['"]/g,
  /\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*(?:['"]([^'"]+)['"]|`([^`$]+)`)\s*\)/g
];

/**
 * Removes `//`, `/* *\/` and `<!-- -->` comments, skipping string literals so a comment
 * marker inside a string (`'/api/*'`) never swallows the code after it. A quoted string
 * ends at its newline at the latest, so an apostrophe in Svelte markup cannot run on.
 */
function stripComments(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4);
      i = end === -1 ? source.length : end + 3;
    } else if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
    } else if (source.startsWith('//', i)) {
      const end = source.indexOf('\n', i);
      i = end === -1 ? source.length : end;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== ch) {
        if (source[j] === '\\') j++;
        else if (ch !== '`' && source[j] === '\n') break;
        j++;
      }
      out += source.slice(i, j + 1);
      i = j + 1;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

export function importSpecifiers(source: string): string[] {
  const text = stripComments(source);
  const found: string[] = [];
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of text.matchAll(pattern)) found.push(match[1] ?? match[2]);
  }
  return found;
}

/** Resolves `$lib/...` and relative specifiers to a ui-relative path; bare packages stay as written. */
function resolveSpecifier(fromPath: string, specifier: string): string {
  if (specifier === '$lib' || specifier.startsWith('$lib/')) {
    return posix.join('src/lib', specifier.slice('$lib'.length));
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return posix.normalize(posix.join(posix.dirname(fromPath), specifier));
  }
  return specifier;
}

const isUnder = (path: string, dir: string): boolean => path === dir || path.startsWith(`${dir}/`);

const isPackage = (specifier: string, name: string): boolean =>
  specifier === name || specifier.startsWith(`${name}/`);

const isStoreModule = (resolved: string): boolean =>
  /\.store\.svelte(?:\.(?:ts|js))?$/.test(posix.basename(resolved));

const RESOLVE_SUFFIXES = ['', '.ts', '.js', '/index.ts', '/index.js'];

export function checkArchitecture(files: readonly SourceFile[]): Violation[] {
  const violations: Violation[] = [];
  const report = (rule: RuleId, path: string, specifier: string, via?: string[]) =>
    violations.push({ rule, path, specifier, message: RULE_TEXT[rule], ...(via && { via }) });

  const sources = new Map(files.map((f) => [f.path, f.source]));
  const fileOf = (resolved: string): string | null => {
    for (const suffix of RESOLVE_SUFFIXES) {
      if (sources.has(resolved + suffix)) return resolved + suffix;
    }
    return null;
  };
  const isForbiddenForComponent = (specifier: string, resolved: string) =>
    isPackage(specifier, 'effect') || isUnder(resolved, SERVICES_DIR);

  // Path from a plain module to an effect or services import, or null. Memoised; a module
  // on the current path counts as clean, which is enough to break import cycles.
  const reach = new Map<string, string[] | null>();
  const forbiddenChain = (path: string): string[] | null => {
    if (reach.has(path)) return reach.get(path)!;
    reach.set(path, null);
    for (const specifier of importSpecifiers(sources.get(path)!)) {
      const resolved = resolveSpecifier(path, specifier);
      if (isForbiddenForComponent(specifier, resolved)) {
        reach.set(path, [specifier]);
        return [specifier];
      }
      const next = fileOf(resolved);
      if (!next || isStoreModule(next) || next.endsWith('.svelte')) continue;
      const tail = forbiddenChain(next);
      if (tail) {
        const chain = [next, ...tail];
        reach.set(path, chain);
        return chain;
      }
    }
    return null;
  };

  for (const { path, source } of files) {
    const isComponent = isUnder(path, 'src') && path.endsWith('.svelte');
    const isStore = isUnder(path, STORES_DIR);
    const isDomain = isUnder(path, DOMAIN_DIR);
    if (!isComponent && !isStore && !isDomain) continue;

    for (const specifier of importSpecifiers(source)) {
      const resolved = resolveSpecifier(path, specifier);
      const effect = isPackage(specifier, 'effect');
      const services = isUnder(resolved, SERVICES_DIR);

      if (isComponent && (effect || services)) report('I1', path, specifier);
      else if (isComponent) {
        const next = fileOf(resolved);
        if (next && !isStoreModule(next) && !next.endsWith('.svelte')) {
          const chain = forbiddenChain(next);
          if (chain) report('I1', path, specifier, [next, ...chain]);
        }
      }
      if (isStore && isStoreModule(resolved) && resolved !== path.replace(/\.(?:ts|js)$/, '')) {
        report('I2', path, specifier);
      }
      if (
        isDomain &&
        (effect || services || isPackage(specifier, 'svelte') || isUnder(resolved, STORES_DIR))
      ) {
        report('I3', path, specifier);
      }
    }
  }
  return violations;
}

function collectSources(root: string, dir: string): SourceFile[] {
  const out: SourceFile[] = [];
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectSources(root, rel));
    else if (/\.(?:svelte|ts|js)$/.test(entry.name)) {
      out.push({ path: rel.split(sep).join('/'), source: readFileSync(join(root, rel), 'utf8') });
    }
  }
  return out;
}

if (import.meta.main) {
  const uiRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const files = collectSources(uiRoot, 'src');
  const violations = checkArchitecture(files);
  for (const v of violations) {
    const via = v.via ? ` via ${v.via.join(' -> ')}` : '';
    console.error(`${v.path}: ${v.rule} imports '${v.specifier}'${via} (${v.message})`);
  }
  if (violations.length > 0) {
    console.error(`check-architecture: ${violations.length} violation(s)`);
    process.exit(1);
  }
  console.log(`check-architecture: I1, I2, I3 hold across ${files.length} files`);
}
