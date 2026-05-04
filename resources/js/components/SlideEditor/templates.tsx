import React from 'react';
import { useTranslation } from 'react-i18next';

export const SLIDE_TEMPLATES = [
    { id: 'noir-manifesto',  name: 'Noir Manifesto',  background: '#0a0a0a', textColor: '#ffffff', font: 'Anton',            fontStyle: '',     letterSpacing: 1,    align: 'center' as const },
    { id: 'dark-cards',      name: 'Dark Cards',       background: '#111827', textColor: '#ffffff', font: 'Poppins',          fontStyle: 'bold', letterSpacing: 0,    align: 'center' as const },
    { id: 'pop-magazine',    name: 'Pop Magazine',     background: '#ffffff', textColor: '#111111', font: 'Anton',            fontStyle: '',     letterSpacing: 0,    align: 'left' as const   },
    { id: 'twitter-x',       name: 'Twitter/X',        background: '#ffffff', textColor: '#000000', font: 'Inter',            fontStyle: 'bold', letterSpacing: -0.5, align: 'left' as const   },
    { id: 'acid-brutalist',  name: 'Acid Brutalist',   background: '#000000', textColor: '#ffffff', font: 'Montserrat',       fontStyle: 'bold', letterSpacing: -2,   align: 'left' as const   },
    { id: 'documentary',     name: 'Documentary',      background: '#1a1108', textColor: '#f0e8d8', font: 'Playfair Display', fontStyle: '',     letterSpacing: 0,    align: 'left' as const   },
];

export function TemplatePreview({ id }: { id: string }) {
    const { t } = useTranslation();
    switch (id) {
        case 'noir-manifesto':
            return (
                <div className="relative w-full h-full flex flex-col justify-end p-2"
                    style={{ background: 'linear-gradient(155deg, #1a1a2e 0%, #0d0d0d 60%)' }}>
                    <div className="absolute inset-0"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 40%, transparent)' }} />
                    <div className="relative z-10 space-y-0.5">
                        <div className="h-0.5 w-4 rounded mb-1" style={{ background: '#E8440A' }} />
                        <div style={{ fontFamily: 'Impact, Arial Black, sans-serif', color: '#fff', fontSize: 9, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>{t('slideEditor.elements.title')}</div>
                        <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, textTransform: 'uppercase' }}>{t('slideEditor.elements.subtitle')}</div>
                    </div>
                </div>
            );
        case 'dark-cards':
            return (
                <div className="w-full h-full flex items-center justify-center"
                    style={{ background: '#111827' }}>
                    <div className="rounded-lg overflow-hidden" style={{ width: '80%', boxShadow: '0 4px 16px rgba(0,0,0,0.6)' }}>
                        <div style={{ height: 36, background: 'linear-gradient(135deg, #374151, #1f2937)' }} />
                        <div className="p-1.5" style={{ background: '#1f2937' }}>
                            <div className="rounded-sm mb-1" style={{ height: 6, background: '#374151', width: '90%' }} />
                            <div className="rounded-sm" style={{ height: 4, background: '#374151', width: '60%' }} />
                        </div>
                    </div>
                </div>
            );
        case 'pop-magazine':
            return (
                <div className="w-full h-full flex flex-col justify-center px-2 py-2" style={{ background: '#fff' }}>
                    <div className="flex items-stretch gap-1.5">
                        <div className="w-1 rounded-full shrink-0" style={{ background: '#E8120A' }} />
                        <div>
                            <div style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: 12, fontWeight: 900, color: '#000', lineHeight: 1, textTransform: 'uppercase' }}>{t('slideEditor.elements.title')}</div>
                            <div style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: 12, fontWeight: 900, color: '#000', lineHeight: 1, textTransform: 'uppercase' }}>{t('slideEditor.elements.big')}</div>
                            <div style={{ fontSize: 5, color: '#666', marginTop: 3 }}>{t('slideEditor.elements.subtitleHere')}</div>
                        </div>
                    </div>
                </div>
            );
        case 'twitter-x':
            return (
                <div className="w-full h-full flex flex-col justify-center px-2.5 py-2" style={{ background: '#fff' }}>
                    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 9, fontWeight: 900, color: '#000', lineHeight: 1.2 }}>{t('slideEditor.elements.largeText')}</div>
                    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 9, fontWeight: 900, color: '#000', lineHeight: 1.2 }}>{t('slideEditor.elements.cleanHere')}</div>
                    <div style={{ height: 1, background: '#e5e7eb', width: '100%', margin: '5px 0' }} />
                    <div style={{ fontSize: 5, color: '#9ca3af' }}>{t('slideEditor.elements.slideDescription')}</div>
                </div>
            );
        case 'acid-brutalist':
            return (
                <div className="w-full h-full flex flex-col justify-center px-2" style={{ background: '#000' }}>
                    <div style={{ fontFamily: 'Arial Black, Impact, sans-serif', fontSize: 11, fontWeight: 900, color: 'transparent', WebkitTextStroke: '0.5px #39FF14', textTransform: 'uppercase', lineHeight: 1 } as React.CSSProperties}>{t('slideEditor.elements.brutal')}</div>
                    <div style={{ fontFamily: 'Arial Black, Impact, sans-serif', fontSize: 11, fontWeight: 900, color: '#39FF14', textTransform: 'uppercase', lineHeight: 1 }}>{t('slideEditor.elements.style')}</div>
                    <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.4)', marginTop: 3, letterSpacing: 1, textTransform: 'uppercase' }}>{t('slideEditor.elements.subtitle')}</div>
                </div>
            );
        case 'documentary':
            return (
                <div className="relative w-full h-full flex flex-col justify-end px-2 py-2" style={{ background: '#1a1108' }}>
                    <div className="absolute inset-0 opacity-30"
                        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.02) 3px, rgba(255,255,255,0.02) 4px)' }} />
                    <div className="relative z-10">
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 5, color: '#9a8866', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{t('slideEditor.elements.investigation')}</div>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 9, fontWeight: 700, color: '#f0e8d8', lineHeight: 1.2 }}>{t('slideEditor.elements.slideTitle')}</div>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 5, color: 'rgba(240,232,216,0.5)', marginTop: 2, fontStyle: 'italic' }}>{t('slideEditor.elements.subtitle')}</div>
                    </div>
                </div>
            );
        default:
            return <div className="w-full h-full" style={{ background: '#f3f4f6' }} />;
    }
}
