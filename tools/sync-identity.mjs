import { syncArtifactIdentity } from './artifact-identity-lib.mjs';
import { syncEdgeIdentity } from './edge-identity-lib.mjs';
import { syncStaticIdentity } from './static-identity-lib.mjs';

const changed = [...syncStaticIdentity(), ...syncEdgeIdentity(), ...syncArtifactIdentity()];

if (changed.length === 0) {
  console.log('Identidad sincronizada; no hubo cambios.');
} else {
  console.log(`Identidad actualizada: ${changed.join(', ')}`);
}
