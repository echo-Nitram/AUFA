import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeFilename, generateFilename, publicFileUrl, privateFileUrl } from './upload';
import { contentTypeFor } from './storage';

describe('isSafeFilename', () => {
  test('acepta un nombre generado por el sistema', () => {
    assert.ok(isSafeFilename('a'.repeat(32) + '.jpg'));
    assert.ok(isSafeFilename('0123456789abcdef0123456789abcdef.pdf'));
  });

  test('rechaza intentos de salir del directorio', () => {
    for (const attempt of [
      '../../../etc/passwd',
      '..%2F..%2Fetc%2Fpasswd',
      'a/b.jpg',
      'a\\b.jpg',
      '.',
      '..',
    ]) {
      assert.equal(isSafeFilename(attempt), false, `deberia rechazar: ${attempt}`);
    }
  });

  test('rechaza extensiones no permitidas', () => {
    const stem = '0123456789abcdef0123456789abcdef';
    for (const ext of ['.html', '.svg', '.js', '.exe', '']) {
      assert.equal(isSafeFilename(stem + ext), false, `deberia rechazar: ${ext || '(sin extension)'}`);
    }
  });

  test('rechaza nombres con largo incorrecto', () => {
    assert.equal(isSafeFilename('abc.jpg'), false);
    assert.equal(isSafeFilename('a'.repeat(33) + '.jpg'), false);
  });

  test('rechaza mayusculas, porque el generador solo produce minusculas', () => {
    assert.equal(isSafeFilename('A'.repeat(32) + '.jpg'), false);
  });
});

describe('generateFilename', () => {
  test('la extension sale del tipo MIME, no del nombre original', () => {
    assert.match(generateFilename('image/jpeg'), /\.jpg$/);
    assert.match(generateFilename('image/png'), /\.png$/);
    assert.match(generateFilename('application/pdf'), /\.pdf$/);
  });

  test('lo que genera siempre pasa la validacion', () => {
    for (const mime of ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']) {
      assert.ok(isSafeFilename(generateFilename(mime)), `fallo para ${mime}`);
    }
  });

  test('no repite nombres', () => {
    const names = new Set(Array.from({ length: 500 }, () => generateFilename('image/png')));
    assert.equal(names.size, 500);
  });
});

describe('rutas de archivo', () => {
  test('los documentos privados no quedan bajo la ruta publica', () => {
    const url = privateFileUrl('identity', '0123456789abcdef0123456789abcdef.jpg');
    assert.ok(url.startsWith('/api/files/'), 'debe pasar por la ruta autorizada');
    assert.ok(!url.startsWith('/uploads/'), 'no debe quedar en la ruta publica');
  });

  test('los logos van por la ruta publica', () => {
    assert.ok(publicFileUrl('logos', 'x.png').startsWith('/uploads/logos/'));
  });
});

describe('contentTypeFor', () => {
  test('mapea las extensiones permitidas', () => {
    assert.equal(contentTypeFor('x.jpg'), 'image/jpeg');
    assert.equal(contentTypeFor('x.png'), 'image/png');
    assert.equal(contentTypeFor('x.webp'), 'image/webp');
    assert.equal(contentTypeFor('x.pdf'), 'application/pdf');
  });

  test('lo desconocido no se sirve como markup', () => {
    assert.equal(contentTypeFor('x.html'), 'application/octet-stream');
    assert.equal(contentTypeFor('sin-extension'), 'application/octet-stream');
  });
});
