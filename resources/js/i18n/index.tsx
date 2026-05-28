import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import en from './en';
import ptBR from './pt-BR';

export type Locale = 'pt-BR' | 'en';
type Messages = typeof ptBR;
export type TranslationKey = keyof Messages;
export type Translator = (key: TranslationKey, fallback?: string) => string;

const dictionaries: Record<Locale, Messages> = {
    'pt-BR': ptBR,
    en,
};

type TranslationContextValue = {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: TranslationKey, fallback?: string) => string;
};

const TranslationContext = createContext<TranslationContextValue | null>(null);

export function TranslationProvider({ children }: PropsWithChildren) {
    const [locale, setLocaleState] = useState<Locale>(() => {
        if (typeof window === 'undefined') {
            return 'pt-BR';
        }

        return window.localStorage.getItem('caeli-view-locale') === 'en' ? 'en' : 'pt-BR';
    });

    useEffect(() => {
        document.documentElement.lang = locale;
        window.localStorage.setItem('caeli-view-locale', locale);
    }, [locale]);

    const value = useMemo<TranslationContextValue>(() => ({
        locale,
        setLocale: setLocaleState,
        t: (key, fallback) => dictionaries[locale][key] ?? ptBR[key] ?? fallback ?? key,
    }), [locale]);

    return (
        <TranslationContext.Provider value={value}>
            <div className="language-fade" key={locale}>
                {children}
            </div>
        </TranslationContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(TranslationContext);

    if (!context) {
        throw new Error('useTranslation must be used inside TranslationProvider.');
    }

    return context;
}
