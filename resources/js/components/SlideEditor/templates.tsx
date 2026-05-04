import React from 'react';
import { useTranslation } from 'react-i18next';

import { Align, GradientEl, ShapeEl, SLIDE_W, SlideEl, TextEl } from './types';
import { SHADOW_DEFAULTS, uid } from './utils';

export interface TemplateContent {
    eyebrow: string;
    title: string;
    subtitle: string;
    caption: string;
}

interface TemplateScene {
    background: string;
    elements: SlideEl[];
}

export interface SlideTemplate {
    id: string;
    name: string;
    background: string;
    textColor: string;
    font: string;
    fontStyle: string;
    letterSpacing: number;
    align: Align;
    fonts: string[];
    buildScene: (content: TemplateContent, slideH: number) => TemplateScene;
}

function createText(overrides: Partial<TextEl> & Pick<TextEl, 'text' | 'x' | 'y' | 'width' | 'height'>): TextEl {
    return {
        id: uid(),
        type: 'text',
        rotation: 0,
        opacity: 1,
        fontSize: 48,
        fontFamily: 'Inter',
        fill: '#111111',
        fontStyle: '',
        align: 'left',
        verticalAlign: 'top',
        lineHeight: 1.05,
        letterSpacing: 0,
        textDecoration: '',
        stroke: '#000000',
        strokeWidth: 0,
        padding: 0,
        wrap: 'word',
        accentEnabled: false,
        accentColor: '#E8440A',
        accentThickness: 6,
        accentSide: 'left',
        accentGap: 12,
        ...SHADOW_DEFAULTS,
        ...overrides,
    };
}

function createRect(overrides: Partial<ShapeEl> & Pick<ShapeEl, 'type' | 'x' | 'y' | 'width' | 'height'>): ShapeEl {
    return {
        id: uid(),
        rotation: 0,
        opacity: 1,
        fill: '#111111',
        stroke: '#000000',
        strokeWidth: 0,
        cornerRadius: 0,
        borderStyle: 'solid',
        dashEnabled: false,
        ...SHADOW_DEFAULTS,
        ...overrides,
    };
}

function createGradient(overrides: Partial<GradientEl> & Pick<GradientEl, 'x' | 'y' | 'width' | 'height'>): GradientEl {
    return {
        id: uid(),
        type: 'gradient',
        rotation: 0,
        opacity: 1,
        color: '#000000',
        direction: 'bottom',
        ...SHADOW_DEFAULTS,
        ...overrides,
    };
}

function buildNoirManifesto(content: TemplateContent, slideH: number): TemplateScene {
    const titleY = slideH > 1400 ? slideH - 640 : slideH - 430;
    const subtitleY = slideH > 1400 ? slideH - 180 : slideH - 110;
    const captionY = slideH > 1400 ? slideH - 110 : slideH - 62;

    return {
        background: '#090909',
        elements: [
            createRect({
                type: 'circle',
                x: SLIDE_W - 420,
                y: 140,
                width: 360,
                height: 360,
                fill: 'rgba(232,68,10,0.10)',
                stroke: 'rgba(255,255,255,0.08)',
                strokeWidth: 2,
            }),
            createGradient({
                x: 0,
                y: Math.round(slideH * 0.42),
                width: SLIDE_W,
                height: Math.round(slideH * 0.58),
                color: '#000000',
                opacity: 0.9,
            }),
            createRect({
                type: 'rect',
                x: 88,
                y: titleY + 20,
                width: 18,
                height: slideH > 1400 ? 280 : 200,
                fill: '#E8440A',
                cornerRadius: 999,
            }),
            createText({
                x: 130,
                y: titleY - 56,
                width: 340,
                height: 36,
                text: content.eyebrow.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 22,
                fontStyle: '600',
                fill: 'rgba(255,255,255,0.62)',
                letterSpacing: 5,
            }),
            createText({
                x: 130,
                y: titleY,
                width: 780,
                height: slideH > 1400 ? 340 : 240,
                text: content.title.toUpperCase(),
                fontFamily: 'Anton',
                fontSize: slideH > 1400 ? 144 : 112,
                fill: '#ffffff',
                letterSpacing: 1.2,
                lineHeight: 0.92,
            }),
            createText({
                x: 130,
                y: subtitleY,
                width: 660,
                height: 72,
                text: content.subtitle,
                fontFamily: 'Inter',
                fontSize: slideH > 1400 ? 34 : 26,
                fontStyle: '500',
                fill: 'rgba(255,255,255,0.72)',
                lineHeight: 1.25,
            }),
            createText({
                x: 130,
                y: captionY,
                width: 520,
                height: 32,
                text: content.caption.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 18,
                fontStyle: '600',
                fill: '#E8440A',
                letterSpacing: 3.2,
            }),
        ],
    };
}

function buildDarkCards(content: TemplateContent, slideH: number): TemplateScene {
    const cardY = Math.round(slideH * 0.16);
    const cardH = Math.round(slideH * 0.62);
    const innerY = cardY + 34;

    return {
        background: '#0f172a',
        elements: [
            createRect({
                type: 'circle',
                x: 180,
                y: cardY + 40,
                width: 720,
                height: 720,
                fill: 'rgba(59,130,246,0.12)',
                shadowEnabled: false,
            }),
            createRect({
                type: 'rect',
                x: 92,
                y: cardY,
                width: 896,
                height: cardH,
                fill: '#111827',
                stroke: 'rgba(255,255,255,0.08)',
                strokeWidth: 2,
                cornerRadius: 42,
                shadowEnabled: true,
                shadowColor: '#020617',
                shadowBlur: 26,
                shadowOffsetY: 22,
                shadowOffsetX: 0,
                shadowOpacity: 0.45,
            }),
            createRect({
                type: 'rect',
                x: 124,
                y: innerY,
                width: 832,
                height: 120,
                fill: 'rgba(255,255,255,0.04)',
                cornerRadius: 28,
            }),
            createRect({
                type: 'rect',
                x: 154,
                y: innerY + 34,
                width: 180,
                height: 44,
                fill: '#2563eb',
                cornerRadius: 999,
            }),
            createText({
                x: 182,
                y: innerY + 44,
                width: 120,
                height: 26,
                text: content.eyebrow.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 18,
                fontStyle: '700',
                fill: '#eff6ff',
                align: 'center',
            }),
            createText({
                x: 148,
                y: innerY + 164,
                width: 784,
                height: 220,
                text: content.title,
                fontFamily: 'Poppins',
                fontSize: slideH > 1400 ? 96 : 78,
                fontStyle: '700',
                fill: '#ffffff',
                align: 'center',
                lineHeight: 1.04,
            }),
            createText({
                x: 184,
                y: innerY + 372,
                width: 712,
                height: 80,
                text: content.subtitle,
                fontFamily: 'Inter',
                fontSize: slideH > 1400 ? 30 : 24,
                fontStyle: '500',
                fill: 'rgba(255,255,255,0.72)',
                align: 'center',
                lineHeight: 1.3,
            }),
            createRect({
                type: 'rect',
                x: 176,
                y: cardY + cardH - 144,
                width: 220,
                height: 84,
                fill: '#1f2937',
                stroke: 'rgba(255,255,255,0.08)',
                strokeWidth: 2,
                cornerRadius: 24,
            }),
            createRect({
                type: 'rect',
                x: 430,
                y: cardY + cardH - 144,
                width: 220,
                height: 84,
                fill: '#1f2937',
                stroke: 'rgba(255,255,255,0.08)',
                strokeWidth: 2,
                cornerRadius: 24,
            }),
            createRect({
                type: 'rect',
                x: 684,
                y: cardY + cardH - 144,
                width: 220,
                height: 84,
                fill: '#1f2937',
                stroke: 'rgba(255,255,255,0.08)',
                strokeWidth: 2,
                cornerRadius: 24,
            }),
            createText({
                x: 176,
                y: cardY + cardH - 116,
                width: 220,
                height: 42,
                text: '01',
                fontFamily: 'Inter',
                fontSize: 34,
                fontStyle: '700',
                fill: '#60a5fa',
                align: 'center',
            }),
            createText({
                x: 430,
                y: cardY + cardH - 116,
                width: 220,
                height: 42,
                text: 'FAST',
                fontFamily: 'Inter',
                fontSize: 28,
                fontStyle: '700',
                fill: '#f9fafb',
                align: 'center',
                letterSpacing: 1,
            }),
            createText({
                x: 684,
                y: cardY + cardH - 116,
                width: 220,
                height: 42,
                text: content.caption.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 18,
                fontStyle: '600',
                fill: '#94a3b8',
                align: 'center',
                letterSpacing: 2,
            }),
        ],
    };
}

function buildPopMagazine(content: TemplateContent, slideH: number): TemplateScene {
    const footerY = slideH - 120;

    return {
        background: '#fff8f1',
        elements: [
            createRect({
                type: 'rect',
                x: 88,
                y: 86,
                width: 18,
                height: slideH - 172,
                fill: '#E8120A',
                cornerRadius: 999,
            }),
            createRect({
                type: 'circle',
                x: 810,
                y: 88,
                width: 180,
                height: 180,
                fill: '#FFD84D',
                stroke: '#111111',
                strokeWidth: 5,
            }),
            createText({
                x: 832,
                y: 150,
                width: 136,
                height: 60,
                text: 'NEW',
                fontFamily: 'Anton',
                fontSize: 42,
                fill: '#111111',
                align: 'center',
                rotation: -8,
            }),
            createText({
                x: 144,
                y: 120,
                width: 320,
                height: 32,
                text: content.eyebrow.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 20,
                fontStyle: '800',
                fill: '#E8120A',
                letterSpacing: 3,
            }),
            createText({
                x: 138,
                y: 206,
                width: 690,
                height: slideH > 1400 ? 540 : 380,
                text: content.title.toUpperCase(),
                fontFamily: 'Anton',
                fontSize: slideH > 1400 ? 148 : 118,
                fill: '#111111',
                lineHeight: 0.9,
            }),
            createRect({
                type: 'rect',
                x: 142,
                y: slideH > 1400 ? 840 : 700,
                width: 560,
                height: 18,
                fill: '#ff7aa2',
                cornerRadius: 999,
            }),
            createText({
                x: 144,
                y: slideH > 1400 ? 874 : 732,
                width: 700,
                height: 90,
                text: content.subtitle,
                fontFamily: 'Inter',
                fontSize: slideH > 1400 ? 34 : 28,
                fontStyle: '600',
                fill: '#3f3f46',
                lineHeight: 1.2,
            }),
            createRect({
                type: 'rect',
                x: 126,
                y: footerY,
                width: 828,
                height: 60,
                fill: '#111111',
                cornerRadius: 8,
            }),
            createText({
                x: 152,
                y: footerY + 17,
                width: 780,
                height: 24,
                text: content.caption.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 18,
                fontStyle: '700',
                fill: '#ffffff',
                letterSpacing: 2.6,
            }),
        ],
    };
}

function buildTwitterX(content: TemplateContent, slideH: number): TemplateScene {
    const cardY = Math.round(slideH * 0.14);
    const cardH = Math.round(slideH * 0.66);

    return {
        background: '#f3f4f6',
        elements: [
            createRect({
                type: 'rect',
                x: 96,
                y: cardY,
                width: 888,
                height: cardH,
                fill: '#ffffff',
                stroke: '#dbe1e8',
                strokeWidth: 2,
                cornerRadius: 34,
                shadowEnabled: true,
                shadowColor: '#cbd5e1',
                shadowBlur: 18,
                shadowOffsetY: 12,
                shadowOffsetX: 0,
                shadowOpacity: 0.3,
            }),
            createRect({
                type: 'circle',
                x: 144,
                y: cardY + 42,
                width: 76,
                height: 76,
                fill: '#111827',
            }),
            createText({
                x: 242,
                y: cardY + 46,
                width: 360,
                height: 28,
                text: content.eyebrow,
                fontFamily: 'Inter',
                fontSize: 26,
                fontStyle: '700',
                fill: '#111827',
            }),
            createText({
                x: 242,
                y: cardY + 82,
                width: 420,
                height: 24,
                text: '@slidezz  •  now',
                fontFamily: 'Inter',
                fontSize: 20,
                fontStyle: '500',
                fill: '#6b7280',
            }),
            createRect({
                type: 'rect',
                x: 146,
                y: cardY + 150,
                width: 792,
                height: 2,
                fill: '#eef2f7',
            }),
            createText({
                x: 146,
                y: cardY + 192,
                width: 792,
                height: slideH > 1400 ? 430 : 300,
                text: content.title,
                fontFamily: 'Inter',
                fontSize: slideH > 1400 ? 84 : 64,
                fontStyle: '800',
                fill: '#0f172a',
                lineHeight: 1.12,
            }),
            createRect({
                type: 'rect',
                x: 146,
                y: cardY + cardH - 188,
                width: 10,
                height: 96,
                fill: '#2563eb',
                cornerRadius: 999,
            }),
            createText({
                x: 180,
                y: cardY + cardH - 194,
                width: 720,
                height: 70,
                text: content.subtitle,
                fontFamily: 'Inter',
                fontSize: slideH > 1400 ? 30 : 24,
                fontStyle: '500',
                fill: '#475569',
                lineHeight: 1.25,
            }),
            createRect({
                type: 'rect',
                x: 146,
                y: cardY + cardH - 82,
                width: 792,
                height: 2,
                fill: '#eef2f7',
            }),
            createText({
                x: 146,
                y: cardY + cardH - 58,
                width: 792,
                height: 24,
                text: content.caption,
                fontFamily: 'Inter',
                fontSize: 18,
                fontStyle: '600',
                fill: '#64748b',
                letterSpacing: 0.3,
            }),
        ],
    };
}

function buildAcidBrutalist(content: TemplateContent, slideH: number): TemplateScene {
    const titleY = slideH > 1400 ? 360 : 230;

    return {
        background: '#050505',
        elements: [
            createRect({
                type: 'rect',
                x: 56,
                y: 58,
                width: 968,
                height: slideH - 116,
                fill: 'rgba(0,0,0,0)',
                stroke: '#39FF14',
                strokeWidth: 4,
                cornerRadius: 20,
            }),
            createRect({
                type: 'rect',
                x: 784,
                y: 76,
                width: 180,
                height: 66,
                fill: '#ff5a1f',
                rotation: -4,
            }),
            createText({
                x: 806,
                y: 94,
                width: 138,
                height: 32,
                text: 'RAW',
                fontFamily: 'Montserrat',
                fontSize: 28,
                fontStyle: '800',
                fill: '#050505',
                align: 'center',
                rotation: -4,
            }),
            createText({
                x: 96,
                y: 98,
                width: 440,
                height: 30,
                text: content.eyebrow.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 18,
                fontStyle: '700',
                fill: '#39FF14',
                letterSpacing: 4,
            }),
            createText({
                x: 90,
                y: titleY,
                width: 860,
                height: slideH > 1400 ? 420 : 280,
                text: content.title.toUpperCase(),
                fontFamily: 'Montserrat',
                fontSize: slideH > 1400 ? 132 : 110,
                fontStyle: '900',
                fill: 'rgba(0,0,0,0)',
                stroke: '#39FF14',
                strokeWidth: 1.5,
                lineHeight: 0.9,
                letterSpacing: -1.8,
            }),
            createText({
                x: 96,
                y: titleY + (slideH > 1400 ? 356 : 236),
                width: 720,
                height: 80,
                text: content.subtitle.toUpperCase(),
                fontFamily: 'Montserrat',
                fontSize: slideH > 1400 ? 38 : 30,
                fontStyle: '800',
                fill: '#f8fafc',
                letterSpacing: 1.2,
            }),
            createRect({
                type: 'rect',
                x: 96,
                y: titleY + (slideH > 1400 ? 438 : 300),
                width: 380,
                height: 20,
                fill: '#39FF14',
            }),
            createText({
                x: 920,
                y: Math.round(slideH * 0.5),
                width: 180,
                height: 30,
                text: content.caption.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 16,
                fontStyle: '700',
                fill: '#ff5a1f',
                rotation: 90,
                align: 'center',
                letterSpacing: 4,
            }),
            createRect({
                type: 'circle',
                x: 702,
                y: slideH - 286,
                width: 210,
                height: 210,
                fill: 'rgba(57,255,20,0.12)',
                stroke: '#39FF14',
                strokeWidth: 3,
            }),
        ],
    };
}

function buildDocumentary(content: TemplateContent, slideH: number): TemplateScene {
    const frameY = Math.round(slideH * 0.18);
    const frameH = Math.round(slideH * 0.56);

    return {
        background: '#1a1108',
        elements: [
            createRect({
                type: 'rect',
                x: 72,
                y: 72,
                width: 936,
                height: slideH - 144,
                fill: 'rgba(255,255,255,0.02)',
                stroke: 'rgba(240,232,216,0.10)',
                strokeWidth: 2,
                cornerRadius: 12,
            }),
            createText({
                x: 104,
                y: 100,
                width: 380,
                height: 26,
                text: content.eyebrow.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 18,
                fontStyle: '600',
                fill: '#9a8866',
                letterSpacing: 4,
            }),
            createRect({
                type: 'rect',
                x: 96,
                y: frameY,
                width: 888,
                height: frameH,
                fill: '#24160c',
                stroke: 'rgba(240,232,216,0.18)',
                strokeWidth: 2,
                cornerRadius: 8,
            }),
            createRect({
                type: 'rect',
                x: 132,
                y: frameY + 38,
                width: 816,
                height: frameH - 76,
                fill: 'rgba(240,232,216,0.04)',
                stroke: 'rgba(240,232,216,0.08)',
                strokeWidth: 1,
            }),
            createRect({
                type: 'rect',
                x: 720,
                y: frameY - 26,
                width: 200,
                height: 54,
                fill: 'rgba(0,0,0,0)',
                stroke: '#b45309',
                strokeWidth: 2,
                rotation: -5,
            }),
            createText({
                x: 736,
                y: frameY - 10,
                width: 170,
                height: 24,
                text: 'ARCHIVE',
                fontFamily: 'Inter',
                fontSize: 20,
                fontStyle: '800',
                fill: '#b45309',
                align: 'center',
                rotation: -5,
                letterSpacing: 2,
            }),
            createText({
                x: 144,
                y: frameY + 82,
                width: 690,
                height: slideH > 1400 ? 320 : 220,
                text: content.title,
                fontFamily: 'Playfair Display',
                fontSize: slideH > 1400 ? 102 : 78,
                fontStyle: '700',
                fill: '#f0e8d8',
                lineHeight: 1.04,
            }),
            createText({
                x: 148,
                y: frameY + (slideH > 1400 ? 438 : 316),
                width: 648,
                height: 90,
                text: content.subtitle,
                fontFamily: 'Playfair Display',
                fontSize: slideH > 1400 ? 34 : 27,
                fill: 'rgba(240,232,216,0.72)',
                fontStyle: 'italic',
                lineHeight: 1.3,
            }),
            createRect({
                type: 'rect',
                x: 106,
                y: slideH - 120,
                width: 868,
                height: 2,
                fill: 'rgba(240,232,216,0.14)',
            }),
            createText({
                x: 108,
                y: slideH - 100,
                width: 860,
                height: 26,
                text: content.caption.toUpperCase(),
                fontFamily: 'Inter',
                fontSize: 16,
                fontStyle: '600',
                fill: '#9a8866',
                letterSpacing: 3,
            }),
        ],
    };
}

export const SLIDE_TEMPLATES: SlideTemplate[] = [
    {
        id: 'noir-manifesto',
        name: 'Noir Manifesto',
        background: '#0a0a0a',
        textColor: '#ffffff',
        font: 'Anton',
        fontStyle: '',
        letterSpacing: 1,
        align: 'left',
        fonts: ['Anton', 'Inter'],
        buildScene: buildNoirManifesto,
    },
    {
        id: 'dark-cards',
        name: 'Dark Cards',
        background: '#111827',
        textColor: '#ffffff',
        font: 'Poppins',
        fontStyle: 'bold',
        letterSpacing: 0,
        align: 'center',
        fonts: ['Poppins', 'Inter'],
        buildScene: buildDarkCards,
    },
    {
        id: 'pop-magazine',
        name: 'Pop Magazine',
        background: '#fff8f1',
        textColor: '#111111',
        font: 'Anton',
        fontStyle: '',
        letterSpacing: 0,
        align: 'left',
        fonts: ['Anton', 'Inter'],
        buildScene: buildPopMagazine,
    },
    {
        id: 'twitter-x',
        name: 'Twitter/X',
        background: '#f3f4f6',
        textColor: '#000000',
        font: 'Inter',
        fontStyle: 'bold',
        letterSpacing: -0.5,
        align: 'left',
        fonts: ['Inter'],
        buildScene: buildTwitterX,
    },
    {
        id: 'acid-brutalist',
        name: 'Acid Brutalist',
        background: '#050505',
        textColor: '#ffffff',
        font: 'Montserrat',
        fontStyle: 'bold',
        letterSpacing: -2,
        align: 'left',
        fonts: ['Montserrat', 'Inter'],
        buildScene: buildAcidBrutalist,
    },
    {
        id: 'documentary',
        name: 'Documentary',
        background: '#1a1108',
        textColor: '#f0e8d8',
        font: 'Playfair Display',
        fontStyle: '',
        letterSpacing: 0,
        align: 'left',
        fonts: ['Playfair Display', 'Inter'],
        buildScene: buildDocumentary,
    },
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
                    <div className="relative z-10 space-y-0.5" style={{ textAlign: 'left' }}>
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
                        <div className="flex items-center justify-center" style={{ height: 36, background: 'linear-gradient(135deg, #374151, #1f2937)' }}>
                            <div className="rounded-full px-2 py-0.5" style={{ background: '#2563eb' }}>
                                <div style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: 4.5, fontWeight: 700, color: '#eff6ff', letterSpacing: 0.6, textTransform: 'uppercase', textAlign: 'center' }}>
                                    {t('slideEditor.elements.investigation')}
                                </div>
                            </div>
                        </div>
                        <div className="p-1.5" style={{ background: '#1f2937', textAlign: 'center' }}>
                            <div style={{ fontFamily: 'Poppins, Arial, sans-serif', fontSize: 8, fontWeight: 700, color: '#ffffff', lineHeight: 1.05 }}>
                                {t('slideEditor.elements.title')}
                            </div>
                            <div style={{ fontSize: 4.5, color: 'rgba(255,255,255,0.72)', marginTop: 3, lineHeight: 1.25 }}>
                                {t('slideEditor.elements.subtitle')}
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'pop-magazine':
            return (
                <div className="w-full h-full flex flex-col justify-center px-2 py-2" style={{ background: '#fff' }}>
                    <div className="flex items-stretch gap-1.5">
                        <div className="w-1 rounded-full shrink-0" style={{ background: '#E8120A' }} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: 12, fontWeight: 900, color: '#000', lineHeight: 1, textTransform: 'uppercase' }}>{t('slideEditor.elements.title')}</div>
                            <div style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: 12, fontWeight: 900, color: '#000', lineHeight: 1, textTransform: 'uppercase' }}>{t('slideEditor.elements.big')}</div>
                            <div style={{ fontSize: 5, color: '#666', marginTop: 3 }}>{t('slideEditor.elements.subtitleHere')}</div>
                        </div>
                    </div>
                </div>
            );
        case 'twitter-x':
            return (
                <div className="w-full h-full flex flex-col justify-center px-2.5 py-2" style={{ background: '#fff', textAlign: 'left' }}>
                    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 9, fontWeight: 900, color: '#000', lineHeight: 1.2 }}>{t('slideEditor.elements.largeText')}</div>
                    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 9, fontWeight: 900, color: '#000', lineHeight: 1.2 }}>{t('slideEditor.elements.cleanHere')}</div>
                    <div style={{ height: 1, background: '#e5e7eb', width: '100%', margin: '5px 0' }} />
                    <div style={{ fontSize: 5, color: '#9ca3af' }}>{t('slideEditor.elements.slideDescription')}</div>
                </div>
            );
        case 'acid-brutalist':
            return (
                <div className="w-full h-full flex flex-col justify-center px-2" style={{ background: '#000', textAlign: 'left' }}>
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
                    <div className="relative z-10" style={{ textAlign: 'left' }}>
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
