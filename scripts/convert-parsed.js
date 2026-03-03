const fs = require('fs');

const data = JSON.parse(fs.readFileSync('output/parsed-report.json', 'utf8'));

// Convert the bare parser output to the format expected by Smart Report Engine API / CLI
const sreFormat = {
    tenantId: 'demo',
    output: 'pdf',
    reportData: {
        patientId: data.patient.patientId || 'UNKNOWN-ID',
        patientName: data.patient.patientName,
        age: data.patient.age || 0,
        gender: data.patient.gender || 'other',
        profiles: data.profiles.map(p => ({
            profileName: p.profileName,
            parameters: p.parameters.map(param => ({
                testName: param.testName,
                value: param.value,
                unit: param.unit,
                referenceRange: param.referenceRange
            }))
        })),
        aiAssessment: data.aiAssessment
    }
};

fs.writeFileSync('output/sre-ready.json', JSON.stringify(sreFormat, null, 2));
console.log('Saved sre-ready.json');
