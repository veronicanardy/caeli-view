import { Head } from '@inertiajs/react';
import { Code2, Database, Lock, Server } from 'lucide-react';
import { AppLayout } from '@/Components/AppLayout';
import { FeatureCard } from '@/Components/FeatureCard';
import { PageHeader } from '@/Components/PageHeader';
import { useTranslation } from '@/i18n';

export default function About() {
    const { locale } = useTranslation();
    const en = locale === 'en';

    return (
        <AppLayout>
            <Head title={en ? 'About' : 'Sobre'} />
            <PageHeader
                eyebrow={en ? 'About the project' : 'Sobre o projeto'}
                title={en ? 'Behind the observatory' : 'Os bastidores do observatório'}
                description={en
                    ? 'CaeliView combines Laravel, Inertia, React, TypeScript, and Tailwind to turn public NASA APIs into a safe, elegant visual experience.'
                    : 'CaeliView une Laravel, Inertia, React, TypeScript e Tailwind para transformar APIs públicas da NASA em uma experiência visual segura e elegante.'}
            />
            <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
                <FeatureCard
                    icon={Server}
                    title={en ? 'Lean mission route' : 'Rota de missão enxuta'}
                    description={en ? 'Controllers validate input, call domain services, and deliver only normalized data to Inertia.' : 'Controllers validam entradas, acionam serviços de domínio e entregam ao Inertia apenas dados já normalizados.'}
                    tone="cyan"
                />
                <FeatureCard
                    icon={Lock}
                    title={en ? 'Protected key' : 'Chave protegida'}
                    description={en ? 'NASA_API_KEY stays in .env, away from the browser and frontend calls.' : 'A NASA_API_KEY permanece no .env, longe do navegador e fora das chamadas do frontend.'}
                    tone="amber"
                />
                <FeatureCard
                    icon={Database}
                    title="PostgreSQL e Redis"
                    description={en ? 'PostgreSQL keeps the environment ready to evolve; Redis helps keep the journey fast by reducing repeated queries.' : 'PostgreSQL deixa o ambiente pronto para evoluir; Redis ajuda a manter a jornada rápida ao reduzir consultas repetidas.'}
                    tone="mint"
                />
                <FeatureCard
                    icon={Code2}
                    title={en ? 'Typed frontend' : 'Frontend tipado'}
                    description={en ? 'Reusable components handle incomplete data, empty states, and friendly messages without losing clarity.' : 'Componentes reutilizáveis cuidam de dados incompletos, estados vazios e mensagens amigáveis sem perder clareza.'}
                    tone="violet"
                />
            </section>
        </AppLayout>
    );
}
