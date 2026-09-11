import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BURASI = path.dirname(fileURLToPath(import.meta.url))
const DEV_DIZINI = path.join(BURASI, 'dev')

/**
 * GELİŞTİRME SAYFALARI — yalnız `vite dev` sırasında servis edilir.
 *
 * Bu sayfalar önceden `public/` altındaydı. Vite `public/` içeriğini olduğu
 * gibi `dist/`e kopyalar, yani hepsi ÜRETİME çıkıyordu: canlı sunucuda
 * /dev-login.html, /koy-sekil.html, /sur-onizleme.html … hepsi açıktı.
 *
 * dev-login.html'de bu ciddi bir açıktı: sayfa sunucu adresini `?server=`
 * sorgu parametresinden alıyor ve e-posta + şifreyi oraya POST ediyor.
 * Yani oyunun KENDİ alan adındaki bir bağlantı —
 *     https://<alan-adi>/dev-login.html?server=https://kotu-site
 * — kurbanın şifresini saldırgana yazdırabiliyordu. Tailscale bunu
 * engellemiyor; sayfa oyuncunun güvendiği origin'de duruyor.
 *
 * `apply: 'serve'` bu eklentiyi derlemeden tamamen çıkarır: dosyalar depoda
 * durur, yerel geliştirmede açılır, `dist/`e ASLA girmez.
 */
function devSayfalari() {
  return {
    name: 'tranord-dev-sayfalari',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const istenen = (req.url || '').split('?')[0].replace(/^\//, '')
        // Yalnız düz .html adları — dizin gezinmesine (../) kapalı
        if (!/^[\w-]+\.html$/.test(istenen)) return next()
        const dosya = path.join(DEV_DIZINI, istenen)
        if (!dosya.startsWith(DEV_DIZINI) || !fs.existsSync(dosya)) return next()
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(fs.readFileSync(dosya))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devSayfalari()],
})
