import { useEffect } from 'react';

/**
 * On a phone an admin table is shown as a stack of cards, one per row,
 * each cell under its column's name (admin.css, "Tables on a phone"). The
 * name comes from the cell's `data-label`, which this copies from the
 * table's own header — so no table has to spell its labels out twice, and
 * a table added later is covered without touching it.
 *
 * Watches the given container, since the rows arrive after the page does
 * and change with every filter and page turn.
 */
function label(root) {
    root.querySelectorAll('table.ad-table').forEach(table => {
        const heads = [...table.querySelectorAll('thead th')].map(th =>
            (th.textContent || '').trim() || th.getAttribute('aria-label') || '');
        table.querySelectorAll('tbody tr, tfoot tr').forEach(tr => {
            let col = 0;
            [...tr.children].forEach(td => {
                const text = heads[col] || '';
                if (td.getAttribute('data-label') !== text) td.setAttribute('data-label', text);
                col += td.colSpan || 1;
            });
        });
    });
}

export default function useTableLabels(ref) {
    useEffect(() => {
        const root = ref.current;
        if (!root) return undefined;

        label(root);
        // One pass per batch of changes. Only rows and cells are watched,
        // so the labels this writes do not set it off again.
        const observer = new MutationObserver(() => label(root));
        observer.observe(root, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, [ref]);
}
