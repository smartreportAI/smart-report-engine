/**
 * End-to-end test: sends a PDF to the Parser Backend and saves the JSON response.
 *
 * Usage: node test-e2e.js [path-to-pdf]
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const PDF_PATH = process.argv[2] || path.join(__dirname, 'output', 'report.pdf');
const PARSER_URL = 'http://localhost:4000/parse-and-report';
const OUT_PATH = path.join(__dirname, 'output', 'parsed-report.json');

if (!fs.existsSync(PDF_PATH)) {
    console.error(`PDF not found: ${PDF_PATH}`);
    process.exit(1);
}

const pdfBuffer = fs.readFileSync(PDF_PATH);
console.log(`\nSending PDF: ${PDF_PATH} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
console.log(`Target: ${PARSER_URL}`);
console.log(`Note: Patient info and all results will be extracted and classified automatically\n`);

const boundary = `----FormBoundary${Date.now()}`;

// Only the PDF is sent — no patientId/age/gender fields needed
const parts = [];
parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="pdf"; filename="report.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
));
parts.push(pdfBuffer);
parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

const body = Buffer.concat(parts);

const urlObj = new URL(PARSER_URL);
const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || 80,
    path: urlObj.pathname,
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
    },
};

const req = http.request(options, (res) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
        const responseBuffer = Buffer.concat(chunks);
        const textResponse = responseBuffer.toString('utf8');

        if (res.statusCode === 200) {
            try {
                const jsonResult = JSON.parse(textResponse);
                fs.writeFileSync(OUT_PATH, JSON.stringify(jsonResult, null, 2));

                console.log(`✅ SUCCESS!`);
                console.log(`📋 Patient   : ${jsonResult.patient.patientName || 'Unknown'} (Age: ${jsonResult.patient.age || '?'})`);
                console.log(`📊 Summary   : ${jsonResult.summary.totalTests} total tests across ${jsonResult.summary.totalProfiles} profiles`);
                console.log(`⚠️ Attention: ${jsonResult.summary.attentionNeeded} parameters out of bounds`);
                console.log(`⚕️ AI Score : ${jsonResult.aiAssessment.healthScore}/100`);
                console.log(`⚕️ Top Recommendations:`);
                jsonResult.aiAssessment.overallRecommendations.forEach(r => console.log(`   - ${r}`));
                console.log(`\n   JSON saved to : ${OUT_PATH}`);

            } catch (e) {
                console.error('Failed to parse response as JSON limit. Raw response:', textResponse.substring(0, 500));
            }
        } else {
            console.error(`❌ FAILED — HTTP ${res.statusCode}`);
            console.error(`   Response: ${textResponse.substring(0, 500)}`);
            process.exit(1);
        }
    });
});

req.on('error', (err) => {
    console.error(`❌ Request error: ${err.message}`);
    process.exit(1);
});

req.write(body);
req.end();
