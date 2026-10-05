/** Números de prueba del simulador: +54 9 0000 XXXXXX no es un celular argentino válido, así que nunca choca con uno real. */
export const SIMULATOR_PHONE = /^\+5490000\d{6}$/;

/** utmSource de los pacientes creados por el simulador (se excluyen de Marketing). */
export const SIMULATOR_UTM_SOURCE = "simulador";
