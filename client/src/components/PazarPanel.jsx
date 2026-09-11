/**
 * PazarPanel — NPC takası ve tüccar durumu.
 *
 * İki bölüm var:
 *   TÜCCARLAR  — pazar seviyesi kadar tüccar, her biri 2.000 taşır.
 *                Oyuncular arası gönderilerde kullanılacak.
 *   TAKAS      — anında kaynak dönüşümü. Tüccar harcamıyor, süre almıyor;
 *                bedeli oranın kendisi: her takas kaybettirir.
 *
 * ORANLARI SUNUCU UYGULUYOR. Buradaki hesap yalnızca ÖNİZLEME — "ne verip
 * ne alacağım" sorusunun cevabı. Sunucu kendi hesabını yapıp `pazar_sonuc`
 * ile gerçekleşeni bildiriyor; ikisi ayrışırsa doğru olan sunucudur.
 * (Oran tablosu iki tarafta da yazılı; server/game/pazar.js ile aynı kalmalı.)
 */
import { useState } from 'react';
import { C, FONT, btn, label as lbl, num } from '../theme';
import { RES_LABEL } from '../flows';
import { RES_COLOR } from '../theme';
import Icon from './Icons';
import PazarTeklifler from './PazarTeklifler';

const HAM = ['odun', 'kil', 'tas', 'demir', 'tahil'];
const ISLENMIS = ['kereste', 'tugla', 'yontmaTas', 'demirKulce', 'un', 'ekmek'];

/** Kaç birim VERİLİR, 1 birim ALINIR. null = bu yön kapalı. */
function oran(veren, alan) {
  if (!veren || !alan || veren === alan) return null;
  const vHam = HAM.includes(veren), aHam = HAM.includes(alan);
  const vIsl = ISLENMIS.includes(veren), aIsl = ISLENMIS.includes(alan);
  if (vHam && aHam) return 2;
  if (vHam && aIsl) return 4;
  if (vIsl && aIsl) return 2;
  return null;                       // işlenmiş → ham kapalı
}

function KaynakSecici({ deger, onSec, baslik, resources }) {
  return (
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={lbl({ fontSize: 8, marginBottom: 4 })}>{baslik}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {[...HAM, ...ISLENMIS].map((r) => {
          const secili = deger === r;
          return (
            <button key={r} onClick={() => onSec(r)}
              title={`${RES_LABEL[r] || r}${resources ? ` · elinde ${Math.floor(resources[r] || 0)}` : ''}`}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                padding: '5px 6px', borderRadius: 5, cursor: 'pointer',
                background: secili ? 'rgba(143,220,255,0.14)' : 'rgba(8,14,24,0.5)',
                border: `1px solid ${secili ? C.lineBright : C.line}`,
              }}>
              {/* Pazarda mal seçmek asıl iş: simge 11 px'ti, hangi kaynak
                  olduğu seçilmiyordu. 22 px'te bir bakışta okunuyor. */}
              <Icon name={r} size={22} color={RES_COLOR[r]} />
              {resources && (
                <span style={num({ fontSize: 9, color: secili ? C.frost : C.textMute })}>
                  {Math.floor(resources[r] || 0)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PazarPanel({
  pazar = null, resources = {}, onTakas,
  socket, onTeklifAc, onTeklifIptal, onTeklifKabul,
}) {
  const [veren, setVeren] = useState('odun');
  const [alan, setAlan] = useState('kil');
  const [miktar, setMiktar] = useState(1000);
  /*
    İKİ AYRI İŞ, İKİ SEKME. NPC takası anlık ve sabit oranlı; oyuncu
    teklifleri pazarlıklı ve yolda süren bir iş. Alt alta koymak paneli
    iki katına çıkarıyor ve ikisi birbirine karışıyordu.
  */
  const [sekme, setSekme] = useState('takas');

  if (!pazar || !pazar.seviye) return null;

  const o = oran(veren, alan);
  const elde = Math.floor(resources[veren] || 0);
  const istenen = Math.max(0, Math.floor(Number(miktar) || 0));
  const alinacak = o ? Math.floor(istenen / o) : 0;
  const harcanacak = o ? alinacak * o : 0;
  /*
    DEPO TAVANI. Sunucu sığmayan takası hiç yapmıyor; bunu istemci de bilmezse
    düğme açık görünür, basılır ve ekranda hiçbir şey olmaz. `bosYer` sunucudan
    geliyor (bkz. server/game/pazar.js · bosYerler).
  */
  const bosYer = pazar.bosYer?.[alan];
  const sigmaz = bosYer != null && alinacak > bosYer;
  /** Depoya sığan en büyük takas — "hepsi" bunu aşmıyor */
  const enCok = o ? Math.min(elde, bosYer == null ? elde : bosYer * o) : elde;
  const gecerli = o && istenen >= o && istenen <= elde && !sigmaz && alinacak >= 1;

  return (
    <div style={{
      background: 'rgba(8,14,22,0.5)', border: `1px solid ${C.line}`,
      borderRadius: 7, padding: 10,
    }}>
      {/* ── Tüccarlar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        <Icon name="bilgi" size={12} color={C.iceDeep} />
        <span style={lbl({ fontSize: 8, flex: 1 })}>Tüccarlar</span>
        <span style={num({ fontSize: 11, color: C.frost })}>
          {pazar.tuccarBos}<span style={{ color: C.textMute }}> / {pazar.tuccarToplam}</span>
        </span>
        <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>
          boşta · her biri {pazar.tuccarKapasitesi.toLocaleString('tr-TR')}
        </span>
      </div>
      <div style={{
        fontFamily: FONT.ui, fontSize: 9, color: C.textFaint,
        lineHeight: 1.45, marginBottom: 11,
        paddingBottom: 10, borderBottom: `1px solid ${C.lineSoft || C.line}`,
      }}>
        Toplam taşıma: <span style={num({ fontSize: 9.5, color: C.iceSoft })}>
          {(pazar.tuccarBos * pazar.tuccarKapasitesi).toLocaleString('tr-TR')}
        </span> — pazar her seviyede bir tüccar ekler.
      </div>

      {/* ── Sekmeler ── */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {[['takas', 'NPC TAKASI'], ['teklif', 'OYUNCU PAZARI']].map(([k, ad]) => {
          const acik = sekme === k;
          return (
            <button key={k} type="button" onClick={() => setSekme(k)}
              style={{
                padding: '4px 11px', borderRadius: 4, cursor: 'pointer',
                fontFamily: FONT.ui, fontSize: 9, letterSpacing: 1, fontWeight: 600,
                color: acik ? C.frost : C.textMute,
                background: acik ? 'rgba(143,220,255,0.14)' : 'rgba(8,14,24,0.5)',
                border: `1px solid ${acik ? C.lineBright : C.line}`,
              }}>{ad}</button>
          );
        })}
      </div>

      {sekme === 'teklif' ? (
        <PazarTeklifler
          socket={socket} pazar={pazar} resources={resources}
          onAc={onTeklifAc} onIptal={onTeklifIptal} onKabul={onTeklifKabul} />
      ) : (
      <>
      {/* ── Takas ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 9 }}>
        <KaynakSecici baslik="Veririm" deger={veren} onSec={setVeren} resources={resources} />
        <KaynakSecici baslik="Alırım" deger={alan} onSec={setAlan} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <input type="number" min={0} max={elde} value={miktar}
          onChange={(e) => setMiktar(e.target.value)}
          style={{
            width: 90, padding: '4px 7px', borderRadius: 4,
            background: 'rgba(6,11,18,0.8)', color: C.frost,
            border: `1px solid ${C.line}`, fontFamily: FONT.num, fontSize: 11,
          }} />
        <button onClick={() => setMiktar(enCok)} style={btn('ghost', { fontSize: 9, padding: '3px 7px' })}>
          hepsi
        </button>
        <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textMute }}>
          elinde {elde.toLocaleString('tr-TR')}
        </span>
      </div>

      {/* Önizleme */}
      {!o ? (
        <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.warn, lineHeight: 1.45 }}>
          {veren === alan
            ? 'Aynı kaynağı takas edemezsin.'
            : 'İşlenmiş maldan ham maddeye dönüş yok — işleme binaları bunu '
              + 'sonsuz kaynak döngüsüne çevirirdi.'}
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 9px', borderRadius: 5, marginBottom: 8,
            background: 'rgba(143,220,255,0.06)', border: `1px solid ${C.line}`,
          }}>
            <Icon name={veren} size={24} color={RES_COLOR[veren]} />
            <span style={num({ fontSize: 13, color: C.frost })}>{harcanacak.toLocaleString('tr-TR')}</span>
            <Icon name="artis" size={11} color={C.textMute} style={{ transform: 'rotate(90deg)' }} />
            <Icon name={alan} size={24} color={RES_COLOR[alan]} />
            <span style={num({ fontSize: 13, color: C.good })}>{alinacak.toLocaleString('tr-TR')}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>{o} : 1</span>
          </div>
          <button
            disabled={!gecerli}
            onClick={() => gecerli && onTakas?.({ veren, alan, miktar: istenen })}
            style={btn(gecerli ? 'primary' : 'disabled', { width: '100%', fontSize: 10 })}>
            {istenen > elde ? 'Yetersiz kaynak'
              : istenen < o ? `En az ${o} gerekiyor`
                : sigmaz ? `Depoda ${bosYer.toLocaleString('tr-TR')} birim yer var`
                  : 'Takas et'}
          </button>
        </>
      )}
      </>
      )}
    </div>
  );
}
