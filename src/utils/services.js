import { faHandsPraying, faChurch, faDove, faFileLines, faCross } from '@fortawesome/free-solid-svg-icons';

/**
 * The five things a parish takes requests for.
 *
 * One definition, used by the devotee's Book Services picker and by the cards
 * on a parish landing page, so the wording and the pictures never drift apart.
 * Each `slot` is a CMS content slot a parish can publish a photo to.
 */
export const SERVICES = [
    {
        id: 'blessing',
        label: 'Blessing',
        blurb: 'A house, a vehicle, a business — a priest comes and blesses it.',
        slot: 'book-blessing',
        icon: faHandsPraying,
    },
    {
        id: 'intention',
        label: 'Mass Intention',
        blurb: 'Have a Mass offered for someone living or departed.',
        slot: 'book-intention',
        icon: faChurch,
    },
    {
        id: 'occasional',
        label: 'Occasional Mass',
        blurb: 'A funeral, wake, office or school Mass — reserve it with the parish.',
        slot: 'book-occasional',
        icon: faCross,
    },
    {
        id: 'sacrament',
        label: 'Sacrament',
        blurb: 'Baptism, confirmation, wedding — book the celebration.',
        slot: 'book-sacrament',
        icon: faDove,
    },
    {
        id: 'document',
        label: 'Document Request',
        blurb: 'Certificates of baptism, confirmation, marriage and more.',
        slot: 'book-document',
        icon: faFileLines,
    },
];

export const serviceById = id => SERVICES.find(s => s.id === id);
