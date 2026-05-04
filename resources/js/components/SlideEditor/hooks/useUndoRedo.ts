import { useState, useRef, useCallback } from 'react';
import { Slide } from '../types';

export function useUndoRedo(initialSlides: Slide[]) {
    const [slides, _setSlides] = useState<Slide[]>(initialSlides);
    const [past, setPast] = useState<Slide[][]>([]);
    const [future, setFuture] = useState<Slide[][]>([]);
    const historyTimer = useRef<NodeJS.Timeout | null>(null);

    const setSlides = useCallback((action: React.SetStateAction<Slide[]>) => {
        _setSlides((prev) => {
            const next = typeof action === 'function' ? (action as (prevState: Slide[]) => Slide[])(prev) : action;
            if (prev !== next) {
                if (!historyTimer.current) {
                    setPast((p) => [...p, prev].slice(-50));
                    setFuture([]);
                } else {
                    clearTimeout(historyTimer.current);
                }
                historyTimer.current = setTimeout(() => {
                    historyTimer.current = null;
                }, 500);
            }
            return next;
        });
    }, []);

    const undo = useCallback(() => {
        setPast((p) => {
            if (p.length === 0) return p;
            const newPast = [...p];
            const prev = newPast.pop()!;
            _setSlides((current) => {
                setFuture((f) => [current, ...f]);
                return prev;
            });
            if (historyTimer.current) {
                clearTimeout(historyTimer.current);
                historyTimer.current = null;
            }
            return newPast;
        });
    }, []);

    const redo = useCallback(() => {
        setFuture((f) => {
            if (f.length === 0) return f;
            const newFuture = [...f];
            const next = newFuture.shift()!;
            _setSlides((current) => {
                setPast((p) => [...p, current]);
                return next;
            });
            if (historyTimer.current) {
                clearTimeout(historyTimer.current);
                historyTimer.current = null;
            }
            return newFuture;
        });
    }, []);

    return {
        slides,
        setSlides,
        past,
        future,
        undo,
        redo,
    };
}
