// French typography of Romandy for the landing copy: thin no-break space
// before ? ! ; and inside « », no-break space before : and after a number.

const THIN = " ";
const NBSP = " ";

export function typo(text: string): string {
  return text
    .replace(/ ([?!;»])/g, `${THIN}$1`)
    .replace(/« /g, `«${THIN}`)
    .replace(/ :/g, `${NBSP}:`)
    .replace(/(\d) (?=\S)/g, `$1${NBSP}`)
    .replace(/\bCHF /g, `CHF${NBSP}`);
}

/** Tagged template: fr`On mange quoi ce soir ?` */
export function fr(strings: TemplateStringsArray, ...values: unknown[]): string {
  return typo(String.raw({ raw: strings }, ...values));
}
