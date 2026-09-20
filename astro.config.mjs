import { defineBlogConfig } from '@tsche/astro-blog-theme/astro-config';
import { SITE } from './src/config';

const config = defineBlogConfig(SITE);
config.prefetch = false;

export default config;
