/**
 * Página de Termos de Uso do CaeliView.
 *
 * Responsabilidade: apresentar, de forma estática e bilíngue, os termos que regem o uso do projeto:
 * natureza educativa, não afiliação à NASA/JPL/Caltech, fontes de dados, isenção de responsabilidade
 * e propriedade intelectual. A seção de fontes e a isenção reaproveitam o copy compartilhado de
 * `@/lib/transparencyCopy` (mesma fonte do rodapé e do guia do radar) para não divergir; as demais
 * seções são texto próprio desta página. Sem lógica: só apresenta.
 *
 * Layout: coluna esquerda fixa (sticky) com selo, título, data de vigência e índice navegável das
 * seções; coluna direita com as seções numeradas. O rodapé global é escondido aqui (a própria página
 * já é a transparência completa, então repetir o link seria redundante).
 */

import { Head } from '@inertiajs/react';
import { Info } from 'lucide-react';
import { useAppLayoutOptions } from '@/Components/AppLayout';
import { useTranslation } from '@/i18n';
import { transparencyCopy } from '@/lib/transparencyCopy';

type Section = {
    id: string;
    title: string;
    paragraphs: string[];
};

// Data da última revisão dos termos. Atualizar à mão quando o texto mudar de forma relevante.
const LAST_UPDATED = new Date('2026-06-25T00:00:00Z');

function formatUpdatedAt(locale: 'pt-BR' | 'en'): string {
    return LAST_UPDATED.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
}

function buildSections(locale: 'pt-BR' | 'en'): Section[] {
    const en = locale === 'en';
    const transparency = transparencyCopy(locale);

    return [
        {
            id: 'finalidade',
            title: en ? 'Educational purpose' : 'Finalidade educativa',
            paragraphs: [
                en
                    ? 'CaeliView is an independent project of an educational and informational nature. It presents public space data through visual experiences and does not provide a navigation, alert, scientific, or decision-support service of any kind.'
                    : 'O CaeliView é um projeto independente, de natureza educativa e informativa. Ele apresenta dados públicos do espaço por meio de experiências visuais e não oferece serviço de navegação, alerta, científico ou de apoio a decisões de qualquer espécie.',
                en
                    ? 'By using the site, you agree to use it only for these purposes and to consult official sources whenever you need accurate or up-to-date information.'
                    : 'Ao usar o site, você concorda em utilizá-lo apenas para esses fins e em consultar as fontes oficiais sempre que precisar de informação exata ou atualizada.',
            ],
        },
        {
            id: 'afiliacao',
            title: en ? 'Affiliation' : 'Afiliação',
            paragraphs: [transparency.paragraphs[0]],
        },
        {
            id: 'fontes',
            title: en ? 'Data sources' : 'Fontes de dados',
            paragraphs: [
                transparency.paragraphs[1],
                en
                    ? 'The data comes from these public sources. The way CaeliView presents it is a visual interpretation by the project: what you see on screen is not the raw output of those sources, and should not be read as an official statement by NASA, JPL, or Caltech. For accuracy, always consult the original source.'
                    : 'Os dados vêm dessas fontes públicas. A forma como o CaeliView os apresenta é uma interpretação visual do projeto: o que você vê na tela não é a saída bruta dessas fontes e não deve ser lido como uma afirmação oficial da NASA, JPL ou Caltech. Para precisão, consulte sempre a fonte original.',
            ],
        },
        {
            id: 'limites',
            title: en ? 'Limits of the visualization' : 'Limites da visualização',
            paragraphs: [
                en
                    ? 'Visualizations are educational and may use visual scale choices, simplifications, approximations, interpolations, and technical fallbacks. Distances, sizes, trajectories, speeds, positions, and proportions may be adapted for legibility and performance.'
                    : 'As visualizações são educativas e podem usar escolhas visuais de escala, simplificações, aproximações, interpolações e fallbacks técnicos. Distâncias, tamanhos, trajetórias, velocidades, posições e proporções podem ser adaptados para legibilidade e desempenho.',
                en
                    ? 'They should not be interpreted as an astronomical, astrodynamic, or operational simulation in real time, nor used for navigation, risk assessment, or any decision that requires precision.'
                    : 'Não devem ser interpretados como simulação astronômica, astrodinâmica ou operacional em tempo real, nem usados para navegação, avaliação de risco ou qualquer decisão que exija precisão.',
            ],
        },
        {
            id: 'responsabilidade',
            title: en ? 'Disclaimer of liability' : 'Isenção de responsabilidade',
            paragraphs: [transparency.paragraphs[3]],
        },
        {
            id: 'disponibilidade',
            title: en ? 'Service availability' : 'Disponibilidade do serviço',
            paragraphs: [
                en
                    ? 'CaeliView may be unavailable, show incomplete data, or change without prior notice, including due to technical limitations, maintenance, network failures, or changes in the external data sources it depends on.'
                    : 'O CaeliView pode ficar indisponível, exibir dados incompletos ou sofrer alterações sem aviso prévio, inclusive por limitações técnicas, manutenção, falhas de rede ou mudanças nas fontes externas de dados das quais depende.',
            ],
        },
        {
            id: 'privacidade',
            title: en ? 'Privacy' : 'Privacidade',
            paragraphs: [
                en
                    ? 'CaeliView does not require sign-up and does not ask for personal data. With your explicit permission, the browser may share your approximate location to show the sky for your region; these coordinates stay on your device (browser storage) and are sent only to an internal service to resolve the place name. They are not sold or shared with third-party tracking services.'
                    : 'O CaeliView não exige cadastro e não pede dados pessoais. Com a sua permissão explícita, o navegador pode compartilhar sua localização aproximada para mostrar o céu da sua região; essas coordenadas ficam no seu dispositivo (armazenamento do navegador) e são enviadas apenas a um serviço interno para resolver o nome do lugar. Não são vendidas nem compartilhadas com serviços de rastreamento de terceiros.',
                en
                    ? 'Local browser storage is used only for functional preferences, such as language, the last location, and the state of the radar guide. The server may record basic technical access information for security, performance, and maintenance.'
                    : 'O armazenamento local do navegador é usado apenas para preferências funcionais, como idioma, a última localização e o estado do guia do radar. O servidor pode registrar informações técnicas básicas de acesso para segurança, desempenho e manutenção.',
            ],
        },
        {
            id: 'propriedade',
            title: en ? 'Intellectual property' : 'Propriedade intelectual',
            paragraphs: [
                en
                    ? 'Public images and data made available by NASA, JPL, and associated missions are used in accordance with the applicable usage guidelines and credits indicated. Images, data, marks, names, logos, and third-party materials remain subject to the rights, credits, licenses, restrictions, and usage guidelines of their respective holders.'
                    : 'As imagens e os dados públicos disponibilizados pela NASA, JPL e missões associadas são usados conforme as diretrizes de uso aplicáveis e os créditos indicados. Imagens, dados, marcas, nomes, logotipos e materiais de terceiros permanecem sujeitos aos direitos, créditos, licenças, restrições e diretrizes de uso de seus respectivos titulares.',
                en
                    ? 'The CaeliView name, interface, and original code belong to the project and may not be reproduced as if they were official material from any space agency.'
                    : 'O nome CaeliView, a interface e o código original pertencem ao projeto e não podem ser reproduzidos como se fossem material oficial de qualquer agência espacial.',
            ],
        },
        {
            id: 'marcas',
            title: en ? 'Names and logos' : 'Marcas e logotipos',
            paragraphs: [
                en
                    ? 'Names, marks, logos, and distinctive signs of NASA, JPL, Caltech, and other institutions are mentioned only to identify the data sources and do not indicate any link, authorization, sponsorship, or endorsement.'
                    : 'Nomes, marcas, logotipos e sinais distintivos da NASA, JPL, Caltech e demais instituições são mencionados apenas para identificação das fontes e não indicam vínculo, autorização, patrocínio ou endosso.',
            ],
        },
        {
            id: 'alteracoes',
            title: en ? 'Changes to these terms' : 'Alterações nestes termos',
            paragraphs: [
                en
                    ? 'These terms may be updated at any time to reflect changes in the project or its data sources. The current version is always the one published on this page.'
                    : 'Estes termos podem ser atualizados a qualquer momento para refletir mudanças no projeto ou em suas fontes de dados. A versão vigente é sempre a publicada nesta página.',
            ],
        },
    ];
}

export default function Terms() {
    const { locale } = useTranslation();
    const en = locale === 'en';
    useAppLayoutOptions({ hideFooter: true });

    const sections = buildSections(locale);
    const updatedLabel = en ? 'Updated on' : 'Atualizado em';

    return (
        <>
            <Head title={en ? 'Terms of use' : 'Termos de uso'} />
            <div className="relative">
                {/* Grade estelar sutil ao fundo, assinatura visual das páginas institucionais. */}
                <div className="pointer-events-none absolute inset-0 space-grid opacity-[0.12]" aria-hidden="true" />
                <div className="relative mx-auto max-w-6xl gap-x-12 px-4 py-12 sm:px-6 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8 lg:py-16">
                    {/* Coluna fixa: identidade da página + índice navegável das seções. */}
                    <aside className="lg:sticky lg:top-24 lg:h-fit">
                        <span className="inline-flex items-center gap-1.5 text-[0.62rem] font-medium uppercase tracking-[0.24em] text-signal-cyan/55">
                            <Info className="size-3" aria-hidden="true" />
                            {en ? 'Transparency' : 'Transparência'}
                        </span>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                            {en ? 'Terms of use' : 'Termos de uso'}
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-white/45">
                            {en
                                ? 'How CaeliView may be used, where its data comes from, and the limits of what it shows.'
                                : 'Como o CaeliView pode ser usado, de onde vêm os seus dados e os limites do que ele mostra.'}
                        </p>
                        <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/30">
                            {updatedLabel} {formatUpdatedAt(locale)}
                        </p>

                        <nav className="mt-8 hidden border-l border-white/10 lg:block" aria-label={en ? 'Sections' : 'Seções'}>
                            {sections.map((section, index) => (
                                <a
                                    key={section.id}
                                    href={`#${section.id}`}
                                    className="group -ml-px flex items-baseline gap-2 border-l border-transparent py-1.5 pl-4 text-[13px] text-white/40 transition hover:border-signal-cyan/60 hover:text-white"
                                >
                                    <span className="text-[10px] font-medium tabular-nums text-signal-cyan/45 transition group-hover:text-signal-cyan/80">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    {section.title}
                                </a>
                            ))}
                        </nav>
                    </aside>

                    {/* Coluna de conteúdo: seções numeradas com filete ciano. */}
                    <div className="mt-10 space-y-12 lg:mt-0">
                        {sections.map((section, index) => (
                            <section key={section.id} id={section.id} className="scroll-mt-24">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-sm font-semibold tabular-nums text-signal-cyan/50">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <h2 className="text-lg font-semibold tracking-tight text-white">{section.title}</h2>
                                </div>
                                <div className="mt-3 space-y-3 border-l border-white/10 pl-5">
                                    {section.paragraphs.map((paragraph) => (
                                        <p key={paragraph} className="max-w-2xl text-sm leading-7 text-white/65">
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
