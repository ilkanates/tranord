/**
 * BİRLİK DİPLOMASİSİ — konfederasyon, saldırmazlık, savaş.
 *
 * Travian'ın ittifak diplomasisinin karşılığı ve aynı üçlü:
 *
 *   KONFEDERASYON — en yakın bağ, KARŞILIKLI onay ister.
 *   SALDIRMAZLIK  — ateşkes, KARŞILIKLI onay ister.
 *   SAVAŞ         — TEK TARAFLI ilan; karşı tarafın onayı gerekmez.
 *
 * Savaşın tek taraflı olması bilinçli: savaş bir ANLAŞMA değil bir
 * BİLDİRİMDİR. Onaya bağlasaydık kimseye savaş ilan edilemezdi, düşman
 * sadece "kabul etme"yi seçerdi.
 *
 * DİPLOMASİ OYUNU ZORLAMIYOR (bkz. `birlikIciSaldiriSerbest`): bir
 * saldırmazlık anlaşması saldırıyı ENGELLEMİYOR, söz veriyor. Bunu
 * ekranda yazmak şart — oyuncu anlaşmaya güvenip savunmasını ihmal
 * ederse bu bizim hatamız olur. Bu, birlik içi saldırıda verilen
 * kararla aynı çizgi: birlik ve anlaşma birer BAYRAK, birer kalkan
 * değil.
 *
 * LİSTE VE İLİŞKİLER TEK İSTEKTE geliyor (`birlik_listesi`): her satır
 * için ayrı "bununla ilişkim ne" sorusu, ekranda otuz birlik varken
 * otuz tur demekti.
 */
import { useEffect, useMemo, useState } from 'react';
import { C, FONT, btn, label as lbl, num } from '../theme';
import Icon from './Icons';

const ILISKI_BICIM = {
  konfederasyon: { ad: 'Konfederasyon', kisa: 'KONFED.', renk: '#7fe04d' },
  saldirmazlik: { ad: 'Saldırmazlık', kisa: 'SALDIRMAZLIK', renk: '#8fdcff' },
  savas: { ad: 'Savaş', kisa: 'SAVAŞ', renk: '#ff6f78' },
};

const kutu = (ek = {}) => ({
  padding: '8px 10px', borderRadius: 5,
  background: 'rgba(8,17,28,0.55)', border: `1px solid ${C.lineSoft}`,
  ...ek,
});

/** Yürürlükteki ya da bekleyen ilişkiyi tek bir rozette anlat */
function IliskiRozeti({ iliski }) {
  const b = ILISKI_BICIM[iliski.tur];
  if (!b) return null;
  const bekliyor = iliski.durum === 'teklif';
  return (
    <span style={{
      fontFamily: FONT.ui, fontSize: 8, letterSpacing: 0.6, whiteSpace: 'nowrap',
      padding: '2px 7px', borderRadius: 8,
      color: bekliyor ? C.textMute : b.renk,
      background: bekliyor ? 'rgba(8,17,28,0.8)' : `${b.renk}1a`,
      border: `1px solid ${bekliyor ? C.lineSoft : `${b.renk}66`}`,
    }}>
      {b.kisa}{bekliyor ? (iliski.benimTeklifim ? ' · yollandı' : ' · teklif') : ''}
    </span>
  );
}

export default function BirlikDiplomasi({ socket, yetkim = false }) {
  const [birlikler, setBirlikler] = useState(null);
  const [arama, setArama] = useState('');
  const [acikId, setAcikId] = useState(null);     // hangi satırın hamleleri açık

  useEffect(() => {
    if (!socket) return undefined;
    const al = (d) => setBirlikler(d?.birlikler || []);
    /*
      SUNUCU "DEĞİŞTİ" DİYOR, LİSTEYİ BİZ İSTİYORUZ. Kendi hamlemizden
      sonra da bu yolla tazeleniyor — hamle eden ile teklifi alan
      arasında iki ayrı tazeleme yolu olsaydı biri er geç unutulurdu.
    */
    const degisti = () => socket.emit('birlik_listesi');
    socket.on('birlik_listesi', al);
    socket.on('birlik_diplomasi_degisti', degisti);
    socket.emit('birlik_listesi');
    return () => {
      socket.off('birlik_listesi', al);
      socket.off('birlik_diplomasi_degisti', degisti);
    };
  }, [socket]);

  /*
    İLİŞKİSİ OLANLAR ÜSTTE, AYRI BİR BÖLÜMDE. Tek listede kalsaydı
    savaşta olduğun birlik sıralamanın ortasında kaybolurdu — oysa
    diplomasi ekranını açmanın sebebi genelde o satır.
  */
  const { iliskili, digerleri } = useMemo(() => {
    const hepsi = birlikler || [];
    const terim = arama.trim().toLocaleLowerCase('tr');
    const suz = (b) => !terim || String(b.ad || '').toLocaleLowerCase('tr').includes(terim);
    return {
      iliskili: hepsi.filter(b => b.iliski && !b.benimki),
      digerleri: hepsi.filter(b => !b.iliski && !b.benimki && suz(b)),
    };
  }, [birlikler, arama]);

  const yenile = () => socket?.emit('birlik_listesi');
  const hamle = (ev, veri) => { socket?.emit(ev, veri); setAcikId(null); };

  const Satir = ({ b }) => {
    const acik = acikId === b.id;
    return (
      <div style={kutu({ display: 'flex', flexDirection: 'column', gap: 6 })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name={b.amblem} size={15} color={C.iceSoft} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT.ui, fontSize: 11, color: C.text,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              <span style={num({ fontSize: 9, color: C.textFaint })}>#{b.sira} </span>
              {b.ad}
            </div>
            <div style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textMute }}>
              {b.uyeSayisi} üye · {b.koySayisi} köy · {b.nufus} nüfus
            </div>
          </div>
          {b.iliski && <IliskiRozeti iliski={b.iliski} />}
          {yetkim && (
            <button type="button" onClick={() => setAcikId(acik ? null : b.id)}
              style={btn('ghost', { fontSize: 8.5, padding: '2px 8px' })}>
              {acik ? 'KAPAT' : '…'}
            </button>
          )}
        </div>

        {acik && yetkim && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {/*
              HAMLELER DURUMA GÖRE. Oyuncuya yapamayacağı bir düğme
              göstermek, tıklayıp sunucudan hata almasına yol açardı.
            */}
            {!b.iliski && (
              <>
                <button type="button" style={btn('good', { fontSize: 8.5, padding: '3px 9px' })}
                  onClick={() => hamle('birlik_diplomasi',
                    { hedefBirlikId: b.id, tur: 'konfederasyon' })}>
                  KONFEDERASYON TEKLİF ET
                </button>
                <button type="button" style={btn('ghost', { fontSize: 8.5, padding: '3px 9px' })}
                  onClick={() => hamle('birlik_diplomasi',
                    { hedefBirlikId: b.id, tur: 'saldirmazlik' })}>
                  SALDIRMAZLIK TEKLİF ET
                </button>
                <button type="button" style={btn('danger', { fontSize: 8.5, padding: '3px 9px' })}
                  onClick={() => hamle('birlik_diplomasi',
                    { hedefBirlikId: b.id, tur: 'savas' })}>
                  SAVAŞ İLAN ET
                </button>
              </>
            )}

            {b.iliski?.durum === 'teklif' && !b.iliski.benimTeklifim && (
              <>
                <button type="button" style={btn('primary', { fontSize: 8.5, padding: '3px 9px' })}
                  onClick={() => hamle('birlik_diplomasi_cevap',
                    { hedefBirlikId: b.id, kabul: true })}>
                  KABUL ET
                </button>
                <button type="button" style={btn('ghost', { fontSize: 8.5, padding: '3px 9px' })}
                  onClick={() => hamle('birlik_diplomasi_cevap',
                    { hedefBirlikId: b.id, kabul: false })}>
                  REDDET
                </button>
              </>
            )}

            {b.iliski?.durum === 'teklif' && b.iliski.benimTeklifim && (
              <button type="button" style={btn('ghost', { fontSize: 8.5, padding: '3px 9px' })}
                onClick={() => hamle('birlik_diplomasi_bitir', { hedefBirlikId: b.id })}>
                TEKLİFİ GERİ AL
              </button>
            )}

            {b.iliski?.durum === 'kabul' && (
              <button type="button" style={btn('danger', { fontSize: 8.5, padding: '3px 9px' })}
                onClick={() => hamle('birlik_diplomasi_bitir', { hedefBirlikId: b.id })}>
                {b.iliski.tur === 'savas' ? 'SAVAŞI BİTİR' : 'ANLAŞMAYI BOZ'}
              </button>
            )}

            {/* Yürürlükteki bir ilişki varken savaş ilanı da mümkün */}
            {b.iliski?.durum === 'kabul' && b.iliski.tur !== 'savas' && (
              <button type="button" style={btn('danger', { fontSize: 8.5, padding: '3px 9px' })}
                onClick={() => hamle('birlik_diplomasi',
                  { hedefBirlikId: b.id, tur: 'savas' })}>
                SAVAŞ İLAN ET
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={lbl({ fontSize: 8 })}>Diplomasi</span>
        <span style={{ fontFamily: FONT.ui, fontSize: 8.5, color: C.textFaint }}>
          {(birlikler || []).length} birlik
        </span>
        <button type="button" onClick={yenile}
          style={btn('ghost', { marginLeft: 'auto', fontSize: 8.5, padding: '2px 9px' })}>
          YENİLE
        </button>
      </div>

      {!yetkim && (
        <div style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>
          Diplomasi hamlelerini yalnız Konung yapabilir — sen izliyorsun.
        </div>
      )}

      {birlikler === null ? (
        <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>
          Yükleniyor…
        </div>
      ) : (
        <>
          {iliskili.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>İLİŞKİLERİMİZ</div>
              {iliskili.map(b => <Satir key={b.id} b={b} />)}
            </div>
          )}

          <input value={arama} onChange={(e) => setArama(e.target.value)}
            placeholder="birlik ara…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '5px 9px', borderRadius: 4,
              background: 'rgba(6,11,18,0.8)', color: C.text,
              border: `1px solid ${C.line}`, fontFamily: FONT.ui, fontSize: 10.5,
            }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={lbl({ fontSize: 7.5, letterSpacing: 1 })}>
              ÖTEKİ BİRLİKLER · nüfusa göre
            </div>
            {digerleri.length === 0 ? (
              <div style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>
                {arama.trim() ? 'Bu ada uyan birlik yok.' : 'Başka birlik yok.'}
              </div>
            ) : (
              <div className="tn-scroll" style={{
                display: 'flex', flexDirection: 'column', gap: 4,
                maxHeight: 240, overflowY: 'auto', paddingRight: 2,
              }}>
                {digerleri.map(b => <Satir key={b.id} b={b} />)}
              </div>
            )}
          </div>
        </>
      )}

      {/*
        ANLAŞMA KALKAN DEĞİL. Birlik içi saldırıda verilen kararla aynı
        çizgi: oyuncu anlaşmaya güvenip savunmasını ihmal ederse bu
        bizim hatamız olur.
      */}
      <div style={kutu({
        background: 'rgba(242,187,96,0.08)', border: `1px solid ${C.warn}44`,
        fontFamily: FONT.ui, fontSize: 9, color: '#f5dca8', lineHeight: 1.5,
      })}>
        Anlaşmalar saldırıyı ENGELLEMEZ, söz verir. Saldırmazlık imzalayan
        bir birlik yine de saldırabilir — anlaşmanın bedeli itibardır,
        oyunun kuralı değil.
      </div>
    </div>
  );
}
