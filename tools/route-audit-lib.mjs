import fs from 'node:fs';
import path from 'node:path';
import { ROUTE_MANIFEST, ROUTE_PATHS } from '../src/config/rutas.js';

/** Registro central compartido por runtime, funciones, scripts y pruebas. */
export const CURRENT_ROUTE_BASELINE = ROUTE_MANIFEST;

export const extractAppRoutes = (source) =>
  [...source.matchAll(
    /<Route\s[^>]*?path=(?:["']([^"']+)["']|\{ROUTE_PATHS\.([A-Z0-9_]+)\})/gs,
  )].map((match) => match[1] ?? ROUTE_PATHS[match[2]]);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const routePatternMatches = (pattern, rawTarget) => {
  if (!rawTarget?.startsWith('/') || pattern === '*') return false;
  const target = rawTarget.split(/[?#]/, 1)[0] || '/';
  if (pattern === target) return true;

  const segments = pattern.split('/').filter(Boolean);
  let expression = '^';
  for (const segment of segments) {
    if (segment === '*') {
      expression += '(?:/.*)?';
      continue;
    }
    expression += segment.startsWith(':') ? '/[^/]+' : `/${escapeRegex(segment)}`;
  }
  expression += '/?$';
  return new RegExp(expression).test(target);
};

const walkSourceFiles = (directory) => {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(absolute));
    } else if (/\.(?:js|jsx)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name)) {
      files.push(absolute);
    }
  }
  return files;
};

const STATIC_NAVIGATION_PATTERNS = [
  { kind: 'to', regex: /\bto\s*=\s*["'](\/[^"']*)["']/g },
  { kind: 'navigate', regex: /\bnavigate\s*\(\s*["'](\/[^"']*)["']/g },
  { kind: 'href-object', regex: /\bhref\s*:\s*["'](\/[^"']*)["']/g },
];

/**
 * Extrae solamente destinos internos estáticos. Las URLs armadas con template
 * strings requieren pruebas específicas del módulo que las construye.
 */
export const collectStaticNavigationTargets = (sourceRoot) => {
  const findings = [];
  for (const absolute of walkSourceFiles(sourceRoot)) {
    const source = fs.readFileSync(absolute, 'utf8');
    for (const { kind, regex } of STATIC_NAVIGATION_PATTERNS) {
      for (const match of source.matchAll(regex)) {
        findings.push({
          file: path.relative(process.cwd(), absolute),
          kind,
          target: match[1],
        });
      }
    }
  }
  return findings;
};

export const findBrokenStaticTargets = (routes, targets) =>
  targets.filter(({ target }) => !routes.some((pattern) => routePatternMatches(pattern, target)));

export const auditRoutes = (root = process.cwd()) => {
  const appSource = fs.readFileSync(path.join(root, 'src', 'App.jsx'), 'utf8');
  const appRoutes = extractAppRoutes(appSource);
  const baselineRoutes = CURRENT_ROUTE_BASELINE.map((entry) => entry.path);
  const staticTargets = collectStaticNavigationTargets(path.join(root, 'src'));
  const brokenTargets = findBrokenStaticTargets(appRoutes, staticTargets);

  return {
    appRoutes,
    baselineRoutes,
    missingFromBaseline: appRoutes.filter((routePath) => !baselineRoutes.includes(routePath)),
    missingFromApp: baselineRoutes.filter((routePath) => !appRoutes.includes(routePath)),
    duplicateAppRoutes: appRoutes.filter((routePath, index) => appRoutes.indexOf(routePath) !== index),
    duplicateBaselineRoutes: baselineRoutes.filter(
      (routePath, index) => baselineRoutes.indexOf(routePath) !== index,
    ),
    staticTargets,
    brokenTargets,
  };
};
