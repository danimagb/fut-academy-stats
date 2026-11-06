import { describe, expect, it } from 'vitest';
import { pdfDoc } from './share-pdf';

const text = (b: Uint8Array): string => Array.from(b, (c) => String.fromCharCode(c)).join('');

describe('pdfDoc images', () => {
  it('embeds a JPEG as it is (DCTDecode) and draws it on the page', () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x80, 0xff, 0xd9]);
    const pdf = pdfDoc();
    pdf.page();
    pdf.image(jpeg, 256, 256, 10, 20, 44, 44);
    pdf.text('Hi', 0, 0);
    const out = text(pdf.bytes());
    expect(out).toContain('/XObject << /Im0 7 0 R >>');
    expect(out).toContain('q 44 0 0 44 10 20 cm /Im0 Do Q');
    expect(out).toContain(
      '/Subtype /Image /Width 256 /Height 256 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length 9',
    );
    expect(out).toContain(`stream\n${text(jpeg)}\nendstream`);
    // The xref still points at every object.
    const xrefAt = Number(/startxref\n(\d+)/.exec(out)?.[1]);
    expect(out.slice(xrefAt, xrefAt + 4)).toBe('xref');
    expect(out).toContain('/Size 8');
  });

  it('a PDF without images has no XObject resources', () => {
    const pdf = pdfDoc();
    pdf.page();
    expect(text(pdf.bytes())).not.toContain('/XObject');
  });
});
