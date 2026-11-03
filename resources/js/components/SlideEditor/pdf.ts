/**
 * Minimal PDF writer: one page per JPEG, the page sized to the image. Used for
 * LinkedIn document carousels, which only accept PDF uploads. JPEG bytes are
 * embedded as-is (DCTDecode), so there is no re-encoding and no dependency.
 */
export interface PdfPage {
    jpeg: Uint8Array;
    width: number;
    height: number;
}

export function createPdf(pages: PdfPage[]): Blob {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const offsets: number[] = [];
    let length = 0;

    const push = (part: string | Uint8Array) => {
        const bytes = typeof part === 'string' ? encoder.encode(part) : part;
        chunks.push(bytes);
        length += bytes.length;
    };

    // Object ids: 1 catalog, 2 page tree, then 3 per page (page, image, content).
    const pageId = (i: number) => 3 + i * 3;
    const imageId = (i: number) => 4 + i * 3;
    const contentId = (i: number) => 5 + i * 3;
    const objectCount = 2 + pages.length * 3;

    const startObject = (id: number) => {
        offsets[id] = length;
        push(`${id} 0 obj\n`);
    };

    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    startObject(1);
    push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    startObject(2);
    const kids = pages.map((_, i) => `${pageId(i)} 0 R`).join(' ');
    push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);

    pages.forEach((page, i) => {
        const { width: w, height: h } = page;

        startObject(pageId(i));
        push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im${i} ${imageId(i)} 0 R >> >> /Contents ${contentId(i)} 0 R >>\nendobj\n`);

        startObject(imageId(i));
        push(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`);
        push(page.jpeg);
        push('\nendstream\nendobj\n');

        const content = `q ${w} 0 0 ${h} 0 0 cm /Im${i} Do Q`;
        startObject(contentId(i));
        push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    });

    const xrefOffset = length;
    let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;

    for (let id = 1; id <= objectCount; id++) {
        xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    }

    push(xref);
    push(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}
