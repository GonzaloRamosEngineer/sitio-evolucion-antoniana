import { describe, expect, it } from 'vitest';
import { landingForRole, postLoginDestination, safeInternalReturnTo } from '@/lib/authRedirect';

describe('safeInternalReturnTo', () => {
  it('conserva pathname, query y hash de una ruta interna', () => {
    expect(
      safeInternalReturnTo({
        pathname: '/comision',
        search: '?tab=documents',
        hash: '#archivo',
      }),
    ).toBe('/comision?tab=documents#archivo');
  });

  it.each([
    'https://evil.example/robo',
    '//evil.example/robo',
    '/\\evil.example/robo',
    'javascript:alert(1)',
    '',
    null,
  ])('rechaza un retorno no interno: %s', (value) => {
    expect(safeInternalReturnTo(value)).toBeNull();
  });

  it('descarta sufijos mal formados sin perder el pathname seguro', () => {
    expect(
      safeInternalReturnTo({ pathname: '/mi/cuenta', search: 'https://evil.example', hash: 'x' }),
    ).toBe('/mi/cuenta');
  });
});

describe('destino posterior al login', () => {
  it.each([
    ['admin', '/admin'],
    ['comision_directiva', '/comision'],
    ['documentacion_lectura', '/comision?tab=documents'],
    ['educacion_manager', '/admin/education'],
    ['user', '/mi/cuenta'],
    [undefined, '/mi/cuenta'],
  ])('envia el rol %s a %s', (role, expected) => {
    expect(landingForRole(role)).toBe(expected);
  });

  it('prioriza un retorno interno completo sobre el landing del rol', () => {
    expect(
      postLoginDestination(
        { pathname: '/comercios/panel', search: '?turno=tarde', hash: '#canjes' },
        'admin',
      ),
    ).toBe('/comercios/panel?turno=tarde#canjes');
  });

  it('ignora retornos externos o hacia la propia pantalla de auth', () => {
    expect(postLoginDestination('//evil.example', 'user')).toBe('/mi/cuenta');
    expect(postLoginDestination({ pathname: '/login' }, 'admin')).toBe('/admin');
  });
});
