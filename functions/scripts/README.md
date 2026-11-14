# Firebase Admin Scripts

इस फ़ोल्डर में Firebase के विशेष प्रशासनिक कार्यों की स्क्रिप्ट रखी जाती हैं।

## Super Admin Setup

फ़ाइल:
scripts/set-super-admin.js

यह स्क्रिप्ट किसी सत्यापित Firebase Authentication अकाउंट को
Super Admin role देती है।

### आवश्यकताएँ

- Node.js 20 या उससे नया
- Firebase Admin SDK
- Firebase service account JSON
- सत्यापित Google/Firebase अकाउंट

### सेटअप

पहले functions फ़ोल्डर में जाएँ:

```bash
cd functions
