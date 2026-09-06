// Setup global de los tests: extiende expect() con los matchers de jest-dom
// (toBeInTheDocument, toHaveAttribute, etc.). Se carga vía setupFiles.
import '@testing-library/jest-dom';

// ResizeObserver no existe en jsdom, y los componentes de Radix que miden su
// contenido —Checkbox, Select, Popover— lo usan al montarse. Sin este stub,
// cualquier test que renderice un formulario con uno de ellos muere con
// "ResizeObserver is not defined" en un stack de react-dom que no menciona al
// componente culpable.
//
// Apareció al agregar el tilde de "saldo inicial" a AportesAdmin (§14.3): dos
// tests que no tenían nada que ver con el cambio empezaron a fallar.
//
// Es un stub y no una implementación: los tests no miden layout. Si algún día se
// necesita el tamaño real, esto no alcanza y hay que decirlo ahí.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
