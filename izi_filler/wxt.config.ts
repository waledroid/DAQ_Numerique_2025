import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'izifill',
    description: 'Remplit vos candidatures automatiquement. / Autofill job applications from your saved profile.',
    permissions: ['storage'],
  },
});
