type Prop = Record<string, unknown>;
export declare function volcanoSchema(extra?: Prop): Prop;
export declare function impactCraterSchema(extra?: Prop): Prop;
export declare function padSchema(extra?: Prop): Prop;
export declare function gulleySchema(extra?: Prop): Prop;
export declare function coverSchema(extra?: Prop): Prop;
/** Every authored landform's options, keyed by the factory's name. */
export declare const landformSchemas: {
    volcano: typeof volcanoSchema;
    impactCrater: typeof impactCraterSchema;
    pad: typeof padSchema;
    gulley: typeof gulleySchema;
    cover: typeof coverSchema;
};
/**
 * Fill in an option the schema marks `x-derived` from its source, the way the
 * factory would. Handy for showing the number a derived field will take.
 */
export declare function landformDerived(schema: Prop, key: string, options: Record<string, number>): number | undefined;
export {};
//# sourceMappingURL=landform-schemas.d.ts.map