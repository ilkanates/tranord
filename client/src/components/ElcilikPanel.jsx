/**
 * ELÇİLİK — birlik kurma ve yönetme ekranı.
 *
 * İlkan'ın tarifi: *"elçilik kuran kişiler birlik oluşturabilir, birliğin
 * adını ve amblemini seçer, sonra birliğe oyuncu davet eder. elçilikten
 * davetler kısmına girip oyuncu adı aratıp daveti yollar. karşı taraf
 * kabul ederse birliğe katılır... kurucu birliğe adam alabilir
 * çıkartabilir, 2 yetkili alt yönetici seçilebilir."*
 *
 * ÜÇ HÂL, TEK EKRAN:
 *   1. Birlikte değilim  → kur formu + bana gelen davetler
 *   2. Birliktesin, Karl → üye listesi + ayrıl
 *   3. Yöneticiyim       → üstüne davet kutusu, atma, Jarl seçme
 *
 * YETKİLER SUNUCUDAN GELİYOR (`birlik.yetkilerim`), burada yeniden
 * hesaplanmıyor. Kural iki yerde yaşarsa ayrışır — bu projede asker
 * yemi muhasebesi tam olarak öyle ayrışmıştı ve ekran doğru sayıyı
 * gösterirken ambar yanlış düşüyordu.
 */
import { useState } from 'react';
import { C, FONT, btn, label as lbl, num } from '../theme';
import Icon from './Icons';

/** Rütbe rengi — Konung altın, Jarl buz mavisi, Karl sade */
const RUTBE_RENK = { konung: '#f0c860', jarl: '#8fdcff', karl: C.textDim };

const kutu = (ek = {}) => ({
  padding: '9px 11px', borderRadius: 6,
  background: 'rgba(8,17,28,0.6)', border: `1px solid ${C.lineSoft}`,
  ...ek,
});

/** Amblem seçici — küçük kareler, seçili olan çerçeveli */
function AmblemSecici({ deger, onSec, amblemler }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {amblemler.map((a) => {
        const secili = deger === a;
        return (
          <button key={a} type="button" onClick={() => onSec(a)}
            title={a}
            style={{
              width: 30, height: 30, display: 'grid', placeItems: 'center',
              borderRadius: 5, cursor: 'pointer',
              background: secili ? 'rgba(127,224,77,0.14)' : 'rgba(6,11,18,0.7)',
              border: `1px solid ${secili ? '#7fe04d' : C.lineSoft}`,
            }}>
            <Icon name={a} size={17} color={secili ? '#7fe04d' : C.textMute} />
          </button>
        );
      })}
    </div>
  );
}

/** Tek üye satırı — rütbe, ad ve yöneticiye açık düğmeler */
function UyeSatiri({ uye, benimId, yetkilerim, jarlDolu, onJarl, onAt }) {
  const benMi = uye.userId === benimId;
  const konung = uye.rutbe === 'konung';
  /*
    JARL DÜĞMESİ yalnız Konung'a ve yalnız Konung OLMAYAN üyeye çıkıyor.
    Tavan doluyken düğme kapalı ve sebebi başlıkta yazıyor — basıp
    sunucudan hata yemek oyuncuya hiçbir şey öğretmiyor.
  */
  const jarlYapilabilir = yetkilerim?.jarlSecer && !konung;
  const jarlKapali = uye.rutbe !== 'jarl' && jarlDolu;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 8px', borderRadius: 5,
      background: benMi ? 'rgba(127,224,77,0.07)' : 'rgba(8,17,28,0.5)',
      border: `1px solid ${benMi ? 'rgba(127,224,77,0.28)' : C.lineSoft}`,
    }}>
      <Icon name={konung ? 'saray' : uye.rutbe === 'jarl' ? 'kalkan' : 'isci'}
        size={13} color={RUTBE_RENK[uye.rutbe] || C.textMute} />
      <span style={{
        fontFamily: FONT.ui, fontSize: 11,
        color: benMi ? '#d6f5c2' : C.text, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {uye.ad}{benMi ? ' (sen)' : ''}
      </span>
      <span style={{
        fontFamily: FONT.ui, fontSize: 9, letterSpacing: 0.6,
        color: RUTBE_RENK[uye.rutbe] || C.textMute, whiteSpace: 'nowrap',
      }}>
        {uye.rutbeAd}
      </span>
      <span style={{ flex: 1 }} />
      {jarlYapilabilir && (
        <button type="button" disabled={jarlKapali}
          onClick={() => onJarl(uye.userId, uye.rutbe !== 'jarl')}
          title={jarlKapali ? 'Jarl tavanı dolu — önce birini indir' : ''}
          style={btn(jarlKapali ? 'disabled' : 'ghost',
            { fontSize: 8.5, padding: '2px 7px' })}>
          {uye.rutbe === 'jarl' ? 'JARL’LIĞI AL' : 'JARL YAP'}
        </button>
      )}
      {!benMi && !konung && yetkilerim?.uyeAtar && (
        <button type="button" onClick={() => onAt(uye.userId)}
          style={btn('danger', { fontSize: 8.5, padding: '2px 7px' })}>
          ÇIKAR
        </button>
      )}
    </div>
  );
}

export default function ElcilikPanel({
  birlik = null, davetlerim = [], tanim = null, seviye = 0, benimId = null,
  onKur, onDavet, onDavetGeriAl, onDavetCevap, onAyril, onAt, onJarl, onDagit,
  hata = null,
}) {
  const [ad, setAd] = useState('');
  const [amblem, setAmblem] = useState(tanim?.amblemler?.[0] || 'kilic');
  const [aranan, setAranan] = useState('');
  const [dagitOnay, setDagitOnay] = useState(false);

  const amblemler = tanim?.amblemler || [];
  const jarlTavani = tanim?.jarlTavani ?? 2;
  const uyePerSeviye = tanim?.uyePerSeviye ?? 3;

  // ── 1. Birlikte değilim ─────────────────────────────────────────
  if (!birlik) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {davetlerim.length > 0 && (
          <div>
            <div style={lbl({ fontSize: 8, marginBottom: 5 })}>
              Sana gelen davetler
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {davetlerim.map((d) => (
                <div key={d.birlikId} style={kutu({
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(127,224,77,0.07)',
                  border: '1px solid rgba(127,224,77,0.3)',
                })}>
                  <Icon name={d.amblem} size={16} color="#7fe04d" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT.ui, fontSize: 11, color: '#d6f5c2' }}>
                      {d.ad}
                    </div>
                    <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textMute }}>
                      {d.uyeSayisi} üye
                      {d.davetEdenAd ? ` · ${d.davetEdenAd} çağırdı` : ''}
                    </div>
                  </div>
                  <button type="button" onClick={() => onDavetCevap?.(d.birlikId, true)}
                    style={btn('good', { fontSize: 9, padding: '3px 9px' })}>KATIL</button>
                  <button type="button" onClick={() => onDavetCevap?.(d.birlikId, false)}
                    style={btn('ghost', { fontSize: 9, padding: '3px 9px' })}>RED</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={lbl({ fontSize: 8, marginBottom: 5 })}>Kendi birliğini kur</div>
          {seviye < 1 ? (
            <div style={kutu({ fontFamily: FONT.ui, fontSize: 10, color: C.textMute })}>
              Elçilik daha inşa hâlinde — bitince birlik kurabilirsin.
            </div>
          ) : (
            <div style={kutu({ display: 'flex', flexDirection: 'column', gap: 8 })}>
              <input value={ad} onChange={(e) => setAd(e.target.value)}
                placeholder="Birliğin adı"
                maxLength={tanim?.adEnCok || 24}
                style={{
                  padding: '6px 9px', borderRadius: 4,
                  background: 'rgba(6,11,18,0.8)', color: C.text,
                  border: `1px solid ${C.line}`, fontFamily: FONT.ui, fontSize: 11,
                }} />
              <div>
                <div style={lbl({ fontSize: 7.5, letterSpacing: 1, marginBottom: 4 })}>
                  AMBLEM
                </div>
                <AmblemSecici deger={amblem} onSec={setAmblem} amblemler={amblemler} />
              </div>
              <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute, lineHeight: 1.5 }}>
                Elçiliğin <b style={{ color: C.frost }}>Lvl {seviye}</b>, yani birliğe
                {' '}<b style={{ color: C.frost }}>{seviye * uyePerSeviye}</b> üye sığar.
                Elçiliği büyütürsen tavan da büyür.
              </div>
              <button type="button" disabled={!ad.trim()}
                onClick={() => onKur?.({ ad: ad.trim(), amblem })}
                style={btn(ad.trim() ? 'primary' : 'disabled', { fontSize: 10 })}>
                BİRLİĞİ KUR
              </button>
              {hata && (
                <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.danger }}>
                  {hata}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 2 ve 3. Birlikteyim ─────────────────────────────────────────
  const y = birlik.yetkilerim || {};
  const jarlSayisi = (birlik.uyeler || []).filter(u => u.rutbe === 'jarl').length;
  const dolu = (birlik.uyeler || []).length >= (birlik.tavan || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {/* Başlık — amblem, ad, üye sayısı */}
      <div style={kutu({ display: 'flex', alignItems: 'center', gap: 10 })}>
        <Icon name={birlik.amblem} size={24} color="#7fe04d" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT.head, fontSize: 15, fontWeight: 600,
            color: '#d6f5c2', letterSpacing: 0.4,
          }}>
            {birlik.ad}
          </div>
          <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>
            sen: <span style={{ color: RUTBE_RENK[birlik.rutbem] }}>{birlik.rutbemAd}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>ÜYE</div>
          <div style={num({ fontSize: 15, color: dolu ? C.warn : C.frost })}>
            {(birlik.uyeler || []).length}/{birlik.tavan || 0}
          </div>
        </div>
      </div>

      {/* Üye listesi */}
      <div>
        <div style={lbl({ fontSize: 8, marginBottom: 5 })}>Üyeler</div>
        <div className="tn-scroll" style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          maxHeight: 210, overflowY: 'auto', paddingRight: 2,
        }}>
          {(birlik.uyeler || []).map((u) => (
            <UyeSatiri key={u.userId} uye={u} benimId={benimId} yetkilerim={y}
              jarlDolu={jarlSayisi >= jarlTavani}
              onJarl={(id, jarl) => onJarl?.(id, jarl)}
              onAt={(id) => onAt?.(id)} />
          ))}
        </div>
      </div>

      {/* Davet — yalnız yöneticilere */}
      {y.davetEder && (
        <div>
          <div style={lbl({ fontSize: 8, marginBottom: 5 })}>Davetler</div>
          <div style={kutu({ display: 'flex', flexDirection: 'column', gap: 7 })}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={aranan} onChange={(e) => setAranan(e.target.value)}
                placeholder="oyuncu adı ara…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && aranan.trim()) {
                    onDavet?.(aranan.trim()); setAranan('');
                  }
                }}
                style={{
                  flex: 1, minWidth: 0, padding: '5px 9px', borderRadius: 4,
                  background: 'rgba(6,11,18,0.8)', color: C.text,
                  border: `1px solid ${C.line}`, fontFamily: FONT.ui, fontSize: 10.5,
                }} />
              <button type="button" disabled={!aranan.trim() || dolu}
                onClick={() => { onDavet?.(aranan.trim()); setAranan(''); }}
                title={dolu ? 'Birlik dolu — önce elçiliği büyüt' : ''}
                style={btn(aranan.trim() && !dolu ? 'primary' : 'disabled',
                  { fontSize: 9.5, padding: '4px 11px' })}>
                DAVET ET
              </button>
            </div>
            {(birlik.bekleyenDavetler || []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={lbl({ fontSize: 7, letterSpacing: 1 })}>CEVAP BEKLEYENLER</div>
                {birlik.bekleyenDavetler.map((d) => (
                  <div key={d.userId} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    fontFamily: FONT.ui, fontSize: 10, color: C.textDim,
                  }}>
                    <Icon name="parsomen" size={11} color={C.textMute} />
                    <span style={{ flex: 1, minWidth: 0 }}>{d.ad}</span>
                    <button type="button" onClick={() => onDavetGeriAl?.(d.userId)}
                      style={btn('ghost', { fontSize: 8.5, padding: '1px 7px' })}>
                      GERİ AL
                    </button>
                  </div>
                ))}
              </div>
            )}
            {hata && (
              <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.danger }}>{hata}</div>
            )}
          </div>
        </div>
      )}

      {/*
        BİRLİK SALDIRIYA KARŞI KORUMA DEĞİL (İlkan'ın kararı). Bunu
        ekranda yazmak şart: oyuncu birliğe girerken korunduğunu
        sanıp savunmasını ihmal ederse bu bizim hatamız olur.
      */}
      <div style={kutu({
        background: 'rgba(242,187,96,0.08)', border: `1px solid ${C.warn}44`,
        fontFamily: FONT.ui, fontSize: 9.5, color: '#f5dca8', lineHeight: 1.5,
      })}>
        Birlik bir saldırmazlık anlaşması değil: birlik arkadaşına saldırmak
        serbesttir. Birlik sana bir bayrak ve haritada tanınırlık verir.
      </div>

      {/* Ayrıl / Dağıt */}
      <div style={{ display: 'flex', gap: 6 }}>
        {y.ayrilir && (
          <button type="button" onClick={() => onAyril?.()}
            style={btn('ghost', { fontSize: 9.5, flex: 1 })}>
            BİRLİKTEN AYRIL
          </button>
        )}
        {y.dagitir && (
          dagitOnay ? (
            <>
              <button type="button" onClick={() => { onDagit?.(); setDagitOnay(false); }}
                style={btn('danger', { fontSize: 9.5, flex: 1 })}>
                EVET, DAĞIT
              </button>
              <button type="button" onClick={() => setDagitOnay(false)}
                style={btn('ghost', { fontSize: 9.5 })}>VAZGEÇ</button>
            </>
          ) : (
            /*
              DAĞITMA İKİ ADIMDA. Geri alınamaz ve bütün üyeleri
              etkiliyor; tek tıkla yapılabilseydi yanlış basan Konung
              birliğini kurtaramazdı.
            */
            <button type="button" onClick={() => setDagitOnay(true)}
              style={btn('danger', { fontSize: 9.5, flex: 1 })}>
              BİRLİĞİ DAĞIT
            </button>
          )
        )}
      </div>
    </div>
  );
}
