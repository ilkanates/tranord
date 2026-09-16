import { useEffect } from 'react';

/**
 * ESC İLE KAPAT — açık bir pencere/menü için.
 *
 * `acik` false iken dinleyici hiç kurulmuyor: on tane kapalı pencere
 * on tane boş dinleyici bırakmasın.
 *
 * KAPTURE AŞAMASINDA değil normal aşamada dinliyor — böylece bir metin
 * kutusu ya da iç içe bir pencere kendi Esc'ini önce işleyip
 * `stopPropagation` diyebiliyor.
 *
 * @param {boolean} acik      pencere açık mı
 * @param {() => void} kapat  kapatma işlevi
 */
export function useEsc(acik, kapat) {
  useEffect(() => {
    if (!acik || typeof kapat !== 'function') return undefined;
    const on = (e) => { if (e.key === 'Escape') kapat(); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [acik, kapat]);
}

export default useEsc;
