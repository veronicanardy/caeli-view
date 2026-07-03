import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { AppLayout } from './Components/AppLayout';
import { TranslationProvider } from './i18n';

type InertiaPageModule = {
    default: {
        layout?: (page: ReactNode) => ReactNode;
    };
};

const persistentLayout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;

createInertiaApp({
    title: (title) => (title ? `${title} - CaeliView` : 'CaeliView'),
    resolve: async (name) => {
        const page = await resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ) as InertiaPageModule;

        page.default.layout ??= persistentLayout;

        return page;
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <TranslationProvider>
                <App {...props} />
            </TranslationProvider>,
        );
    },
    // Barra fina nativa do Inertia no topo da página em toda troca de rota, na cor
    // de assinatura do site. O radar tem o próprio overlay de carregamento (texturas,
    // GPU), exclusivo dele; a navegação entre páginas usa só esta barra.
    progress: { color: '#54d6d6' },
});
