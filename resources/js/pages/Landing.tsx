import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ArrowUpRight,
    Check,
    Menu,
    Play,
    Plus,
    Search,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MotionConfig, animate, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import CreateWays from '@/components/landing/CreateWays';
import type { CreateWay } from '@/components/landing/CreateWays';
import LandingHero from '@/components/landing/LandingHero';
import type { HeroCopy } from '@/components/landing/LandingHero';
import PricingCards from '@/components/pricing/PricingCards';
import type { PricingCardPlan } from '@/components/pricing/PricingCards';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';

const display = 'font-[Urbanist,Inter,sans-serif]';

type Seg = string | { pill: string; filled?: boolean };
type NavLink = { label: string; href: string };
type Faq = { question: string; answer: string };
type Format = {
    title: string;
    networks: string;
    shape: 'feed' | 'vertical' | 'pdf' | 'mp4';
};
type Example = { hook: string; tag: string };
type FeatureCardData = {
    number: string;
    tag: string;
    title: string;
    href: string;
    more: string;
};

type Copy = {
    meta: { title: string; description: string };
    hero: {
        menu: string;
        login: string;
        signup: string;
        goToApp: string;
        menuItems: NavLink[];
        headline: Seg[];
        bullets: string[];
        cta: string;
        seeExamples: string;
        bubble: {
            user: string;
            userTime: string;
            audioTime: string;
            replyText: string;
            replyTime: string;
            thumbnailText: string;
        };
        avatarText: string;
    };
    heroV2: HeroCopy;
    audience: { headline: Seg[]; cta: string };
    how: { cards: FeatureCardData[] };
    ask: {
        heading: Seg[];
        sub: string;
        user: string;
        chips: string[];
        hooks: string[];
        label: string;
    };
    viralWall: { heading: Seg[]; sub: string; rows: Example[][] };
    createWays: {
        kicker: string;
        heading: Seg[];
        sub: string;
        ways: CreateWay[];
    };
    remake: {
        heading: Seg[];
        sub: string;
        url: string;
        originalTag: string;
        yourTag: string;
        originalHook: string;
        yourHook: string;
    };
    photos: {
        heading: Seg[];
        sub: string;
        search: string;
        aiTag: string;
        pinterestTag: string;
    };
    editor: {
        cardAHeading: Seg[];
        cardASub: string;
        cardAText: string;
        cardAChecks: string[];
        cardBHeading: Seg[];
        cardBSub: string;
        brandName: string;
        colorLabel: string;
        accentLabel: string;
    };
    formats: { heading: Seg[]; formats: Format[]; note: string };
    claude: { heading: Seg[]; sub: string; command: string };
    included: { heading: Seg[]; items: string[] };
    pricing: {
        heading: Seg[];
        note: string;
        featuresTitle: string;
        highlightBadge: string;
        saveLabel: (save: string) => string;
        plans: PricingCardPlan[];
        footnote: string;
    };
    faq: { heading: Seg[]; items: Faq[] };
    final: { heading: Seg[]; cta: string };
    footer: {
        tagline: string;
        product: { title: string; links: NavLink[] };
        account: { title: string; login: string; signup: string };
        legal: { title: string; links: NavLink[] };
        copyright: string;
    };
};

const SLIDES_PT: HeroCopy['app']['slides'] = [
    { src: '/landing/s2.webp', text: '5 hábitos de manhã que mudaram meu dia' },
    { src: '/landing/s7.webp', text: '1. Café da manhã de verdade, sem pular' },
    {
        src: '/landing/s3.webp',
        text: '2. 20 minutos de treino antes do celular',
    },
    { src: '/landing/s12.webp', text: '3. Chá e 10 páginas de livro' },
    { src: '/landing/s10.webp', text: '4. Almoço pensado na noite anterior' },
    { src: '/landing/s11.webp', text: '5. Uma foto do dia pra lembrar' },
    { src: '/landing/s8.webp', text: 'Salva pra testar amanhã' },
];

const SLIDES_EN: HeroCopy['app']['slides'] = [
    { src: '/landing/s2.webp', text: '5 morning habits that changed my day' },
    { src: '/landing/s7.webp', text: '1. A real breakfast, never skipped' },
    {
        src: '/landing/s3.webp',
        text: '2. 20 minutes of training before the phone',
    },
    { src: '/landing/s12.webp', text: '3. Tea and 10 pages of a book' },
    { src: '/landing/s10.webp', text: '4. Lunch planned the night before' },
    { src: '/landing/s11.webp', text: '5. One photo of the day to remember' },
    { src: '/landing/s8.webp', text: 'Save this to try tomorrow' },
];

const FEATURES_PT = [
    'Carrosséis ilimitados',
    'Imagens com IA no seu estilo',
    'IA pra textos e legendas',
    'Editor slide a slide',
    'PNG, PDF pro LinkedIn e vídeo MP4',
    'Imagens ilimitadas com sua chave Gemini (opcional)'
];

const FEATURES_EN = [
    'Unlimited carousels',
    'AI images in your style',
    'AI for copy and captions',
    'Slide-by-slide editor',
    'PNG, LinkedIn PDF and MP4 video',
    'Unlimited images with your own Gemini key (optional)'
];

const copy: Record<'pt' | 'en', Copy> = {
    pt: {
        meta: {
            title: 'Slidezz | Uma semana de posts pra todas as suas redes',
            description:
                'O Slidezz cria carrosséis e vídeos com IA a partir de um link, tema ou ideia. Uma semana de posts pronta numa tarde.',
        },
        hero: {
            menu: 'Menu',
            login: 'Entrar',
            signup: 'Criar conta',
            goToApp: 'Ir para o app',
            menuItems: [
                { label: 'Como funciona', href: '#como-funciona' },
                { label: 'Exemplos', href: '#viral' },
                { label: 'Preços', href: '#precos' },
                { label: 'FAQ', href: '#faq' },
            ],
            headline: [
                'Uma ',
                { pill: 'semana' },
                ' de posts pra todas as suas ',
                { pill: 'redes' },
                ' ',
                { pill: 'numa tarde.', filled: true },
            ],
            bullets: [
                'Cole o link de um viral e a IA recria pro seu nicho',
                'Carrossel pro feed e vídeo pros Reels, TikTok e Shorts',
                'PDF pronto pro carrossel do LinkedIn',
            ],
            cta: 'Quero minha semana pronta',
            seeExamples: 'Ver exemplos',
            bubble: {
                user: 'Faz esse viral do TikTok pro meu nicho de skincare',
                userTime: '9:41',
                audioTime: '9:42',
                replyText: 'Pronto: 7 slides com imagem, já em vídeo.',
                replyTime: '9:43',
                thumbnailText:
                    'os únicos 3 produtos de skincare que você precisa',
            },
            avatarText: 'Nunca mais abra o celular sem saber o que postar //',
        },
        heroV2: {
            badgeTag: 'Novo',
            badgeText: 'Cole o link de um viral e a IA recria pro seu nicho',
            badgeHref: '#viral',
            line1: 'Uma semana de posts.',
            line2: 'Numa tarde só.',
            lead: 'Cole um link, um tema ou uma ideia. A IA monta carrossel e vídeo pra todas as suas redes.',
            sub: 'Feed, Reels, TikTok, Shorts e PDF pro LinkedIn. Você revisa, troca o que quiser e exporta.',
            cta: 'Quero minha semana pronta',
            secondary: 'Ver exemplos',
            secondaryHref: '#viral',
            footLeft: 'Uma prévia do editor. Clique em gerar de novo.',
            footRight: 'Role pra descobrir',
            app: {
                workspace: 'Meu workspace',
                project: 'Rotina da manhã',
                status: 'Rascunho',
                sectionLabel: 'Seu workspace',
                nav: [
                    { label: 'Agente' },
                    { label: 'Gerar ideias', count: 12 },
                    { label: 'Agenda' },
                    { label: 'Biblioteca' },
                    { label: 'Slideshows', count: 7 },
                ],
                teamName: 'Studio',
                teamSub: 'Workspace de exemplo',
                kicker: 'Carrossel / 007',
                title: '5 hábitos de manhã que mudaram meu dia',
                generate: 'Gerar de novo',
                generating: 'Gerando os slides...',
                slides: SLIDES_PT,
                canvasHint: 'Você revisa cada slide antes de exportar.',
                panelLabel: 'Detalhes do slide',
                panelBadge: 'Gancho',
                panelTitle: 'Slide 1: o gancho que segura o dedo',
                panelSub:
                    'A IA escreveu o texto e escolheu a foto. Você troca o que quiser.',
                fieldLabel: 'Texto do slide',
                fieldText: '5 hábitos de manhã que mudaram meu dia',
                rows: [
                    { label: 'Formato', value: '1080x1350' },
                    { label: 'Redes', value: 'TikTok + Instagram' },
                    { label: 'Exportar', value: 'PDF pro LinkedIn' },
                ],
                panelFoot: 'Foto e texto continuam editáveis.',
                statusLeft: 'Pronto pra exportar. 7 slides.',
                zoom: '100%',
            },
        },
        audience: {
            headline: [
                'Pra ',
                { pill: 'criadores' },
                ', ',
                { pill: 'marcas', filled: true },
                ' e ',
                { pill: 'agências' },
                ' que precisam postar ',
                { pill: 'todo dia.' },
            ],
            cta: 'Ver como funciona',
        },
        how: {
            cards: [
                {
                    number: '01',
                    tag: 'cole o link',
                    title: '01/ Recrie um viral',
                    href: '#viral',
                    more: 'Saiba mais',
                },
                {
                    number: '02',
                    tag: 'vídeo, artigo ou ideia',
                    title: '02/ Ideia vira post',
                    href: '#ideias',
                    more: 'Saiba mais',
                },
                {
                    number: '03',
                    tag: 'PNG, PDF e MP4',
                    title: '03/ Todas as redes',
                    href: '#formatos',
                    more: 'Saiba mais',
                },
            ],
        },
        ask: {
            heading: [
                { pill: 'Pede.' },
                ' O Slidezz ',
                { pill: 'faz.', filled: true },
            ],
            sub: 'Digite um tema, cole um vídeo do YouTube, um post do Instagram ou um artigo do blog. Sai o carrossel com texto, imagem e design.',
            user: 'Faz um carrossel de 7 slides: cafés da manhã proteicos em menos de 5 minutos. Fotos claras, tom leve.',
            chips: [
                'Criador',
                'Loja',
                'App',
                'Coach',
                'Imobiliária',
                'Agência',
                'Restaurante',
                'Fitness',
            ],
            hooks: [
                'cafés da manhã proteicos em menos de 5 minutos',
                '1. bowl de iogurte com fruta',
                '2. café com proteína',
            ],
            label: 'Feito com Slidezz',
        },
        createWays: {
            kicker: '4 jeitos de criar',
            heading: [
                'Crie com um link, uma ',
                { pill: 'frase', filled: true },
                ' ou no editor.',
            ],
            sub: 'Quatro caminhos pro mesmo carrossel. Comece por um e ajuste no editor, ou peça tudo pelo Claude.',
            ways: [
                {
                    id: 'link',
                    tag: 'Referência',
                    title: 'Cole um link',
                    body: 'Cole um vídeo do YouTube, um post do Instagram ou um artigo. O Slidezz tira as ideias e monta o carrossel.',
                    checks: [
                        'YouTube, Instagram ou artigo',
                        'Carrossel ou stories',
                        'No idioma que você escolher',
                    ],
                    open: 'Abrir',
                    demo: {
                        input: 'youtube.com/watch?v=rotina-matinal',
                        chips: [],
                        result: '8 slides prontos',
                        action: 'Criar carrossel',
                    },
                },
                {
                    id: 'describe',
                    tag: 'IA',
                    title: 'Descreva',
                    body: 'Conte a ideia em uma frase e escolha formato, número de slides e modelo. A IA escreve o texto e coloca as fotos.',
                    checks: [
                        'Escolha quantos slides',
                        'Modelos prontos de design',
                        'Ideias do dia pra sua marca',
                    ],
                    open: 'Abrir',
                    demo: {
                        input: '5 hábitos matinais que mudaram minha vida',
                        chips: ['Carrossel', '7 slides', 'Dark Cards'],
                        result: '7 slides prontos',
                        action: 'Criar carrossel',
                    },
                },
                {
                    id: 'editor',
                    tag: 'Editor',
                    title: 'Do zero',
                    body: 'Monte cada slide no editor, com texto, fotos e cores do seu jeito.',
                    checks: [
                        'Arraste texto e fotos',
                        'Salve como modelo',
                        'Baixe em PDF pro LinkedIn',
                    ],
                    open: 'Abrir',
                    demo: {
                        input: 'os 3 erros que travam seu perfil',
                        chips: [],
                        result: 'PDF baixado',
                        action: 'Baixar',
                    },
                },
                {
                    id: 'claude',
                    tag: 'MCP',
                    title: 'Pelo Claude',
                    body: 'Conecte o Slidezz ao Claude com um comando e peça o carrossel no meio da conversa.',
                    checks: [
                        'Um comando pra conectar',
                        'Cria o carrossel pelo chat',
                        'Lista e duplica seus posts',
                    ],
                    open: 'Abrir',
                    demo: {
                        input: 'cria um carrossel sobre café da manhã proteico',
                        chips: [],
                        result: 'Carrossel criado, 7 slides',
                        action: 'Enviar',
                    },
                },
            ],
        },
        viralWall: {
            heading: ['Conteúdo que ', { pill: 'viraliza', filled: true }],
            sub: 'Carrosséis no formato que bomba no TikTok, Instagram e LinkedIn, pra qualquer nicho.',
            rows: [
                [
                    {
                        hook: 'coisas que parei de comprar e não sinto falta',
                        tag: 'Finanças',
                    },
                    {
                        hook: 'o erro que todo mundo comete no primeiro treino',
                        tag: 'Fitness',
                    },
                    {
                        hook: 'minha rotina de skincare de R$ 50',
                        tag: 'Skincare',
                    },
                    {
                        hook: '3 apps que organizam minha vida',
                        tag: 'Produtividade',
                    },
                    {
                        hook: 'lugares no Brasil que parecem outro país',
                        tag: 'Viagem',
                    },
                    {
                        hook: 'o que eu queria saber aos 20 anos',
                        tag: 'Lifestyle',
                    },
                ],
                [
                    {
                        hook: 'receitas de 15 minutos pra semana toda',
                        tag: 'Receitas',
                    },
                    { hook: 'por que seu cabelo não cresce', tag: 'Cabelo' },
                    { hook: 'looks de trabalho com 5 peças', tag: 'Moda' },
                    {
                        hook: 'sinais de que você precisa de férias',
                        tag: 'Saúde',
                    },
                    {
                        hook: 'como ganhei meus primeiros 10 mil seguidores',
                        tag: 'Marketing',
                    },
                    {
                        hook: 'livros que mudaram meu jeito de pensar',
                        tag: 'Educação',
                    },
                ],
            ],
        },
        remake: {
            heading: ['Recrie ', { pill: 'qualquer viral', filled: true }],
            sub: 'Cola o link de um post do TikTok que viralizou. O Slidezz baixa, entende o formato e refaz no seu nicho, com seu texto e suas imagens.',
            url: 'tiktok.com/@criadora/photo/7431…',
            originalTag: 'Original',
            yourTag: 'Sua versão',
            originalHook: 'treinos que eu faria se começasse de novo',
            yourHook: 'receitas que eu faria se começasse de novo',
        },
        photos: {
            heading: ['Fotos que combinam, ', { pill: 'sem procurar' }],
            sub: 'A IA gera as imagens no estilo do seu post ou puxa fotos do Pinterest. Se preferir, sobe as suas.',
            search: 'café da manhã aesthetic',
            aiTag: 'Gerada por IA',
            pinterestTag: 'Pinterest',
        },
        editor: {
            cardAHeading: ['Ajuste ', { pill: 'o que quiser' }],
            cardASub:
                'A IA monta, você muda texto, fonte, cor e foto slide a slide. Sem refazer do zero.',
            cardAText:
                'coisas que ninguém te conta sobre morar em cidade grande',
            cardAChecks: [
                'gancho mais curto',
                'trocar a foto',
                'fonte maior',
                'subtítulo novo',
            ],
            cardBHeading: [
                'Com a ',
                { pill: 'cara da sua marca', filled: true },
            ],
            cardBSub:
                'Sua cor, sua cor de destaque e seu logo aplicados nos templates.',
            brandName: 'LUMA',
            colorLabel: 'Cor',
            accentLabel: 'Destaque',
        },
        formats: {
            heading: ['Um post, ', { pill: 'todas as redes', filled: true }],
            formats: [
                {
                    title: 'Feed 4:5',
                    networks: 'Instagram, LinkedIn e carrossel do TikTok',
                    shape: 'feed',
                },
                {
                    title: 'Vertical 9:16',
                    networks: 'Stories, Reels, TikTok e Shorts',
                    shape: 'vertical',
                },
                {
                    title: 'PDF',
                    networks: 'Carrossel de documento do LinkedIn',
                    shape: 'pdf',
                },
                {
                    title: 'Vídeo MP4',
                    networks: 'Slideshow em vídeo pros Reels, TikTok e Shorts',
                    shape: 'mp4',
                },
            ],
            note: 'Postagem automática no Instagram e no TikTok chega em breve.',
        },
        claude: {
            heading: ['Funciona dentro do ', { pill: 'Claude' }],
            sub: 'Conecta o Slidezz ao Claude e pede slideshows direto na conversa.',
            command:
                'claude mcp add --transport http slidezz https://slidezz.app/mcp',
        },
        included: {
            heading: ['Tudo ', { pill: 'incluso', filled: true }],
            items: [
                'Carrosséis ilimitados',
                'Imagens com IA inclusas no plano',
                'Ilimitado com sua chave Gemini (opcional)',
                'Recriar viral do TikTok pelo link',
                'Carrossel a partir de vídeo, post ou artigo',
                'Ideias a partir do perfil da sua marca',
                'Fotos do Pinterest ou suas',
                '8 templates',
                'Cor e logo da sua marca',
                '6 idiomas',
                'PNG, PDF e vídeo MP4',
                'Feed 4:5 e vertical 9:16',
                'Editor slide a slide',
                'Acesso pelo Claude (MCP)',
            ],
        },
        pricing: {
            heading: ['Preços ', { pill: 'simples' }],
            note: 'Checkout seguro (SSL). Sem fidelidade. Cancele quando quiser.',
            featuresTitle: 'O que está incluso:',
            highlightBadge: 'Mais escolhido',
            saveLabel: (save) => `Poupe ${save}`,
            plans: [
                {
                    key: 'weekly',
                    name: 'Semanal',
                    billing_note: 'Pagamento único · Acesso por 7 dias',
                    per_day: '~R$6,84/dia',
                    credits_note: '20 imagens com IA nos 7 dias',
                    features: FEATURES_PT,
                    price_label: 'R$47,90',
                    compare_at: null,
                    save: null,
                    highlighted: false,
                    suffix: '/7 dias',
                    cta: 'Quero o Semanal',
                },
                {
                    key: 'monthly',
                    name: 'Mensal',
                    billing_note: 'Cobrado mensalmente · Sem fidelidade',
                    per_day: '~R$3,26/dia',
                    credits_note: '50 imagens com IA por mês',
                    features: FEATURES_PT,
                    price_label: 'R$97,90',
                    compare_at: null,
                    save: null,
                    highlighted: false,
                    suffix: '/mês',
                    cta: 'Assinar Mensal',
                },
                {
                    key: 'annual',
                    name: 'Anual',
                    billing_note: 'Cobrado anualmente · Sem fidelidade',
                    per_day: '~R$0,82/dia',
                    credits_note: '150 imagens com IA por mês',
                    features: FEATURES_PT,
                    price_label: 'R$297,90',
                    compare_at: 'R$1.174,80',
                    save: '75%',
                    highlighted: true,
                    suffix: '/ano',
                    cta: 'Assinar Anual',
                },
            ],
            footnote:
                'O Semanal não renova sozinho. Mensal e Anual: cancele quando quiser. Com sua chave Gemini, imagens ilimitadas em qualquer plano.',
        },
        faq: {
            heading: ['Perguntas ', { pill: 'frequentes' }],
            items: [
                {
                    question: 'O que é o Slidezz?',
                    answer: 'Uma ferramenta que cria carrosséis e slideshows com IA: texto, imagens e design. Você baixa pronto e posta em qualquer rede.',
                },
                {
                    question: 'Pra quem é?',
                    answer: 'Criadores, marcas, lojas, apps, coaches e agências que precisam postar todo dia sem passar o dia fazendo post.',
                },
                {
                    question: 'Preciso saber design?',
                    answer: 'Não. A IA monta o texto, escolhe o layout e gera as imagens. Se quiser, você ajusta no editor.',
                },
                {
                    question: 'Como recrio um viral?',
                    answer: 'Cola o link do post do TikTok. O Slidezz baixa o post, entende o formato e refaz no seu nicho com seu texto e suas imagens.',
                },
                {
                    question: 'É ok copiar o post de outra pessoa?',
                    answer: 'O Slidezz copia o formato, não o conteúdo. O texto e as imagens saem novos, feitos pro seu nicho.',
                },
                {
                    question: 'De onde vêm as imagens?',
                    answer: 'A IA gera no estilo do seu post, ou você puxa fotos do Pinterest, ou sobe as suas.',
                },
                {
                    question: 'O que gasta crédito?',
                    answer: 'Só imagem gerada por IA: 1 imagem, 1 crédito. Texto, edição e exportação não gastam. Com sua chave Gemini, as imagens não gastam crédito.',
                },
                {
                    question: 'O Slidezz posta sozinho?',
                    answer: 'Ainda não. Você baixa em PNG, PDF ou MP4 e posta pelo app da rede. A postagem automática no Instagram e no TikTok chega em breve.',
                },
                {
                    question: 'Funciona pro LinkedIn?',
                    answer: 'Sim. Exporta o carrossel em PDF, o formato que o LinkedIn aceita.',
                },
                {
                    question: 'Em quais idiomas?',
                    answer: 'Português, inglês, espanhol, alemão, francês e italiano.',
                },
                {
                    question: 'Funciona no celular?',
                    answer: 'Sim, no navegador de qualquer aparelho. Sem instalar nada.',
                },
                {
                    question: 'Posso cancelar?',
                    answer: 'Sim, a assinatura se cancela direto no painel, sem multa.',
                },
            ],
        },
        final: {
            heading: [
                'Sua ',
                { pill: 'semana de posts' },
                ' fica ',
                { pill: 'pronta hoje.', filled: true },
            ],
            cta: 'Quero minha semana pronta',
        },
        footer: {
            tagline: 'Uma semana de posts pra todas as suas redes numa tarde.',
            product: {
                title: 'Produto',
                links: [
                    { label: 'Como funciona', href: '#como-funciona' },
                    { label: 'Exemplos', href: '#viral' },
                    { label: 'Preços', href: '#precos' },
                    { label: 'FAQ', href: '#faq' },
                ],
            },
            account: { title: 'Conta', login: 'Entrar', signup: 'Criar conta' },
            legal: {
                title: 'Legal',
                links: [
                    { label: 'Termos', href: '/terms' },
                    { label: 'Privacidade', href: '/privacy-policy' },
                    { label: 'Blog', href: '/blog' },
                ],
            },
            copyright: '© 2026 Slidezz',
        },
    },
    en: {
        meta: {
            title: 'Slidezz | A week of posts for every network',
            description:
                'Slidezz makes AI carousels and videos from a link, topic or idea. A week of posts ready in one afternoon.',
        },
        hero: {
            menu: 'Menu',
            login: 'Log in',
            signup: 'Sign up',
            goToApp: 'Go to app',
            menuItems: [
                { label: 'How it works', href: '#como-funciona' },
                { label: 'Examples', href: '#viral' },
                { label: 'Pricing', href: '#precos' },
                { label: 'FAQ', href: '#faq' },
            ],
            headline: [
                'A ',
                { pill: 'week' },
                ' of posts for every ',
                { pill: 'network' },
                ' ',
                { pill: 'in one afternoon.', filled: true },
            ],
            bullets: [
                'Paste a viral link and AI remakes it for your niche',
                'Feed carousels plus video for Reels, TikTok and Shorts',
                'PDF ready for LinkedIn carousels',
            ],
            cta: 'Get my week of posts',
            seeExamples: 'See examples',
            bubble: {
                user: 'Remake this viral TikTok for my skincare niche',
                userTime: '9:41',
                audioTime: '9:42',
                replyText: 'Done: 7 slides with images, already a video.',
                replyTime: '9:43',
                thumbnailText: 'the only 3 skincare products you need',
            },
            avatarText: 'Never open your phone without knowing what to post //',
        },
        heroV2: {
            badgeTag: 'New',
            badgeText: 'Paste a viral link and AI remakes it for your niche',
            badgeHref: '#viral',
            line1: 'A week of posts.',
            line2: 'In one afternoon.',
            lead: 'Paste a link, a topic or an idea. AI builds carousels and videos for every network you post on.',
            sub: 'Feed, Reels, TikTok, Shorts and a PDF for LinkedIn. You review, swap anything and export.',
            cta: 'Get my week of posts',
            secondary: 'See examples',
            secondaryHref: '#viral',
            footLeft: 'A preview of the editor. Hit generate again.',
            footRight: 'Scroll to discover',
            app: {
                workspace: 'My workspace',
                project: 'Morning routine',
                status: 'Draft',
                sectionLabel: 'Your workspace',
                nav: [
                    { label: 'Agent' },
                    { label: 'Generate ideas', count: 12 },
                    { label: 'Schedule' },
                    { label: 'Media' },
                    { label: 'Slideshows', count: 7 },
                ],
                teamName: 'Studio',
                teamSub: 'Sample workspace',
                kicker: 'Carousel / 007',
                title: '5 morning habits that changed my day',
                generate: 'Generate again',
                generating: 'Generating slides...',
                slides: SLIDES_EN,
                canvasHint: 'You review every slide before exporting.',
                panelLabel: 'Slide details',
                panelBadge: 'Hook',
                panelTitle: 'Slide 1: the hook that stops the scroll',
                panelSub:
                    'AI wrote the text and picked the photo. Swap anything you like.',
                fieldLabel: 'Slide text',
                fieldText: '5 morning habits that changed my day',
                rows: [
                    { label: 'Format', value: '1080x1350' },
                    { label: 'Networks', value: 'TikTok + Instagram' },
                    { label: 'Export', value: 'PDF for LinkedIn' },
                ],
                panelFoot: 'Photo and text stay editable.',
                statusLeft: 'Ready to export. 7 slides.',
                zoom: '100%',
            },
        },
        audience: {
            headline: [
                'For ',
                { pill: 'creators' },
                ', ',
                { pill: 'brands', filled: true },
                ' and ',
                { pill: 'agencies' },
                ' who need to post ',
                { pill: 'every day.' },
            ],
            cta: 'See how it works',
        },
        how: {
            cards: [
                {
                    number: '01',
                    tag: 'paste a link',
                    title: '01/ Remake a viral',
                    href: '#viral',
                    more: 'Learn more',
                },
                {
                    number: '02',
                    tag: 'video, article or idea',
                    title: '02/ Idea to post',
                    href: '#ideias',
                    more: 'Learn more',
                },
                {
                    number: '03',
                    tag: 'PNG, PDF and MP4',
                    title: '03/ Every network',
                    href: '#formatos',
                    more: 'Learn more',
                },
            ],
        },
        ask: {
            heading: [
                { pill: 'Ask.' },
                ' Slidezz ',
                { pill: 'makes it.', filled: true },
            ],
            sub: 'Type a topic, or paste a YouTube video, an Instagram post or a blog article. Out comes the carousel with copy, images and design.',
            user: 'Make a 7-slide carousel: high-protein breakfasts in under 5 minutes. Bright photos, light tone.',
            chips: [
                'Creator',
                'Store',
                'App',
                'Coach',
                'Real estate',
                'Agency',
                'Restaurant',
                'Fitness',
            ],
            hooks: [
                'high-protein breakfasts in under 5 minutes',
                '1. yogurt and fruit bowl',
                '2. protein coffee',
            ],
            label: 'Made with Slidezz',
        },
        createWays: {
            kicker: '4 ways to create',
            heading: [
                'Create from a link, a ',
                { pill: 'sentence', filled: true },
                ' or the editor.',
            ],
            sub: 'Four paths to the same carousel. Start with one and fine-tune in the editor, or ask for it all in Claude.',
            ways: [
                {
                    id: 'link',
                    tag: 'Reference',
                    title: 'Paste a link',
                    body: 'Paste a YouTube video, an Instagram post or an article. Slidezz pulls the ideas and builds the carousel.',
                    checks: [
                        'YouTube, Instagram or article',
                        'Carousel or stories',
                        'In the language you pick',
                    ],
                    open: 'Open',
                    demo: {
                        input: 'youtube.com/watch?v=morning-routine',
                        chips: [],
                        result: '8 slides ready',
                        action: 'Create carousel',
                    },
                },
                {
                    id: 'describe',
                    tag: 'AI',
                    title: 'Describe',
                    body: 'Write the idea in one sentence and pick the format, slide count and template. The AI writes the copy and adds the photos.',
                    checks: [
                        'Pick how many slides',
                        'Ready-made design templates',
                        'Daily ideas for your brand',
                    ],
                    open: 'Open',
                    demo: {
                        input: '5 morning habits that changed my life',
                        chips: ['Carousel', '7 slides', 'Dark Cards'],
                        result: '7 slides ready',
                        action: 'Create carousel',
                    },
                },
                {
                    id: 'editor',
                    tag: 'Editor',
                    title: 'From scratch',
                    body: 'Build each slide in the editor, with your own text, photos and colors.',
                    checks: [
                        'Drag in text and photos',
                        'Save it as a template',
                        'Download a PDF for LinkedIn',
                    ],
                    open: 'Open',
                    demo: {
                        input: '3 mistakes holding your profile back',
                        chips: [],
                        result: 'PDF downloaded',
                        action: 'Download',
                    },
                },
                {
                    id: 'claude',
                    tag: 'MCP',
                    title: 'In Claude',
                    body: 'Connect Slidezz to Claude with one command and ask for the carousel mid-conversation.',
                    checks: [
                        'One command to connect',
                        'Creates the carousel in chat',
                        'Lists and duplicates your posts',
                    ],
                    open: 'Open',
                    demo: {
                        input: 'make a carousel about high-protein breakfasts',
                        chips: [],
                        result: 'Carousel created, 7 slides',
                        action: 'Send',
                    },
                },
            ],
        },
        viralWall: {
            heading: ['Content that ', { pill: 'goes viral', filled: true }],
            sub: 'Carousels in the format that blows up on TikTok, Instagram and LinkedIn, for any niche.',
            rows: [
                [
                    {
                        hook: "things I stopped buying and don't miss",
                        tag: 'Finance',
                    },
                    {
                        hook: 'the mistake everyone makes on their first workout',
                        tag: 'Fitness',
                    },
                    { hook: 'my $10 skincare routine', tag: 'Skincare' },
                    {
                        hook: '3 apps that run my whole life',
                        tag: 'Productivity',
                    },
                    {
                        hook: 'places in the US that feel like another country',
                        tag: 'Travel',
                    },
                    {
                        hook: 'what I wish I knew at 20',
                        tag: 'Lifestyle',
                    },
                ],
                [
                    {
                        hook: '15-minute recipes for the whole week',
                        tag: 'Recipes',
                    },
                    { hook: "why your hair isn't growing", tag: 'Hair' },
                    { hook: 'work outfits with 5 pieces', tag: 'Fashion' },
                    {
                        hook: 'signs you need a vacation',
                        tag: 'Health',
                    },
                    {
                        hook: 'how I got my first 10k followers',
                        tag: 'Marketing',
                    },
                    {
                        hook: 'books that changed how I think',
                        tag: 'Education',
                    },
                ],
            ],
        },
        remake: {
            heading: ['Remake ', { pill: 'any viral', filled: true }],
            sub: 'Paste the link of a TikTok post that went viral. Slidezz downloads it, reads the format and remakes it for your niche, with your copy and your images.',
            url: 'tiktok.com/@creator/photo/7431…',
            originalTag: 'Original',
            yourTag: 'Your version',
            originalHook: "workouts I'd do if I started over",
            yourHook: "recipes I'd cook if I started over",
        },
        photos: {
            heading: ['Photos that match, ', { pill: 'no searching' }],
            sub: "AI generates images in your post's style or pulls photos from Pinterest. Or upload your own.",
            search: 'aesthetic breakfast',
            aiTag: 'AI generated',
            pinterestTag: 'Pinterest',
        },
        editor: {
            cardAHeading: ['Tweak ', { pill: 'anything' }],
            cardASub:
                'AI builds it, you change copy, font, color and photo slide by slide. No starting over.',
            cardAText: 'things nobody tells you about big city life',
            cardAChecks: [
                'shorter hook',
                'swap the photo',
                'bigger font',
                'new subtitle',
            ],
            cardBHeading: ['Always ', { pill: 'on brand', filled: true }],
            cardBSub:
                'Your color, your accent color and your logo applied to every template.',
            brandName: 'LUMA',
            colorLabel: 'Color',
            accentLabel: 'Accent',
        },
        formats: {
            heading: ['One post, ', { pill: 'every network', filled: true }],
            formats: [
                {
                    title: 'Feed 4:5',
                    networks: 'Instagram, LinkedIn and TikTok carousels',
                    shape: 'feed',
                },
                {
                    title: 'Vertical 9:16',
                    networks: 'Stories, Reels, TikTok and Shorts',
                    shape: 'vertical',
                },
                {
                    title: 'PDF',
                    networks: 'LinkedIn document carousel',
                    shape: 'pdf',
                },
                {
                    title: 'MP4 video',
                    networks: 'Video slideshow for Reels, TikTok and Shorts',
                    shape: 'mp4',
                },
            ],
            note: 'Auto-posting to Instagram and TikTok is coming soon.',
        },
        claude: {
            heading: ['Works inside ', { pill: 'Claude' }],
            sub: 'Connect Slidezz to Claude and ask for slideshows right in the chat.',
            command:
                'claude mcp add --transport http slidezz https://slidezz.app/mcp',
        },
        included: {
            heading: ['Everything ', { pill: 'included', filled: true }],
            items: [
                'Unlimited carousels',
                'AI images included in your plan',
                'Unlimited with your own Gemini key (optional)',
                'Remake a viral TikTok from its link',
                'Carousels from a video, post or article',
                'Ideas from your brand profile',
                'Pinterest photos or your own',
                '8 templates',
                'Your brand color and logo',
                '6 languages',
                'PNG, PDF and MP4 video',
                '4:5 feed and 9:16 vertical',
                'Slide-by-slide editor',
                'Access from Claude (MCP)',
            ],
        },
        pricing: {
            heading: ['Simple ', { pill: 'pricing' }],
            note: 'Secure checkout (SSL). No lock-in. Cancel anytime.',
            featuresTitle: "What's included:",
            highlightBadge: 'Most popular',
            saveLabel: (save) => `Save ${save}`,
            plans: [
                {
                    key: 'weekly',
                    name: 'Weekly',
                    billing_note: 'One-time payment · 7 days of access',
                    per_day: '~$1.41/day',
                    credits_note: '20 AI images for 7 days',
                    features: FEATURES_EN,
                    price_label: '$9.90',
                    compare_at: null,
                    save: null,
                    highlighted: false,
                    suffix: '/7 days',
                    cta: 'Get Weekly',
                },
                {
                    key: 'monthly',
                    name: 'Monthly',
                    billing_note: 'Billed monthly · Cancel anytime',
                    per_day: '~$0.66/day',
                    credits_note: '50 AI images per month',
                    features: FEATURES_EN,
                    price_label: '$19.90',
                    compare_at: null,
                    save: null,
                    highlighted: false,
                    suffix: '/month',
                    cta: 'Get Monthly',
                },
                {
                    key: 'annual',
                    name: 'Annual',
                    billing_note: 'Billed yearly · Cancel anytime',
                    per_day: '~$0.16/day',
                    credits_note: '150 AI images per month',
                    features: FEATURES_EN,
                    price_label: '$59.90',
                    compare_at: '$238.80',
                    save: '75%',
                    highlighted: true,
                    suffix: '/year',
                    cta: 'Get Annual',
                },
            ],
            footnote:
                'Weekly does not auto-renew. Monthly and Annual: cancel anytime. With your own Gemini key, images are unlimited on any plan.',
        },
        faq: {
            heading: ['Frequently asked ', { pill: 'questions' }],
            items: [
                {
                    question: 'What is Slidezz?',
                    answer: 'A tool that makes carousels and slideshows with AI: copy, images and design. You download them ready to post on any network.',
                },
                {
                    question: 'Who is it for?',
                    answer: 'Creators, brands, stores, apps, coaches and agencies who need to post every day without spending the day making posts.',
                },
                {
                    question: 'Do I need design skills?',
                    answer: 'No. AI writes the copy, picks the layout and makes the images. You can tweak anything in the editor.',
                },
                {
                    question: 'How do I remake a viral post?',
                    answer: 'Paste the TikTok post link. Slidezz downloads it, reads the format and remakes it for your niche with your copy and images.',
                },
                {
                    question: "Is it okay to copy someone else's post?",
                    answer: 'Slidezz copies the format, not the content. The copy and images come out new, made for your niche.',
                },
                {
                    question: 'Where do the images come from?',
                    answer: "AI generates them in your post's style, or you pull photos from Pinterest, or upload your own.",
                },
                {
                    question: 'What uses credits?',
                    answer: "Only AI-generated images: 1 image, 1 credit. Copy, edits and exports are free. With your own Gemini key, images don't use credits.",
                },
                {
                    question: 'Does Slidezz post for me?',
                    answer: "Not yet. You download PNG, PDF or MP4 and post from the network's app. Auto-posting to Instagram and TikTok is coming soon.",
                },
                {
                    question: 'Does it work for LinkedIn?',
                    answer: 'Yes. Export the carousel as a PDF, the format LinkedIn accepts.',
                },
                {
                    question: 'Which languages?',
                    answer: 'Portuguese, English, Spanish, German, French and Italian.',
                },
                {
                    question: 'Does it work on mobile?',
                    answer: 'Yes, in the browser on any device. Nothing to install.',
                },
                {
                    question: 'Can I cancel?',
                    answer: 'Yes, cancel your subscription right in the dashboard, no fees.',
                },
            ],
        },
        final: {
            heading: [
                'Your ',
                { pill: 'week of posts' },
                ', ',
                { pill: 'done today.', filled: true },
            ],
            cta: 'Get my week of posts',
        },
        footer: {
            tagline: 'A week of posts for every network in one afternoon.',
            product: {
                title: 'Product',
                links: [
                    { label: 'How it works', href: '#como-funciona' },
                    { label: 'Examples', href: '#viral' },
                    { label: 'Pricing', href: '#precos' },
                    { label: 'FAQ', href: '#faq' },
                ],
            },
            account: { title: 'Account', login: 'Log in', signup: 'Sign up' },
            legal: {
                title: 'Legal',
                links: [
                    { label: 'Terms', href: '/terms' },
                    { label: 'Privacy', href: '/privacy-policy' },
                    { label: 'Blog', href: '/blog' },
                ],
            },
            copyright: '© 2026 Slidezz',
        },
    },
};

const photos = {
    s2: '/landing/s2.webp',
    s3: '/landing/s3.webp',
    s4: '/landing/s4.webp',
    s5: '/landing/s5.webp',
    s6: '/landing/s6.webp',
    s7: '/landing/s7.webp',
    s8: '/landing/s8.webp',
    s9: '/landing/s9.webp',
    s10: '/landing/s10.webp',
    s11: '/landing/s11.webp',
    s12: '/landing/s12.webp',
    hero: '/landing/hero.webp',
    heroSm: '/landing/hero-sm.webp',
    card1: '/landing/card1.webp',
    card2: '/landing/card2.webp',
    card3: '/landing/card3.webp',
};

function PillWord({
    word,
    filled,
    tone = 'dark',
    className,
}: {
    word: string;
    filled?: boolean;
    tone?: 'dark' | 'light';
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-block rounded-full border-[1.5px] px-[0.35em] leading-[1.05] whitespace-nowrap',
                filled
                    ? tone === 'light'
                        ? 'border-[#D4F27A] bg-[#D4F27A] text-[#111]'
                        : 'border-[#BFD9EE] bg-[#BFD9EE]'
                    : tone === 'light'
                      ? 'border-white text-white'
                      : 'border-[#111]',
                className,
            )}
        >
            {word}
        </span>
    );
}

function Headline({
    segments,
    tone = 'dark',
}: {
    segments: Seg[];
    tone?: 'dark' | 'light';
}) {
    return (
        <>
            {segments.map((seg, i) =>
                typeof seg === 'string' ? (
                    <span key={i}>{seg}</span>
                ) : (
                    <PillWord
                        key={i}
                        word={seg.pill}
                        filled={seg.filled}
                        tone={tone}
                    />
                ),
            )}
        </>
    );
}

function RoundArrow({
    href,
    icon: Icon = ArrowUpRight,
    label,
    className,
    onClick,
    disabled,
}: {
    href?: string;
    icon?: LucideIcon;
    label: string;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
}) {
    const cls = cn(
        'inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111] disabled:pointer-events-none disabled:opacity-30 sm:h-14 sm:w-14',
        className,
    );

    if (href) {
        return (
            <Link href={href} aria-label={label} className={cls}>
                <Icon className="h-5 w-5" />
            </Link>
        );
    }

    return (
        <button
            type="button"
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className={cls}
        >
            <Icon className="h-5 w-5" />
        </button>
    );
}

function CtaPill({
    href,
    children,
    variant = 'outline',
    className,
}: {
    href: string;
    children: ReactNode;
    variant?: 'outline' | 'solid';
    className?: string;
}) {
    return (
        <Link
            href={href}
            className={cn(
                'inline-flex h-12 items-center justify-center gap-3 rounded-full px-6 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]',
                variant === 'outline'
                    ? 'border-[1.5px] border-[#111] text-[#111] hover:bg-[#111] hover:text-white'
                    : 'bg-[#111] text-white hover:bg-[#333]',
                className,
            )}
        >
            {children}
            {variant === 'outline' && (
                <span className="h-2.5 w-2.5 rounded-full bg-[#8DB8E0]" />
            )}
        </Link>
    );
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_BACK: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

/** Rise-in used by the hero's supporting blocks. */
function rise(delay: number, y = 16) {
    return {
        initial: { opacity: 0, y },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: EASE_OUT, delay },
    };
}

// ─── "Pede. O Slidezz faz." demo ─────────────────────────────────────────────
// Plays once when it scrolls into view: the request types itself, a niche chip
// gets clicked, a beat of stillness, then the carousel slides out from behind
// the request and fans open. Its captions land, then the "made with" stamp.

const ASK_PHOTOS = [photos.s7, photos.s12, photos.s2];
const ASK_FAN = [
    { rotate: -6, lag: 0.1, className: '-mr-6' },
    { rotate: 0, lag: 0, className: 'z-10 -mr-6' },
    { rotate: 6, lag: 0.18, className: '' },
];

function AskDemo({ ask }: { ask: Copy['ask'] }) {
    const [play, setPlay] = useState(false);
    // null = the whole request is shown (SSR, reduced motion, typing done).
    const [typed, setTyped] = useState<number | null>(null);
    const typing = useRef<{ stop: () => void } | null>(null);
    const reduce = useReducedMotion();

    useEffect(() => () => typing.current?.stop(), []);

    const typeAt = 0.35;
    const typeFor = Math.min(1.6, ask.user.length * 0.016);
    const pickAt = typeAt + typeFor + 0.15;
    const cardsAt = pickAt + 0.45; // stillness before the result
    const labelAt = cardsAt + 0.95;

    const start = () => {
        if (play) {
            return;
        }

        setPlay(true);

        if (reduce) {
            return;
        }

        setTyped(0);
        typing.current = animate(0, ask.user.length, {
            delay: typeAt,
            duration: typeFor,
            ease: 'linear',
            onUpdate: (value) => setTyped(Math.round(value)),
            onComplete: () => setTyped(null),
        });
    };

    const shown = typed === null ? ask.user : ask.user.slice(0, typed);
    const hidden = typed === null ? '' : ask.user.slice(typed);

    return (
        <motion.div
            onViewportEnter={start}
            viewport={{ once: true, amount: 0.35 }}
        >
            <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:items-center">
                <motion.div
                    className="rounded-[28px] bg-[#F3F5F7] p-5 sm:p-8"
                    initial={{ opacity: 0, y: 24 }}
                    animate={play ? { opacity: 1, y: 0 } : undefined}
                    transition={{ duration: 0.6, ease: EASE_OUT }}
                >
                    <div className="rounded-[18px] bg-white p-4 shadow-[0_8px_24px_rgba(17,17,17,0.08)]">
                        <p className="text-sm leading-relaxed text-[#111]">
                            {shown}
                            {typed !== null && (
                                <span
                                    aria-hidden="true"
                                    className="ml-px inline-block h-[1.05em] w-[2px] translate-y-[2px] bg-[#111]"
                                />
                            )}
                            {hidden && (
                                <span
                                    aria-hidden="true"
                                    className="text-transparent"
                                >
                                    {hidden}
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {ask.chips.map((chip, index) => {
                            const enter = 0.15 + index * 0.035;
                            const picked = index === 0;

                            return (
                                <motion.span
                                    key={chip}
                                    className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#111]"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={
                                        play
                                            ? {
                                                  opacity: 1,
                                                  y: 0,
                                                  ...(picked && {
                                                      scale: [1, 0.88, 1],
                                                      backgroundColor:
                                                          '#111111',
                                                      borderColor: '#111111',
                                                      color: '#ffffff',
                                                  }),
                                              }
                                            : undefined
                                    }
                                    transition={{
                                        default: {
                                            duration: 0.45,
                                            ease: EASE_OUT,
                                            delay: enter,
                                        },
                                        scale: {
                                            duration: 0.24,
                                            delay: pickAt,
                                        },
                                        backgroundColor: {
                                            duration: 0.12,
                                            delay: pickAt,
                                        },
                                        borderColor: {
                                            duration: 0.12,
                                            delay: pickAt,
                                        },
                                        color: {
                                            duration: 0.12,
                                            delay: pickAt,
                                        },
                                    }}
                                >
                                    {chip}
                                </motion.span>
                            );
                        })}
                    </div>
                </motion.div>

                <div className="relative flex justify-center py-8">
                    {ask.hooks.map((hook, index) => {
                        const fan = ASK_FAN[index] ?? ASK_FAN[1];
                        const at = cardsAt + fan.lag;

                        return (
                            <motion.div
                                key={hook}
                                className={cn(
                                    'relative w-44 shrink-0 overflow-hidden rounded-[20px] border border-white shadow-xl sm:w-56',
                                    fan.className,
                                )}
                                initial={{
                                    opacity: 0,
                                    x: -160,
                                    rotate: 0,
                                    scale: 0.9,
                                }}
                                animate={
                                    play
                                        ? {
                                              opacity: 1,
                                              x: 0,
                                              rotate: fan.rotate,
                                              scale: 1,
                                          }
                                        : undefined
                                }
                                transition={{
                                    default: {
                                        duration: 0.75,
                                        ease: EASE_OUT,
                                        delay: at,
                                    },
                                    opacity: { duration: 0.12, delay: at },
                                }}
                            >
                                <img
                                    src={ASK_PHOTOS[index]}
                                    alt={hook}
                                    className="aspect-[3/4] w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/15 to-transparent" />
                                <motion.p
                                    className="absolute top-3 right-3 left-3 text-sm leading-tight font-semibold text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.45)] sm:text-base"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={
                                        play ? { opacity: 1, y: 0 } : undefined
                                    }
                                    transition={{
                                        duration: 0.4,
                                        ease: EASE_OUT,
                                        delay: at + 0.4,
                                    }}
                                >
                                    {hook}
                                </motion.p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
            <div className="flex justify-center">
                <motion.span
                    className="rounded-full bg-[#DCEBF7] px-4 py-2 text-xs font-medium text-[#111] sm:text-sm"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={play ? { opacity: 1, scale: 1 } : undefined}
                    transition={{
                        duration: 0.45,
                        ease: EASE_BACK,
                        delay: labelAt,
                    }}
                >
                    {ask.label}
                </motion.span>
            </div>
        </motion.div>
    );
}

function SlideCard({
    src,
    hook,
    tag,
    className,
}: {
    src: string;
    hook: string;
    tag?: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'relative aspect-[3/4] overflow-hidden rounded-[24px] bg-[#F3F5F7]',
                className,
            )}
        >
            <img
                src={src}
                alt={hook}
                className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/15 to-transparent" />
            <p className="absolute top-3 right-3 left-3 text-[17px] leading-tight font-semibold text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                {hook}
            </p>
            {tag && (
                <span className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#111]">
                    {tag}
                </span>
            )}
        </div>
    );
}

const viralWallPhotos = [
    [photos.s2, photos.s3, photos.s4, photos.s5, photos.s6, photos.s7],
    [photos.s8, photos.s9, photos.s10, photos.s11, photos.s12, photos.card1],
];

// Two copies of the row slide by -100% each, so the loop has no seam.
// The trailing pr-4 keeps the gap between the last and first card.
function MarqueeRow({
    items,
    photos: rowPhotos,
    reverse = false,
    seconds = 55,
}: {
    items: Example[];
    photos: string[];
    reverse?: boolean;
    seconds?: number;
}) {
    return (
        <div className="group scrollbar-hide flex overflow-hidden motion-reduce:overflow-x-auto">
            {[0, 1].map((copyIndex) => (
                <div
                    key={copyIndex}
                    aria-hidden={copyIndex === 1 || undefined}
                    className={cn(
                        'flex shrink-0 animate-[marquee_55s_linear_infinite] gap-4 pr-4 group-hover:[animation-play-state:paused] motion-reduce:animate-none',
                        copyIndex === 1 && 'motion-reduce:hidden',
                    )}
                    style={{
                        animationDuration: `${seconds}s`,
                        animationDirection: reverse ? 'reverse' : 'normal',
                    }}
                >
                    {items.map((item, index) => (
                        <SlideCard
                            key={item.hook}
                            src={rowPhotos[index % rowPhotos.length]}
                            hook={item.hook}
                            tag={item.tag}
                            className="aspect-[9/16] w-[160px] flex-none sm:w-[200px] lg:w-[220px] [&>p]:text-[14px] sm:[&>p]:text-[16px]"
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

function SectionHeading({
    segments,
    sub,
    className,
}: {
    segments: Seg[];
    sub?: string;
    className?: string;
}) {
    return (
        <div className={cn('max-w-3xl', className)}>
            <h2
                className={cn(
                    display,
                    'text-[clamp(2rem,5vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-[#111]',
                )}
            >
                <Headline segments={segments} />
            </h2>
            {sub && (
                <p className="mt-4 text-base leading-relaxed text-[#5B6470] sm:text-lg">
                    {sub}
                </p>
            )}
        </div>
    );
}

function FeatureCard({
    card,
    gradient,
    photo,
    shape,
}: {
    card: FeatureCardData;
    gradient: string;
    photo: string;
    shape: string;
}) {
    return (
        <article
            className="relative flex min-h-[420px] flex-col overflow-hidden rounded-[28px] p-4 sm:min-h-[460px]"
            style={{ background: gradient }}
        >
            <div className="relative z-10 flex items-start justify-between p-2">
                <span className="inline-block rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#111]">
                    {card.tag}
                </span>
                <RoundArrow
                    href={card.href}
                    icon={ArrowUpRight}
                    label={card.more}
                    className="bg-white text-[#111] sm:h-11 sm:w-11"
                />
            </div>
            <div className={cn('relative mt-3 flex-1 overflow-hidden', shape)}>
                <img
                    src={photo}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute right-5 bottom-5 left-5">
                    <h3
                        className={cn(
                            display,
                            'text-[28px] leading-[1.05] font-semibold tracking-[-0.02em] text-white sm:text-[32px]',
                        )}
                    >
                        {card.title}
                    </h3>
                    <a
                        href={card.href}
                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#111]"
                    >
                        {card.more}
                        <span className="h-2 w-2 rounded-full bg-[#8DB8E0]" />
                    </a>
                </div>
            </div>
        </article>
    );
}

function FaqItem({
    question,
    answer,
    isOpen,
    onToggle,
}: {
    question: string;
    answer: string;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="border-b border-[#E5E7EB]">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
            >
                <span className="text-base font-semibold text-[#111] sm:text-lg">
                    {question}
                </span>
                <span
                    className={cn(
                        'flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[#111]',
                        isOpen && 'bg-[#111] text-white',
                    )}
                >
                    {isOpen ? (
                        <X className="h-4 w-4" />
                    ) : (
                        <Plus className="h-4 w-4" />
                    )}
                </span>
            </button>
            {isOpen && (
                <p className="max-w-2xl pr-8 pb-5 text-sm leading-relaxed text-[#5B6470] sm:text-base">
                    {answer}
                </p>
            )}
        </div>
    );
}

export default function Landing({
    canRegister = true,
    locale = 'pt',
}: {
    canRegister?: boolean;
    locale?: 'pt' | 'en';
}) {
    const { auth } = usePage().props as any;
    const ctaHref = (
        auth.user ? dashboard() : canRegister ? register() : login()
    ).url;
    const c = copy[locale];
    const [menuOpen, setMenuOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const photoGallery: { src: string; tag?: string }[] = [
        { src: photos.s7, tag: c.photos.aiTag },
        { src: photos.s12 },
        { src: photos.s2 },
        { src: photos.s10 },
        { src: photos.s4, tag: c.photos.pinterestTag },
        { src: photos.s11 },
    ];

    const accountLinks: {
        label: string;
        href: ReturnType<typeof login> | string;
    }[] = [
        { label: c.footer.account.login, href: login().url },
        { label: c.footer.account.signup, href: ctaHref },
    ];

    const cardShapes = [
        'rounded-[24px_120px_24px_24px]',
        'rounded-[120px_24px_24px_24px]',
        'rounded-[24px_24px_120px_24px]',
    ];

    const cardGradients = [
        'linear-gradient(160deg, #BFD9EE 0%, #E9F8C2 100%)',
        'linear-gradient(200deg, #D4F27A 0%, #DCEBF7 70%)',
        'linear-gradient(160deg, #BFD9EE 0%, #E9F8C2 100%)',
    ];

    const cardPhotos = [photos.card1, photos.card2, photos.card3];

    return (
        <div className="min-h-screen overflow-x-clip bg-[#FAFBFC] font-landing">
            <Head title={c.meta.title}>
                <meta name="description" content={c.meta.description} />
            </Head>

            <motion.header
                className="fixed inset-x-0 top-0 z-50 px-3 pt-5 sm:px-5 sm:pt-8"
                {...rise(0.1, -20)}
            >
                <nav className="mx-auto flex max-w-[880px] items-center justify-between gap-4 rounded-full border border-white/60 bg-white/45 py-2 pr-2 pl-4 shadow-[0_8px_32px_rgba(23,52,84,0.12)] backdrop-blur-xl backdrop-saturate-150 sm:pl-5">
                    <a
                        href="/"
                        aria-label="Slidezz"
                        className="flex shrink-0 items-center gap-2"
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111] text-white">
                            <AppLogoIcon className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-bold text-[#111]">
                            Slidezz
                        </span>
                    </a>

                    <div className="hidden items-center gap-1 lg:flex">
                        {c.hero.menuItems.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="rounded-full px-4 py-2 text-sm font-medium text-[#111]/80 transition-colors hover:bg-white/60 hover:text-[#111]"
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-1">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="rounded-full bg-[#111] px-4 py-2 text-sm font-semibold text-white"
                            >
                                {c.hero.goToApp}
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#111] transition-colors hover:bg-white/60 sm:inline-flex"
                                >
                                    {c.hero.login}
                                </Link>
                                <Link
                                    href={ctaHref}
                                    className="rounded-full bg-[#111] px-4 py-2 text-sm font-semibold text-white"
                                >
                                    {c.hero.signup}
                                </Link>
                            </>
                        )}
                        <button
                            type="button"
                            aria-label={c.hero.menu}
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen((open) => !open)}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-[#111] hover:bg-white/60 lg:hidden"
                        >
                            {menuOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                </nav>

                {menuOpen && (
                    <div className="mx-auto mt-2 max-w-[880px] rounded-3xl border border-white/60 bg-white/70 p-2 shadow-[0_16px_40px_rgba(23,52,84,0.14)] backdrop-blur-xl backdrop-saturate-150 lg:hidden">
                        {c.hero.menuItems.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                onClick={() => setMenuOpen(false)}
                                className="block rounded-2xl px-4 py-3 text-[15px] font-medium text-[#111] hover:bg-white/70"
                            >
                                {item.label}
                            </a>
                        ))}
                        {!auth.user && (
                            <Link
                                href={login()}
                                className="block rounded-2xl px-4 py-3 text-[15px] font-medium text-[#111] hover:bg-white/70 sm:hidden"
                            >
                                {c.hero.login}
                            </Link>
                        )}
                    </div>
                )}
            </motion.header>

            <main>
                <LandingHero
                    copy={c.heroV2}
                    ctaHref={ctaHref}
                    bgSrc={photos.hero}
                    bgSrcSm={photos.heroSm}
                    logo={
                        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-[#1A2023] text-white">
                            <AppLogoIcon className="h-3.5 w-3.5" />
                        </span>
                    }
                />

                <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-10">
                    {/* Audience band */}
                    <section className="pt-20 pb-10 sm:pt-28 sm:pb-12">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <h2
                                className={cn(
                                    display,
                                    'max-w-3xl text-[clamp(1.8rem,4vw,3.4rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-[#111]',
                                )}
                            >
                                <Headline segments={c.audience.headline} />
                            </h2>
                            <CtaPill href="#como-funciona" className="shrink-0">
                                {c.audience.cta}
                            </CtaPill>
                        </div>
                    </section>

                    {/* How it works */}
                    <section id="como-funciona" className="pb-20 sm:pb-28">
                        <div className="grid gap-4 md:grid-cols-3">
                            {c.how.cards.map((card, index) => (
                                <FeatureCard
                                    key={card.href}
                                    card={card}
                                    gradient={cardGradients[index]}
                                    photo={cardPhotos[index]}
                                    shape={cardShapes[index]}
                                />
                            ))}
                        </div>
                    </section>

                    {/* Viral wall: two rows sliding in opposite directions */}
                    <section id="conteudo" className="py-16 sm:py-24">
                        <SectionHeading
                            segments={c.viralWall.heading}
                            sub={c.viralWall.sub}
                            className="mx-auto text-center"
                        />
                        <div className="relative -mx-5 mt-12 sm:-mx-8 lg:-mx-10">
                            <div className="flex flex-col gap-4 [mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent)]">
                                {c.viralWall.rows.map((row, index) => (
                                    <MarqueeRow
                                        key={index}
                                        items={row}
                                        photos={viralWallPhotos[index]}
                                        reverse={index === 1}
                                        seconds={index === 1 ? 60 : 55}
                                    />
                                ))}
                            </div>
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 left-0 w-[16%] [mask-image:linear-gradient(to_right,black,transparent)] backdrop-blur-[6px]"
                            />
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 right-0 w-[16%] [mask-image:linear-gradient(to_left,black,transparent)] backdrop-blur-[6px]"
                            />
                        </div>
                    </section>

                    {/* Ways to create: expanding cards that take turns */}
                    <section id="jeitos" className="py-16 sm:py-24">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <span className="inline-flex items-center gap-2 rounded-full bg-[#F3F5F7] py-1 pr-3 pl-1 text-xs font-medium tracking-wide text-[#111] uppercase">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#111] text-[11px] text-white">
                                        {c.createWays.ways.length}
                                    </span>
                                    {c.createWays.kicker}
                                </span>
                                <h2
                                    className={cn(
                                        display,
                                        'mt-5 max-w-3xl text-[clamp(2rem,5vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-[#111]',
                                    )}
                                >
                                    <Headline segments={c.createWays.heading} />
                                </h2>
                            </div>
                            <p className="max-w-sm text-base leading-relaxed text-[#5B6470] lg:pb-2">
                                {c.createWays.sub}
                            </p>
                        </div>
                        <div className="mt-10 sm:mt-12">
                            <CreateWays
                                ways={c.createWays.ways}
                                photos={[
                                    photos.s7,
                                    photos.s12,
                                    photos.s2,
                                    photos.s4,
                                    photos.s10,
                                    photos.s11,
                                ]}
                            />
                        </div>
                    </section>

                    {/* Ask, get the post */}
                    <section id="ideias" className="py-16 sm:py-24">
                        <SectionHeading
                            segments={c.ask.heading}
                            sub={c.ask.sub}
                        />
                        <MotionConfig reducedMotion="user">
                            <AskDemo ask={c.ask} />
                        </MotionConfig>
                    </section>

                    {/* Remake any viral */}
                    <section id="viral" className="py-16 sm:py-24">
                        <SectionHeading
                            segments={c.remake.heading}
                            sub={c.remake.sub}
                        />
                        <div className="mx-auto mt-10 max-w-2xl">
                            <div className="flex items-center gap-2 rounded-full bg-[#F3F5F7] p-2">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
                                    <Search className="h-4 w-4 text-[#5B6470]" />
                                </span>
                                <span className="flex-1 truncate text-sm text-[#5B6470]">
                                    {c.remake.url}
                                </span>
                                <RoundArrow
                                    href={ctaHref}
                                    icon={ArrowRight}
                                    label={c.remake.sub}
                                    className="h-10 w-10 shrink-0 bg-[#111] text-white"
                                />
                            </div>
                        </div>

                        <div className="mx-auto mt-12 grid max-w-3xl items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
                            <div>
                                <span className="mb-3 inline-block rounded-full bg-[#F3F5F7] px-3 py-1.5 text-xs font-medium text-[#111]">
                                    {c.remake.originalTag}
                                </span>
                                <SlideCard
                                    src={photos.s3}
                                    hook={c.remake.originalHook}
                                />
                            </div>
                            <RoundArrow
                                icon={ArrowRight}
                                label={c.remake.yourTag}
                                className="hidden bg-[#BFD9EE] md:inline-flex"
                            />
                            <div className="rounded-[28px] bg-[linear-gradient(160deg,#D4F27A_0%,#DCEBF7_100%)] p-1.5">
                                <div className="rounded-[22px] bg-white p-3">
                                    <span className="inline-block rounded-full bg-[#F3F5F7] px-3 py-1.5 text-xs font-medium text-[#111]">
                                        {c.remake.yourTag}
                                    </span>
                                    <SlideCard
                                        src={photos.s10}
                                        hook={c.remake.yourHook}
                                        className="mt-3"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Photos */}
                    <section
                        id="fotos"
                        className="pt-16 pb-20 sm:pt-24 sm:pb-28"
                    >
                        <SectionHeading
                            segments={c.photos.heading}
                            sub={c.photos.sub}
                        />
                        <div className="mx-auto mt-10 max-w-2xl">
                            <div className="flex items-center gap-2 rounded-full bg-[#F3F5F7] p-2">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
                                    <Search className="h-4 w-4 text-[#5B6470]" />
                                </span>
                                <span className="flex-1 text-sm text-[#5B6470]">
                                    {c.photos.search}
                                </span>
                            </div>
                        </div>

                        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-3 sm:gap-4">
                            {photoGallery.map((item) => (
                                <div
                                    key={item.src}
                                    className="relative aspect-square overflow-hidden rounded-[18px]"
                                >
                                    <img
                                        src={item.src}
                                        alt={c.photos.search}
                                        className="h-full w-full object-cover"
                                    />
                                    {item.tag && (
                                        <span className="absolute bottom-2 left-2 rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-[#111] sm:text-xs">
                                            {item.tag}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Editor + Brand */}
                    <section className="py-16 sm:py-24">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="rounded-[28px] border border-[#E5E7EB] p-6 sm:p-8">
                                <h3
                                    className={cn(
                                        display,
                                        'text-[clamp(1.6rem,3vw,2.5rem)] leading-tight font-semibold tracking-[-0.02em] text-[#111]',
                                    )}
                                >
                                    <Headline
                                        segments={c.editor.cardAHeading}
                                    />
                                </h3>
                                <p className="mt-3 text-[#5B6470]">
                                    {c.editor.cardASub}
                                </p>
                                <div className="mt-6">
                                    <SlideCard
                                        src={photos.s5}
                                        hook={c.editor.cardAText}
                                        className="mx-auto w-full max-w-[280px]"
                                    />
                                </div>
                                <div className="mt-6 flex flex-wrap gap-2">
                                    {c.editor.cardAChecks.map((item) => (
                                        <span
                                            key={item}
                                            className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#111]"
                                        >
                                            <Check className="h-3.5 w-3.5 text-[#111]" />
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-[28px] bg-[#F3F5F7] p-6 sm:p-8">
                                <h3
                                    className={cn(
                                        display,
                                        'text-[clamp(1.6rem,3vw,2.5rem)] leading-tight font-semibold tracking-[-0.02em] text-[#111]',
                                    )}
                                >
                                    <Headline
                                        segments={c.editor.cardBHeading}
                                    />
                                </h3>
                                <p className="mt-3 text-[#5B6470]">
                                    {c.editor.cardBSub}
                                </p>

                                <div className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.06)]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111] text-sm font-bold text-white">
                                                {c.editor.brandName[0]}
                                            </span>
                                            <span className="font-semibold text-[#111]">
                                                {c.editor.brandName}
                                            </span>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className="h-5 w-5 rounded-full"
                                                    style={{
                                                        background: '#111111',
                                                    }}
                                                />
                                                <span className="text-xs text-[#5B6470]">
                                                    {c.editor.colorLabel}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className="h-5 w-5 rounded-full"
                                                    style={{
                                                        background: '#D4F27A',
                                                    }}
                                                />
                                                <span className="text-xs text-[#5B6470]">
                                                    {c.editor.accentLabel}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 aspect-[4/5] max-w-[200px] rounded-[20px] bg-[#111111] p-4 text-white">
                                        <div className="h-2 w-8 rounded-full bg-[#D4F27A]" />
                                        <p className="mt-3 text-sm font-semibold">
                                            {c.editor.brandName}
                                        </p>
                                        <p className="mt-1 text-[11px] leading-snug text-white/70">
                                            {c.editor.cardBSub}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Formats */}
                    <section id="formatos" className="py-16 sm:py-24">
                        <SectionHeading segments={c.formats.heading} />
                        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {c.formats.formats.map((format) => (
                                <div
                                    key={format.title}
                                    className="rounded-[28px] border border-[#E5E7EB] p-6"
                                >
                                    <div className="flex h-28 items-center justify-center rounded-[20px] bg-[#F3F5F7]">
                                        {format.shape === 'feed' && (
                                            <div className="h-20 w-16 rounded border-2 border-[#111]" />
                                        )}
                                        {format.shape === 'vertical' && (
                                            <div className="h-20 w-10 rounded border-2 border-[#111]" />
                                        )}
                                        {format.shape === 'pdf' && (
                                            <div className="h-20 w-16 rounded border-2 border-dashed border-[#111]" />
                                        )}
                                        {format.shape === 'mp4' && (
                                            <div className="flex h-16 w-24 items-center justify-center rounded border-2 border-[#111]">
                                                <Play className="h-4 w-4 fill-[#111] text-[#111]" />
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold text-[#111]">
                                        {format.title}
                                    </h3>
                                    <p className="mt-1 text-sm text-[#5B6470]">
                                        {format.networks}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <p className="mt-6 text-sm text-[#5B6470]">
                            {c.formats.note}
                        </p>
                    </section>

                    {/* Claude MCP */}
                    <section className="py-6 sm:py-8">
                        <div className="rounded-[28px] bg-[#111] px-6 py-12 text-white sm:px-14 sm:py-16">
                            <h2
                                className={cn(
                                    display,
                                    'text-[clamp(2rem,5vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.03em]',
                                )}
                            >
                                <Headline
                                    segments={c.claude.heading}
                                    tone="light"
                                />
                            </h2>
                            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
                                {c.claude.sub}
                            </p>
                            <code className="mt-8 inline-block rounded-2xl bg-[#1d1d1d] px-5 py-4 font-mono text-sm text-lime-300 sm:text-base">
                                {c.claude.command}
                            </code>
                        </div>
                    </section>

                    {/* Everything included */}
                    <section className="py-16 sm:py-24">
                        <SectionHeading segments={c.included.heading} />
                        <ul className="mt-10 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                            {c.included.items.map((item) => (
                                <li
                                    key={item}
                                    className="flex items-start gap-3"
                                >
                                    <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#D4F27A]">
                                        <Check className="h-3.5 w-3.5 text-[#111]" />
                                    </span>
                                    <span className="text-sm text-[#111] sm:text-base">
                                        {item}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Pricing */}
                    <section
                        id="precos"
                        className="pt-20 pb-16 sm:pt-32 sm:pb-24"
                    >
                        <SectionHeading segments={c.pricing.heading} />
                        <div className="mt-12">
                            <PricingCards
                                plans={c.pricing.plans}
                                featuresTitle={c.pricing.featuresTitle}
                                highlightBadge={c.pricing.highlightBadge}
                                saveLabel={c.pricing.saveLabel}
                                href={ctaHref}
                                note={c.pricing.note}
                            />
                        </div>
                        <p className="mt-6 text-sm text-[#5B6470]">
                            {c.pricing.footnote}
                        </p>
                    </section>

                    {/* FAQ */}
                    <section id="faq" className="py-16 sm:py-24">
                        <SectionHeading
                            segments={c.faq.heading}
                            className="mx-auto text-center"
                        />
                        <div className="mx-auto mt-10 max-w-3xl">
                            {c.faq.items.map((item, index) => (
                                <FaqItem
                                    key={item.question}
                                    question={item.question}
                                    answer={item.answer}
                                    isOpen={openFaq === index}
                                    onToggle={() =>
                                        setOpenFaq(
                                            openFaq === index ? null : index,
                                        )
                                    }
                                />
                            ))}
                        </div>
                    </section>

                    {/* Final CTA */}
                    <section className="pt-6 pb-24 sm:pt-8 sm:pb-32">
                        <div className="rounded-[28px] bg-[linear-gradient(200deg,#D4F27A_0%,#DCEBF7_70%)] px-6 py-16 text-center sm:px-12 sm:py-24">
                            <h2
                                className={cn(
                                    display,
                                    'text-[clamp(2rem,5vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-[#111]',
                                )}
                            >
                                <Headline segments={c.final.heading} />
                            </h2>
                            <CtaPill
                                href={ctaHref}
                                variant="solid"
                                className="mt-8"
                            >
                                {c.final.cta}
                            </CtaPill>
                        </div>
                    </section>
                </div>
            </main>

            <footer className="mx-auto max-w-[1320px] px-5 pb-10 sm:px-8 lg:px-10">
                <div className="grid gap-8 border-t border-[#E5E7EB] pt-14 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111] text-white">
                                <AppLogoIcon className="h-5 w-5" />
                            </span>
                            <span className="text-lg font-bold text-[#111]">
                                Slidezz
                            </span>
                        </div>
                        <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#5B6470]">
                            {c.footer.tagline}
                        </p>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-[#111]">
                            {c.footer.product.title}
                        </h4>
                        <ul className="mt-3 space-y-2">
                            {c.footer.product.links.map((link) => (
                                <li key={link.href}>
                                    <a
                                        href={link.href}
                                        className="text-sm text-[#5B6470] hover:text-[#111]"
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-[#111]">
                            {c.footer.account.title}
                        </h4>
                        <ul className="mt-3 space-y-2">
                            {accountLinks.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-[#5B6470] hover:text-[#111]"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-[#111]">
                            {c.footer.legal.title}
                        </h4>
                        <ul className="mt-3 space-y-2">
                            {c.footer.legal.links.map((link) => (
                                <li key={link.href}>
                                    <a
                                        href={link.href}
                                        className="text-sm text-[#5B6470] hover:text-[#111]"
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="mt-8 border-t border-[#E5E7EB] pt-6 text-sm text-[#5B6470]">
                    {c.footer.copyright}
                </div>
            </footer>
        </div>
    );
}
