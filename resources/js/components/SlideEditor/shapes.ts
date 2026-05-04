export interface ShapeDef {
    id: string;
    data: string;
    dataW: number;
    dataH: number;
    initW: number;
    initH: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
    dashEnabled?: boolean;
    // button preview mode: 'fill' | 'stroke'
    preview: 'fill' | 'stroke';
}

export const SHAPE_CATEGORIES: { labelKey: string; shapes: ShapeDef[] }[] = [
    {
        labelKey: 'slideEditor.shapes.basic',
        shapes: [
            { id: 'triangle',  data: 'M 50 0 L 100 100 L 0 100 Z', dataW: 100, dataH: 100, initW: 200, initH: 200, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'diamond',   data: 'M 50 0 L 100 50 L 50 100 L 0 50 Z', dataW: 100, dataH: 100, initW: 160, initH: 160, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'pentagon',  data: 'M 50 0 L 100 38 L 81 100 L 19 100 L 0 38 Z', dataW: 100, dataH: 100, initW: 180, initH: 180, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'hexagon',   data: 'M 50 0 L 100 25 L 100 75 L 50 100 L 0 75 L 0 25 Z', dataW: 100, dataH: 100, initW: 200, initH: 200, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
        ],
    },
    {
        labelKey: 'slideEditor.shapes.lines',
        shapes: [
            { id: 'line',         data: 'M 0 0 L 100 0', dataW: 100, dataH: 1, initW: 400, initH: 8, fill: 'none', stroke: '#1a1a1a', strokeWidth: 8, dashEnabled: false, preview: 'stroke' },
            { id: 'line_dotted',  data: 'M 0 0 L 100 0', dataW: 100, dataH: 1, initW: 400, initH: 8, fill: 'none', stroke: '#1a1a1a', strokeWidth: 8, dashEnabled: true,  preview: 'stroke' },
            { id: 'line_dashed',  data: 'M 0 0 L 100 0', dataW: 100, dataH: 1, initW: 400, initH: 8, fill: 'none', stroke: '#1a1a1a', strokeWidth: 8, dashEnabled: true,  preview: 'stroke' },
        ],
    },
    {
        labelKey: 'slideEditor.shapes.arrows',
        shapes: [
            { id: 'arrow_r',   data: 'M 0 30 L 55 30 L 55 0 L 100 50 L 55 100 L 55 70 L 0 70 Z', dataW: 100, dataH: 100, initW: 200, initH: 160, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'arrow_l',   data: 'M 100 30 L 45 30 L 45 0 L 0 50 L 45 100 L 45 70 L 100 70 Z', dataW: 100, dataH: 100, initW: 200, initH: 160, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'arrow_u',   data: 'M 30 100 L 30 45 L 0 45 L 50 0 L 100 45 L 70 45 L 70 100 Z', dataW: 100, dataH: 100, initW: 160, initH: 200, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'arrow_d',   data: 'M 30 0 L 30 55 L 0 55 L 50 100 L 100 55 L 70 55 L 70 0 Z', dataW: 100, dataH: 100, initW: 160, initH: 200, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'arrow_lr',  data: 'M 0 50 L 30 0 L 30 25 L 70 25 L 70 0 L 100 50 L 70 100 L 70 75 L 30 75 L 30 100 Z', dataW: 100, dataH: 100, initW: 240, initH: 160, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'arrow_ret', data: 'M 5 60 C 5 20 95 20 90 60 L 78 46 M 90 60 L 100 44', dataW: 100, dataH: 72, initW: 200, initH: 120, fill: 'none', stroke: '#1a1a1a', strokeWidth: 8, preview: 'stroke' },
        ],
    },
    {
        labelKey: 'slideEditor.shapes.decorative',
        shapes: [
            { id: 'star',      data: 'M 50 0 L 61 35 L 98 35 L 68 57 L 79 91 L 50 70 L 21 91 L 32 57 L 2 35 L 39 35 Z', dataW: 100, dataH: 91, initW: 200, initH: 182, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'heart',     data: 'M 50 85 C 22 68 0 50 0 28 C 0 12 12 0 27 0 C 39 0 47 9 50 18 C 53 9 61 0 73 0 C 88 0 100 12 100 28 C 100 50 78 68 50 85 Z', dataW: 100, dataH: 85, initW: 200, initH: 170, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'lightning', data: 'M 58 0 L 15 55 L 45 55 L 42 100 L 85 45 L 55 45 Z', dataW: 100, dataH: 100, initW: 140, initH: 200, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'shield',    data: 'M 50 0 L 100 20 L 100 55 C 100 78 75 95 50 100 C 25 95 0 78 0 55 L 0 20 Z', dataW: 100, dataH: 100, initW: 180, initH: 200, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'plus',      data: 'M 35 0 L 65 0 L 65 35 L 100 35 L 100 65 L 65 65 L 65 100 L 35 100 L 35 65 L 0 65 L 0 35 L 35 35 Z', dataW: 100, dataH: 100, initW: 160, initH: 160, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'cloud',     data: 'M 20 72 C 8 72 0 62 0 52 C 0 40 10 34 22 36 C 24 22 35 14 50 14 C 63 14 73 22 76 34 C 82 28 92 30 97 38 C 104 48 100 64 89 68 C 83 71 74 72 65 72 Z', dataW: 104, dataH: 72, initW: 240, initH: 160, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'drop',      data: 'M 50 0 C 30 20 0 50 0 68 C 0 85 23 100 50 100 C 77 100 100 85 100 68 C 100 50 70 20 50 0 Z', dataW: 100, dataH: 100, initW: 140, initH: 200, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'check',     data: 'M 0 52 L 35 88 L 100 8', dataW: 100, dataH: 88, initW: 200, initH: 160, fill: 'none', stroke: '#1a1a1a', strokeWidth: 12, preview: 'stroke' },
        ],
    },
    {
        labelKey: 'slideEditor.shapes.balloons',
        shapes: [
            { id: 'speech',  data: 'M 10 0 Q 0 0 0 10 L 0 62 Q 0 72 10 72 L 25 72 L 10 100 L 40 72 L 90 72 Q 100 72 100 62 L 100 10 Q 100 0 90 0 Z', dataW: 100, dataH: 100, initW: 240, initH: 200, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
            { id: 'message', data: 'M 10 0 Q 0 0 0 10 L 0 62 Q 0 72 10 72 L 43 72 L 50 94 L 57 72 L 90 72 Q 100 72 100 62 L 100 10 Q 100 0 90 0 Z', dataW: 100, dataH: 94, initW: 240, initH: 200, fill: '#4B5563', stroke: 'none', strokeWidth: 0, preview: 'fill' },
        ],
    },
];
