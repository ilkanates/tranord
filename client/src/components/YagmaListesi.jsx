/**
 * YagmaListesi — köye özel yağma listeleri ("farm list").
 *
 * İlkan: *"satır satır saldırıp yağmalanabilecek köyleri ve hangi askerin
 * kaç adet gideceğini ekleyebileyim… toplu yağmaya gönder tuşu olsun…
 * dolu dönenlere saldır tuşu olsun… şu an saldıramadıklarıma saldır tuşu
 * olsun… birden fazla liste olsun ve listeler köye özel olsun."*
 *
 * ── LİSTE KÖYE AİT ─────────────────────────────────────────────────
 *
 * Yağma bir KÖYDEN çıkıyor: mesafe o köye göre, asker o köyün
 * ordusundan. Köy değiştirince liste de değişiyor — ekranın üstünde
 * hangi köyde olduğun yazıyor ki "listem kayboldu" sanılmasın.
 *
 * ── ÜÇ DÜĞME ───────────────────────────────────────────────────────
 *
 *   TÜMÜNE GÖNDER            listedeki her satır
 *   DOLU DÖNENLERE           son seferi ganimetle dolu dönenler
 *   GÖNDERİLEMEYENLERE       son denemede gidemeyenler
 *
 * Üçüncüsü olmasa oyuncu 40 satırlık listede hangi 6'sının gitmediğini
 * tek tek aramak zorunda kalırdı.
 *
 * ── SONUÇ RENKLERİ ─────────────────────────────────────────────────
 *
 * Satırın solundaki şerit son seferin sonucu: yeşil DOLU (hedefte hâlâ
 * kaynak var, yine git), sarı EKSİK (köy boşalmış), gri BOŞ, kırmızı
 * KAYIP (savaşı kaybettik — oraya bir daha bu orduyla gitme).
 */
import { useState } from 'react';
import { C, FONT, panel, btn, label as lbl, num, short } from '../theme';
import Icon from './Icons';
import { unitEmblem } from '../data/unitEmblems';

/** Sunucudaki SONUC ile aynı — bkz. server/game/yagmaListesi.js */
const SONUC_RENK = {
  dolu: C.good, eksik: C.warn, bos: C.textMute, kayip: C.danger,
};
const SONUC_AD = {
  dolu: 'Dolu döndü', eksik: 'Eksik döndü', bos: 'Boş döndü', kayip: 'Kayıp',
};

const HATA_AD = {
  yetersiz_asker: 'Asker yetmedi',
  sefer_limiti: 'Sefer limiti dolu',
  gecersiz_hedef: 'Hedef yok',
  kendi_koyun: 'Kendi köyün',
  asker_secilmedi: 'Asker seçilmedi',
};
const hataYaz = (k) => HATA_AD[k] || (k ? String(k).replace(/_/g, ' ') : null);

/* ── Satırdaki birim seçici ──────────────────────────────────────── */

/**
 * BİRİM SEÇİCİ — köyde BULUNAN birimler listeleniyor.
 *
 * Köyde hiç olmayan bir birimi listeye yazmak, her gönderimde
 * "asker yetmedi" alan ve sebebini göremeyen bir satır üretirdi.
 */
function BirimSecici({ army, unitDefs, birimler, onDegis }) {
  const turler = Object.keys(unitDefs || {})
    .filter(t => (army?.[t] || 0) > 0 || (birimler?.[t] || 0) > 0);

  if (!turler.length) {
    return <span style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textMute }}>
      köyde asker yok
    </span>;
  }

  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
      {turler.map(t => {
        const secili = birimler?.[t] || 0;
        const mevcut = army?.[t] || 0;
        return (
          <label key={t} title={`${unitDefs[t]?.name || t} · köyde ${mevcut}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '2px 4px', borderRadius: 4,
              background: secili ? 'rgba(143,220,255,0.12)' : 'rgba(8,17,28,0.6)',
              border: `1px solid ${secili ? C.lineBright : C.lineSoft}`,
            }}>
            {/* Amblemi olmayan birim için kırık görsel yerine kısaltma */}
            {unitEmblem(t) ? (
              <img src={unitEmblem(t)} alt="" width={16} height={16}
                style={{ opacity: secili ? 1 : 0.5 }} />
            ) : (
              <span style={lbl({ fontSize: 8, letterSpacing: 0.5 })}>
                {(unitDefs[t]?.name || t).slice(0, 3)}
              </span>
            )}
            <input type="number" min={0} max={mevcut || undefined} value={secili || ''}
              placeholder="0"
              onChange={(e) => onDegis({ ...birimler, [t]: Math.max(0, Number(e.target.value) || 0) })}
              style={{
                width: 42, padding: '1px 3px', textAlign: 'right',
                background: 'transparent', border: 'none', outline: 'none',
                color: secili ? C.frost : C.textMute,
                fontFamily: FONT.num, fontSize: 11,
              }} />
          </label>
        );
      })}
    </div>
  );
}

/* ── Ana bileşen ─────────────────────────────────────────────────── */

export default function YagmaListesi({
  socket, listeler = [], army = {}, unitDefs = {}, koyAdi = '', sonuc = null,
}) {
  const [seciliId, setSeciliId] = useState(null);
  const [yeniAd, setYeniAd] = useState('');
  const [adDuzenle, setAdDuzenle] = useState(null);

  /*
    SEÇİLİ LİSTE SUNUCUDAN GELENE GÖRE ÇÖZÜLÜYOR. Kendi kopyasını
    tutsaydı liste silindiğinde ekran olmayan bir listeyi göstermeye
    çalışırdı.
  */
  const secili = listeler.find(l => l.id === seciliId) || listeler[0] || null;

  const gonder = (filtre) =>
    socket?.emit('yagma_toplu_gonder', { listeId: secili?.id, filtre });

  const hedefler = secili?.hedefler || [];
  const doluAdet = hedefler.filter(h => h.sonSonuc === 'dolu'
    && Object.keys(h.birimler || {}).length).length;
  const hataAdet = hedefler.filter(h => h.sonHata
    && Object.keys(h.birimler || {}).length).length;

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '12px 0 20px' }}>

      {/* ── Liste sekmeleri ── */}
      <div style={{
        display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
        marginBottom: 10,
      }}>
        <Icon name="kilic" size={15} color={C.iceSoft} />
        <span style={lbl({ fontSize: 8.5, letterSpacing: 1.3 })}>
          {koyAdi ? `${koyAdi} · yağma listeleri` : 'yağma listeleri'}
        </span>
        <div style={{ flex: 1 }} />
        <input value={yeniAd} onChange={(e) => setYeniAd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || !yeniAd.trim()) return;
            socket?.emit('yagma_liste_ekle', { ad: yeniAd.trim() });
            setYeniAd('');
          }}
          placeholder="yeni liste adı + Enter"
          style={{
            padding: '5px 9px', borderRadius: 5, width: 180,
            background: 'rgba(8,17,28,0.8)', border: `1px solid ${C.lineSoft}`,
            color: C.frost, fontFamily: FONT.ui, fontSize: 11,
          }} />
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {listeler.map(l => {
          const aktif = l.id === secili?.id;
          return (
            <button key={l.id} type="button" onClick={() => setSeciliId(l.id)}
              onDoubleClick={() => setAdDuzenle(l.id)}
              title="çift tıkla: adını değiştir"
              style={{
                padding: '6px 12px', borderRadius: 5, cursor: 'pointer',
                background: aktif ? 'rgba(143,220,255,0.14)' : 'rgba(8,17,28,0.6)',
                border: `1px solid ${aktif ? C.lineBright : C.lineSoft}`,
                fontFamily: FONT.ui, fontSize: 11,
                color: aktif ? C.frost : C.textMute,
              }}>
              {l.ad}
              <span style={num({ fontSize: 9.5, color: C.textMute, marginLeft: 6 })}>
                {(l.hedefler || []).length}
              </span>
            </button>
          );
        })}
        {!listeler.length && (
          <div style={{ fontFamily: FONT.ui, fontSize: 11, color: C.textMute }}>
            Henüz liste yok — sağ üstten bir ad yazıp Enter'a bas.
          </div>
        )}
      </div>

      {adDuzenle && (
        <div style={{ ...panel({ padding: 10 }), marginBottom: 10, display: 'flex', gap: 6 }}>
          <input autoFocus defaultValue={listeler.find(l => l.id === adDuzenle)?.ad || ''}
            onKeyDown={(e) => {
              if (e.key === 'Escape') return setAdDuzenle(null);
              if (e.key !== 'Enter') return;
              socket?.emit('yagma_liste_adlandir', { listeId: adDuzenle, ad: e.target.value });
              setAdDuzenle(null);
            }}
            style={{
              flex: 1, padding: '6px 9px', borderRadius: 5,
              background: 'rgba(8,17,28,0.8)', border: `1px solid ${C.lineSoft}`,
              color: C.frost, fontFamily: FONT.ui, fontSize: 12,
            }} />
          <button type="button" onClick={() => setAdDuzenle(null)}
            style={btn('ghost', { padding: '5px 10px', fontSize: 10 })}>VAZGEÇ</button>
          <button type="button"
            onClick={() => { socket?.emit('yagma_liste_sil', { listeId: adDuzenle }); setAdDuzenle(null); }}
            style={btn('ghost', {
              padding: '5px 10px', fontSize: 10, color: '#f0b8bd', borderColor: C.dangerDim,
            })}>LİSTEYİ SİL</button>
        </div>
      )}

      {!secili ? null : (
        <div style={panel({ padding: 0, overflow: 'hidden' })}>

          {/* ── Üç düğme ── */}
          <div style={{
            display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center',
            padding: '10px 12px', borderBottom: `1px solid ${C.lineSoft}`,
          }}>
            <button type="button" onClick={() => gonder('hepsi')}
              disabled={!hedefler.length}
              style={btn('good', { padding: '7px 13px', fontSize: 10 })}>
              TÜMÜNE GÖNDER
            </button>
            {/*
              DOLU DÖNENLER — hedefte hâlâ kaynak olduğu ÖLÇÜLEN satırlar.
              Sayı düğmenin üstünde: boşuna basmak yerine kaç hedefin
              olduğu önceden görünüyor.
            */}
            <button type="button" onClick={() => gonder('dolu')} disabled={!doluAdet}
              style={btn('ghost', {
                padding: '7px 13px', fontSize: 10,
                opacity: doluAdet ? 1 : 0.45,
              })}>
              DOLU DÖNENLERE{doluAdet ? ` · ${doluAdet}` : ''}
            </button>
            <button type="button" onClick={() => gonder('gonderilemeyen')} disabled={!hataAdet}
              style={btn('ghost', {
                padding: '7px 13px', fontSize: 10,
                opacity: hataAdet ? 1 : 0.45,
              })}>
              GÖNDERİLEMEYENLERE{hataAdet ? ` · ${hataAdet}` : ''}
            </button>

            <div style={{ flex: 1 }} />
            {sonuc && (
              <span style={{
                fontFamily: FONT.ui, fontSize: 10.5,
                color: sonuc.basarisiz ? C.warn : C.good,
              }}>
                {sonuc.gonderilen} sefer yola çıktı
                {sonuc.basarisiz ? ` · ${sonuc.basarisiz} gidemedi` : ''}
              </span>
            )}
          </div>

          {/* ── Satırlar ── */}
          {!hedefler.length ? (
            <div style={{
              padding: '18px 14px', fontFamily: FONT.ui, fontSize: 11.5,
              color: C.textMute, lineHeight: 1.6,
            }}>
              Bu liste boş. <b style={{ color: C.iceSoft }}>Haritada</b> bir köye
              tıklayıp <b style={{ color: C.iceSoft }}>“yağma listesine ekle”</b> ile
              satır ekleyebilirsin.
            </div>
          ) : hedefler.map(h => {
            const renk = SONUC_RENK[h.sonSonuc] || C.lineSoft;
            const secilenAsker = Object.values(h.birimler || {})
              .reduce((s, n) => s + (n || 0), 0);
            return (
              <div key={h.slotKey} style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                padding: '9px 12px', borderTop: `1px solid ${C.lineSoft}`,
                borderLeft: `3px solid ${renk}`,
              }}>
                <div style={{ minWidth: 150, flex: '0 0 auto' }}>
                  <div style={{ fontFamily: FONT.ui, fontSize: 12, color: C.frost }}>
                    {h.ad}
                  </div>
                  <div style={num({ fontSize: 9, color: C.textMute })}>{h.slotKey}</div>
                </div>

                <div style={{ flex: 1, minWidth: 220 }}>
                  <BirimSecici army={army} unitDefs={unitDefs} birimler={h.birimler}
                    onDegis={(birimler) => socket?.emit('yagma_hedef_guncelle', {
                      listeId: secili.id, slotKey: h.slotKey, birimler,
                    })} />
                </div>

                <div style={{ minWidth: 118, textAlign: 'right' }}>
                  {h.sonHata ? (
                    <div style={{ fontFamily: FONT.ui, fontSize: 10, color: C.warn }}>
                      {hataYaz(h.sonHata)}
                    </div>
                  ) : h.sonSonuc ? (
                    <>
                      <div style={{ fontFamily: FONT.ui, fontSize: 10, color: renk }}>
                        {SONUC_AD[h.sonSonuc]}
                      </div>
                      {h.sonGanimet > 0 && (
                        <div style={num({ fontSize: 9.5, color: C.textMute })}>
                          {short(h.sonGanimet)} ganimet
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textMute }}>
                      henüz gidilmedi
                    </div>
                  )}
                </div>

                <div style={num({ fontSize: 11, color: secilenAsker ? C.iceSoft : C.danger, minWidth: 42, textAlign: 'right' })}>
                  {secilenAsker || '0'}
                </div>

                <button type="button" title="satırı sil"
                  onClick={() => socket?.emit('yagma_hedef_sil', {
                    listeId: secili.id, slotKey: h.slotKey,
                  })}
                  style={btn('ghost', { padding: '4px 8px', fontSize: 9 })}>SİL</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
