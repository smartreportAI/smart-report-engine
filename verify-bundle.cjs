const c = require('fs').readFileSync('dist/lambda/index.mjs', 'utf8');
console.log('top-level puppeteer import:', /^import\s+\S+\s+from\s+["']puppeteer["']/m.test(c) ? 'BAD - will crash' : 'NOT FOUND (good)');
console.log('browser singleton (_lambdaBrowser):', c.includes('_lambdaBrowser') ? 'FOUND (good)' : 'NOT FOUND');
console.log('MongoDB pre-warm:', c.includes('maxPoolSize') ? 'FOUND (good)' : 'NOT FOUND');
console.log('bundle size:', (require('fs').statSync('dist/lambda/index.mjs').size / 1024 / 1024).toFixed(2) + ' MB');
