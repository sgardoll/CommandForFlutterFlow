const pptxgen = require('pptxgenjs');
const html2pptx = require('./lib/html2pptx.cjs');
const path = require('path');

async function build() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Custom Code Connect';
  pptx.title = 'FlutterFlow + Custom Code Connect';

  const slides = [
    'slide1-title.html',
    'slide2-wall.html',
    'slide3-workflow.html',
    'slide4-table.html',
    'slide5-example1.html',
    'slide6-pipeline.html',
    'slide7-example2.html',
    'slide8-closing.html',
  ];

  for (const file of slides) {
    const htmlPath = path.join(__dirname, 'slides', file);
    console.log(`Processing ${file}...`);
    try {
      await html2pptx(htmlPath, pptx);
    } catch (e) {
      console.error(`Error processing ${file}:`, e);
    }
  }

  const outPath = path.join(__dirname, 'FF-Custom-Code-Connect.pptx');
  await pptx.writeFile({ fileName: outPath });
  console.log(`Presentation saved to ${outPath}`);
}

build().catch(err => { console.error(err); process.exit(1); });
