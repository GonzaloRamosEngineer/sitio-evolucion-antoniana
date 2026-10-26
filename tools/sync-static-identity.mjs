import { syncStaticIdentity } from './static-identity-lib.mjs';

const changed = syncStaticIdentity();

if (changed.length === 0) {
  console.log('Identidad estática sincronizada; no hubo cambios.');
} else {
  console.log(`Identidad estática actualizada: ${changed.join(', ')}`);
}
