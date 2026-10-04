import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'src/generated/**'] },
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
);
