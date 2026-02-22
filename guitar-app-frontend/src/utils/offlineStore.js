// src/utils/offlineStore.js
export const saveToCache = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('No se pudo guardar en caché', e);
    }
};

export const getFromCache = (key) => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error al leer caché', e);
        return null;
    }
};
