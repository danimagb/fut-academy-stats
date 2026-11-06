import { t } from '@/shared/i18n/i18n';
import { toast } from '@/shared/ui/toast';

/** Says why a change was refused on a read-only (coach) screen. */
export const refuseReadOnly = (): void => toast(t('readOnlyToast'));
export const readOnlyPill = (): string => `<span class="badge ro">${t('readOnly')}</span>`;
