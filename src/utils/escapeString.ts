/**
 * Escapa caracteres especiais em strings
 * Especificamente: aspas duplas (")
 * @param {string} str - String a escapar
 * @returns {string|any} String com caracteres escapados, ou valor original se nao for string
 * @example
 * escapeString('Olá "mundo"') // Retorna: Olá \"mundo\"
 * escapeString(123) // Retorna: 123
 */
export function escapeString(str: any) {
    if (typeof str !== "string") return str;

    return str.replace(/"/g, '\\"');
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/