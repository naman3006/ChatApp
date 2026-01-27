try {
    const { Image, FileText, Download } = require('lucide-react');
    console.log('Image:', Image);
    console.log('FileText:', FileText);
    console.log('Download:', Download);
} catch (e) {
    console.log("Error requiring lucide-react:", e.message);
    // Try importing direct path if possible in node
}
