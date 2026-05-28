import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { TranslationProvider } from './i18n';

createInertiaApp({
    title: (title) => (title ? `${title} - CaeliView` : 'CaeliView'),
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        createRoot(el).render(
            <TranslationProvider>
                <App {...props} />
            </TranslationProvider>,
        );
    },
    progress: {
        color: '#54d6d6',
    },
});
