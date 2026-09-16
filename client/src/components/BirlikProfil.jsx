/**
 * BİRLİK PROFİLİ VE İSTATİSTİKLERİ.
 *
 * Travian'ın ittifak profilinin karşılığı: sancağın altındaki tanıtım
 * metni ("kimleri alıyoruz, ne bekliyoruz") ve birliğin toplam gücü.
 *
 * İSTATİSTİKLER AYRI BİR OLAYLA İSTENİYOR, pakette taşınmıyor: nüfus ve
 * savaş puanları ÇEVRİMDIŞI üyeleri de kapsadığı için sunucu tarafında
 * veritabanına gidiyor. Her yayına koysaydık saniyede birkaç kez bütün
 * köy tablosu okunurdu. Çevrimdışı üyelerin sayılması şart: birliğin
 * gücü kimin o an bağlı olduğuna göre değişmemeli.
 *
 * AÇIKLAMAYI Konung ve Jarl yazabiliyor. Geri alınabilir bir metin;
 * Konung'a kilitlemek birliğin tanıtımını tek kişinin çevrimiçi
 * olmasına bağlardı.
 */
import { useState } from 'react';
import { C, FONT, btn, label as lbl, num } from '../theme';
import Icon from './Icons';

const ACIKLAMA_EN_COK = 600;

const kutu = (ek = {}) => ({
  padding: '9px 11px', borderRadius: 5,
  background: 'rgba(8,17,28,0.55)', border: `1px solid ${C.lineSoft}`,
  ...ek,
});

/** Tek ölçü kutusu — sayı üstte, ne olduğu altta */
function Olcu({ ad, deger, ikon, renk = C.frost }) {
  return (
    <div style={kutu({
      flex: '1 1 78px', minWidth: 78, textAlign: 'center', padding: '7px 5px',
    })}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
        <Icon name={ikon} size={11} color={C.textMute} />
      </div>
      <div style={num({ fontSize: 14, color: renk })}>{deger}</div>
      <div style={{ fontFamily: FONT.ui, fontSize: 7.5, color: C.textFaint,
        letterSpacing: 0.6, marginTop: 1 }}>{ad}</div>
    </div>
  );
}

export default function BirlikProfil({
  socket, birlik = null, istatistik = null, yazabilir = false,
}) {
  const [duzenle, setDuzenle] = useState(false);
  const [taslak, setTaslak] = useState('');

  const aciklama = birlik?.aciklama || '';
  /*
    Düzenlemeye girerken kutuya mevcut metin konuyor (boş kutu, "silmek
    üzeresin" hissi verirdi). Efektle değil DÜĞMEDE: kopyalamanın tek
    tetikleyicisi bu tıklama.
  */
  const duzenlemeyiAc = () => { setTaslak(aciklama); setDuzenle(true); };

  const t = istatistik?.toplam || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {/* ── Birliğin gücü ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <span style={lbl({ fontSize: 8 })}>Birliğin gücü</span>
          {t?.sira != null && (
            <span style={{
              fontFamily: FONT.ui, fontSize: 8.5, color: '#d6f5c2',
              padding: '1px 7px', borderRadius: 8,
              background: 'rgba(127,224,77,0.12)', border: '1px solid rgba(127,224,77,0.35)',
            }}>
              {istatistik.birlikSayisi} birlik içinde {t.sira}. sıra
            </span>
          )}
          <button type="button" onClick={() => socket?.emit('birlik_istatistik')}
            style={btn('ghost', { marginLeft: 'auto', fontSize: 8.5, padding: '2px 9px' })}>
            YENİLE
          </button>
        </div>
        {!t ? (
          <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>
            Yükleniyor…
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <Olcu ad="ÜYE" deger={t.uyeSayisi} ikon="nufus" />
            <Olcu ad="KÖY" deger={t.koySayisi} ikon="koy" />
            <Olcu ad="NÜFUS" deger={t.nufus} ikon="ev" />
            <Olcu ad="SALDIRI" deger={t.saldiri} ikon="kilic" renk="#ffb8bd" />
            <Olcu ad="SAVUNMA" deger={t.savunma} ikon="kalkan" renk="#a8dcff" />
          </div>
        )}
        {/*
          SALDIRI VE SAVUNMA = ÖLDÜRÜLEN ASKER, mevcut ordu değil.
          Sıralamada da öyle: kimin kaç askeri olduğu bedava
          öğrenilmiyor, öğrenmenin yolu izci göndermek.
        */}
        <div style={{
          fontFamily: FONT.ui, fontSize: 8, color: C.textFaint,
          marginTop: 4, lineHeight: 1.5,
        }}>
          Saldırı ve savunma, üyelerin şimdiye kadar ÖLDÜRDÜĞÜ asker sayısıdır —
          mevcut ordu değil. Kimin kaç askeri olduğu ancak keşifle öğrenilir.
        </div>
      </div>

      {/* ── Açıklama ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <span style={lbl({ fontSize: 8 })}>Birlik açıklaması</span>
          {yazabilir && !duzenle && (
            <button type="button" onClick={duzenlemeyiAc}
              style={btn('ghost', { marginLeft: 'auto', fontSize: 8.5, padding: '2px 9px' })}>
              DÜZENLE
            </button>
          )}
        </div>

        {duzenle ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea value={taslak} maxLength={ACIKLAMA_EN_COK} rows={6}
              onChange={(e) => setTaslak(e.target.value)}
              placeholder="Birliğini tanıt: kimleri alıyorsunuz, ne bekliyorsunuz…"
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'vertical',
                padding: '8px 10px', borderRadius: 5, lineHeight: 1.6,
                background: 'rgba(4,9,15,0.75)', border: `1px solid ${C.lineSoft}`,
                color: C.frost, fontFamily: FONT.ui, fontSize: 10.5, outline: 'none',
              }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={num({
                fontSize: 8.5,
                color: taslak.length > ACIKLAMA_EN_COK - 60 ? C.warn : C.textFaint,
              })}>{taslak.length}/{ACIKLAMA_EN_COK}</span>
              <button type="button" style={btn('ghost',
                { marginLeft: 'auto', fontSize: 9, padding: '4px 11px' })}
                onClick={() => setDuzenle(false)}>VAZGEÇ</button>
              <button type="button" style={btn('primary', { fontSize: 9, padding: '4px 13px' })}
                onClick={() => { socket?.emit('birlik_profil', { aciklama: taslak });
                  setDuzenle(false); }}>KAYDET</button>
            </div>
          </div>
        ) : (
          <div style={kutu({
            fontFamily: FONT.ui, fontSize: 10.5, lineHeight: 1.65,
            color: aciklama ? C.textDim : C.textMute,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            minHeight: 44,
          })}>
            {aciklama || (yazabilir
              ? 'Henüz açıklama yok. DÜZENLE ile birliğini tanıt.'
              : 'Birliğin henüz bir açıklaması yok.')}
          </div>
        )}
      </div>
    </div>
  );
}
