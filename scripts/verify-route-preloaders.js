const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../src/router/toolRoutes.js'), 'utf8')
const routerSource = fs.readFileSync(path.join(__dirname, '../src/router/index.js'), 'utf8')

const requiredExports = [
  'export const toolRoutes',
  'export function preloadRoute',
  'export function preloadIdleRoutes'
]

for (const exportText of requiredExports) {
  if (!source.includes(exportText)) {
    throw new Error(`Missing ${exportText}`)
  }
}

const expectedPaths = [
  '/tool/excel-compare',
  '/tool/yaml-json',
  '/tool/path-tester',
  '/tool/id-generator',
  '/tool/mock-data',
  '/tool/url-params',
  '/tool/jwt-batch',
  '/tool/log-viewer',
  '/tool/html-entity',
  '/tool/text-stats',
  '/tool/image-base64'
]

for (const routePath of expectedPaths) {
  if (!source.includes(`path: '${routePath}'`)) {
    throw new Error(`Missing preload route ${routePath}`)
  }
}

if (!routerSource.includes('...toolRoutes')) {
  throw new Error('Router does not consume shared toolRoutes')
}

console.log('route preloader verification passed')
