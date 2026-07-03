/**
 * Card de foco unificado — asteroides, naves e corpos celestes com o mesmo shell.
 *
 * kind: 'asteroid' → AsteroidFocusCard (Resumo | Perfil físico | Aproximação, + História
 *                    quando famoso); nave (objectType 'spacecraft') → SpacecraftFocusCard
 *                    (Resumo | Missão | História).
 * kind: 'body'     → BodyFocusCard (Resumo | Perfil físico | História).
 *
 * Este arquivo é só o roteador: resolve qual card renderizar e mantém o estado
 * COMPARTILHADO entre eles (aba ativa, animação de entrada e o fade de conteúdo
 * ao trocar de objeto), para a troca de card preservar a transição visual.
 * Os cards vivem em AsteroidFocusCard/SpacecraftFocusCard/BodyFocusCard e as
 * peças comuns (abas, linhas, tipos) em FocusCardParts.
 *
 * Mobile: bottom sheet com abas diretas, sem menu de seções intermediário.
 * Desktop: card do trilho esquerdo, ancorado logo abaixo do painel de navegação.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AsteroidFocusCard } from './AsteroidFocusCard';
import { SpacecraftFocusCard } from './SpacecraftFocusCard';
import { BodyFocusCard } from './BodyFocusCard';
import type { AsteroidProps, BodyProps, Tab } from './FocusCardParts';

type Props = AsteroidProps | BodyProps;

export function UnifiedFocusCard(props: Props) {
    const en = props.locale === 'en';

    const [tab, setTab] = useState<Tab>('summary');

    const [mounted, setMounted] = useState(false);
    useLayoutEffect(() => { setMounted(false); }, []);
    useEffect(() => {
        const t = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(t);
    }, []);

    const currentKey = props.kind === 'asteroid' ? props.object.approach.id : props.body;
    const [contentVisible, setContentVisible] = useState(true);
    const prevKey = useRef(currentKey);
    const prevKind = useRef(props.kind);
    useEffect(() => {
        if (prevKey.current === currentKey) return;
        const kindChanged = prevKind.current !== props.kind;
        prevKey.current = currentKey;
        prevKind.current = props.kind;
        setContentVisible(false);
        if (kindChanged) setTab('summary');
        const t = setTimeout(() => setContentVisible(true), 80);
        return () => clearTimeout(t);
    }, [currentKey, props.kind]);

    const enterStyle = {
        transition: 'opacity 0.18s ease, transform 0.22s cubic-bezier(0.25,0.46,0.45,0.94)',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(10px)',
    };

    if (props.kind === 'body') {
        return (
            <BodyFocusCard
                {...props}
                en={en}
                tab={tab}
                setTab={setTab}
                contentVisible={contentVisible}
                enterStyle={enterStyle}
            />
        );
    }

    // Nave: card próprio (Resumo · Missão · História). Não herda as abas de asteroide, que ficariam
    // vazias (sem evento de aproximação nem medidas físicas do feed).
    if (props.object.approach.objectType === 'spacecraft') {
        return (
            <SpacecraftFocusCard
                {...props}
                en={en}
                tab={tab}
                setTab={setTab}
                contentVisible={contentVisible}
                enterStyle={enterStyle}
            />
        );
    }

    return (
        <AsteroidFocusCard
            {...props}
            en={en}
            tab={tab}
            setTab={setTab}
            contentVisible={contentVisible}
            enterStyle={enterStyle}
        />
    );
}
