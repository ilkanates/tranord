/**
 * SUNUCU LINT — tek derdi var: İTHAL EDİLMEMİŞ AD.
 *
 * `node --check` bunu yakalamaz; tanımsız bir ad sözdizimi hatası değil,
 * çalışma zamanı hatasıdır. Dosya "geçerli" görünür, sunucu açılır, hata
 * ancak o satır çalıştığında patlar.
 *
 * index.js bölünürken tam olarak bu oldu: `settlerCapacity` game/koyKurallari.js'e
 * taşınırken kullandığı ARMY ithali unutuldu. Belirti sessizdi — komut kalkanı
 * çökmeyi tutuyordu, sunucu ayakta kalıyordu, ama hiçbir oyuncu köy paketini
 * alamıyordu. Canlıda "bağlanıyor ama ekran boş" olarak görünürdü.
 *
 * Stil kurallarını KASTEN açmıyoruz: bu kod tabanının kendi bir üslubu var
 * (uzun açıklama blokları, hizalanmış require'lar) ve lint'i onunla kavga
 * ettirmenin faydası yok. Tek soru: "bu ad nereden geliyor?"
 *
 *   npm run lint
 */
const globals = require('globals');

module.exports = [
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      'no-undef': 'error',
      // Tanımlanıp hiç kullanılmayan ithal = taşıma artığı; uyarı olarak dursun
      'no-unused-vars': ['warn', {
        args: 'none',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
    },
  },
];
