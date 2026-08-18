import { describe, it, expect } from 'vitest';

import { readAttachment } from './read-attachment';
import { MAX_DOCUMENT_CHARS, MAX_TEMPLATE_CHARS } from '@/constants/document';

/**
 * `readAttachment` es la única pieza con lógica del drag & drop: decide qué archivo se
 * acepta, lo lee y acota su tamaño. Vive fuera del componente justamente para poder
 * probarla — el repo no tiene jsdom ni testing-library, así que un hook de React no
 * sería testeable, y `File.text()` sí funciona en Node.
 */

const file = (content: string, name = 'notas.md') => new File([content], name);

describe('readAttachment — extensiones aceptadas', () => {
    it('acepta .md', async () => {
        const result = await readAttachment(file('# Sprint 4', 'plan.md'));

        expect(result.ok).toBe(true);
        expect(result.ok && result.attachment.fileName).toBe('plan.md');
        expect(result.ok && result.attachment.content).toBe('# Sprint 4');
    });

    it('acepta .txt', async () => {
        const result = await readAttachment(file('unas notas', 'notas.txt'));

        expect(result.ok).toBe(true);
    });

    it('acepta la extensión en mayúsculas', async () => {
        const result = await readAttachment(file('# Hola', 'PLAN.MD'));

        expect(result.ok).toBe(true);
    });

    it('rechaza .pdf y lo nombra en el error', async () => {
        const result = await readAttachment(file('%PDF-1.4', 'propuesta.pdf'));

        expect(result.ok).toBe(false);
        expect(!result.ok && result.error).toContain('.pdf');
    });

    it('rechaza .docx', async () => {
        const result = await readAttachment(file('cualquier cosa', 'pliego.docx'));

        expect(result.ok).toBe(false);
    });

    it('rechaza un archivo sin extensión', async () => {
        const result = await readAttachment(file('texto suelto', 'README'));

        expect(result.ok).toBe(false);
    });

    it('no se deja engañar por un punto en medio del nombre', async () => {
        const result = await readAttachment(file('%PDF-1.4', 'notas.md.pdf'));

        expect(result.ok).toBe(false);
    });
});

describe('readAttachment — tamaño', () => {
    it(`acepta exactamente ${MAX_DOCUMENT_CHARS} caracteres`, async () => {
        const result = await readAttachment(file('a'.repeat(MAX_DOCUMENT_CHARS)));

        expect(result.ok).toBe(true);
        expect(result.ok && result.attachment.characters).toBe(MAX_DOCUMENT_CHARS);
    });

    it('rechaza un caracter más, y el error dice cuántos tiene de verdad', async () => {
        const result = await readAttachment(file('a'.repeat(MAX_DOCUMENT_CHARS + 1)));

        expect(result.ok).toBe(false);
        expect(!result.ok && result.error).toContain(String(MAX_DOCUMENT_CHARS + 1));
        expect(!result.ok && result.error).toContain(String(MAX_DOCUMENT_CHARS));
    });

    it('descarta un archivo enorme por tamaño, sin contar caracteres', async () => {
        // Más bytes de los que podrían caber en el tope ni con 4 bytes por caracter,
        // así que se rechaza antes de leerlo. El mensaje lo distingue del otro camino:
        // aquí no se puede decir cuántos caracteres tiene, porque no se ha mirado.
        const result = await readAttachment(file('a'.repeat(MAX_DOCUMENT_CHARS * 8)));

        expect(result.ok).toBe(false);
        expect(!result.ok && result.error).toContain('demasiado grande');
    });
});

describe('readAttachment — contenido', () => {
    it('quita el BOM del principio', async () => {
        const result = await readAttachment(file('﻿# Sprint 4'));

        expect(result.ok && result.attachment.content).toBe('# Sprint 4');
    });

    it('rechaza un archivo vacío', async () => {
        const result = await readAttachment(file(''));

        expect(result.ok).toBe(false);
    });

    it('rechaza un archivo que sólo tiene espacios y saltos de línea', async () => {
        const result = await readAttachment(file('   \n\n\t  '));

        expect(result.ok).toBe(false);
    });

    it('conserva los saltos de línea internos: la estructura del markdown importa', async () => {
        const md = '# Sprint 4\n\n## Backend\n- Migrar el schema';
        const result = await readAttachment(file(md));

        expect(result.ok && result.attachment.content).toBe(md);
    });

    it('cuenta los caracteres del contenido ya sin BOM', async () => {
        const result = await readAttachment(file('﻿hola'));

        expect(result.ok && result.attachment.characters).toBe(4);
    });
});

/**
 * La importación por plantilla usa el mismo lector con otro tope: su contenido no entra
 * en ningún prompt, así que cabe mucho más. Si el parámetro dejara de respetarse, el
 * navegador rechazaría plantillas que el backend acepta sin problema.
 */
describe('readAttachment — tope de caracteres configurable', () => {
    it('acepta un contenido que supera el tope del chat cuando se le pasa uno mayor', async () => {
        const content = 'a'.repeat(MAX_DOCUMENT_CHARS + 1);

        expect((await readAttachment(file(content))).ok).toBe(false);
        expect((await readAttachment(file(content), MAX_TEMPLATE_CHARS)).ok).toBe(true);
    });

    it('sigue rechazando lo que pasa del tope que se le pasa, y lo dice en el error', async () => {
        const result = await readAttachment(file('a'.repeat(51)), 50);

        expect(result.ok).toBe(false);
        expect(!result.ok && result.error).toContain('51');
        expect(!result.ok && result.error).toContain('50');
    });

    it('acepta justo el tope que se le pasa', async () => {
        expect((await readAttachment(file('a'.repeat(50)), 50)).ok).toBe(true);
    });

    it('usa el tope del chat cuando no se le pasa ninguno', async () => {
        expect((await readAttachment(file('a'.repeat(MAX_DOCUMENT_CHARS)))).ok).toBe(true);
    });
});
