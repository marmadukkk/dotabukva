/**
 * Node's test runner does not add .ts the way Vite does.
 * Source files import each other without an extension.
 */
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL ?? '';
    const fromSource =
      parent.includes('/src/') && !parent.includes('/node_modules/');
    const relative = specifier.startsWith('./') || specifier.startsWith('../');
    const hasExtension = /\.[a-z0-9]+$/i.test(specifier);
    if (fromSource && relative && !hasExtension) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
