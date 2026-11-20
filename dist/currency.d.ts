export interface Currency {
    /** The purse key it lives under (`gold`). */
    id: string;
    /** What it is called where it is written (default: `id`). */
    label?: string;
    /** Before the amount (`€12`, `$12`) or after (`12 gold`, default). */
    position?: 'prefix' | 'suffix';
    /** A space between: default none before, one after. */
    space?: boolean;
    /** Decimal places (default: as many as the amount has, up to 2). */
    decimals?: number;
}
/** `amount` written in `currency` (or a bare purse key). */
export declare function formatMoney(amount: number, currency: Currency | string): string;
/** The currency for purse key `id` among `currencies`, else a plain one named after it. */
export declare function currencyFor(currencies: Currency[] | undefined, id: string): Currency;
//# sourceMappingURL=currency.d.ts.map