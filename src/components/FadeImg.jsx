import { useRef, useEffect } from 'react';

/**
 * An <img> that fades in once its pixels are actually there.
 *
 * Uploaded covers and hero photos arrive well after first paint, so without
 * this they appear as an abrupt pop over a finished layout.
 *
 * The class is toggled on the node rather than held in state: a cached image
 * can finish loading before React attaches onLoad, and the mount check below
 * covers that case. `onError` reveals it too — a broken image should show its
 * alt text, not sit invisible at opacity 0.
 */
export default function FadeImg({ className = '', ...props }) {
    const ref = useRef(null);

    const reveal = el => el?.classList.add('img-fade--in');

    useEffect(() => {
        if (ref.current?.complete) reveal(ref.current);
    }, []);

    return (
        <img
            {...props}
            ref={ref}
            onLoad={e => reveal(e.currentTarget)}
            onError={e => reveal(e.currentTarget)}
            className={`${className} img-fade`.trim()}
        />
    );
}
