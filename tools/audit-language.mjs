import { auditLanguage } from './language-audit-lib.mjs';

const report = auditLanguage();

console.log(`Archivos con marca o dominio literal pendientes: ${report.brandFiles.length}`);
console.log(`Páginas con término Partner(s) pendiente de clasificar: ${report.partnerFiles.length}`);
console.log(`Apariciones runtime de “Club de beneficios”: ${report.clubDeBeneficiosFiles.length}`);
console.log(`Estáticos institucionales desincronizados: ${report.staticIdentityErrors.length}`);

const errors = [
  ...report.unexpectedBrandFiles.map((file) => `Marca literal nueva fuera de línea base: ${file}`),
  ...report.unexpectedPartnerFiles.map((file) => `Partner(s) nuevo fuera de línea base: ${file}`),
  ...report.clubDeBeneficiosFiles.map((file) => `“Club de beneficios” reapareció en: ${file}`),
  ...report.staticIdentityErrors,
];

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Resultado: línea base estable; no se incorporó nueva deuda de lenguaje.');
}
