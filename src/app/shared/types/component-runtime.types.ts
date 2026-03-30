export type TDynamicValue<TValue> = TValue | (() => TValue);

export type TDynamicStringValue = TDynamicValue<string>;
export type TDynamicBooleanValue = TDynamicValue<boolean>;
export type TDynamicNumberValue = TDynamicValue<number>;
export type TDynamicStringLikeValue = TDynamicValue<string | number>;

export type TLocalizedText = Readonly<Record<string, string>>;
