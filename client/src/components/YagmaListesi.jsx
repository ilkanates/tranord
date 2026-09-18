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
import { createPortal } from 'react-dom';
import { C, FONT, panel, btn, label as lbl, num, short, fmtTime } from '../theme';
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
  zaten_listede: 'Bu köy zaten başka bir listende',
};
const hataYaz = (k) => HATA_AD[k] || (k ? String(k).replace(/_/g, ' ') : null);

/** Hammadde adları — ganimet dökümü oyuncunun bildiği isimlerle yazılsın */
const RES_AD = {
  odun: 'Odun', kil: 'Kil', tas: 'Taş', demir: 'Demir', tahil: 'Tahıl',
  kereste: 'Kereste', tugla: 'Tuğla', yontmaTas: 'Yontma taş',
  demirKulce: 'Demir külçe', un: 'Un', ekmek: 'Ekmek',
};

/**
 * SON SEFERİN DÖKÜMÜ — satırın üstüne gelince.
 *
 * Rapor ekranına gitmeden "ne aldım, ne kaybettim" görünsün diye.
 * Yağma listesinin bütün işi tekrar tekrar aynı hedeflere gitmek;
 * her seferinde rapor ekranını açmak o döngüyü kırardı.
 */
function SonRapor({ h, kutu }) {
  const kalemler = Object.entries(h.sonGanimetler || {}).filter(([, n]) => n > 0);
  if (!kutu) return null;
  /* Üstte yer yoksa aşağı düş — listenin ilk satırlarında kart taşıyordu */
  const ustte = kutu.top > 250;
  return createPortal((
    <div style={{
      position: 'fixed', zIndex: 70, pointerEvents: 'none',
      left: Math.min(kutu.right, window.innerWidth - 16),
      top: ustte ? kutu.top - 8 : kutu.bottom + 8,
      transform: ustte ? 'translate(-100%, -100%)' : 'translate(-100%, 0)',
      minWidth: 190, padding: '9px 11px', borderRadius: 6,
      background: 'rgba(6,12,20,0.97)', border: `1px solid ${C.lineBright}`,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    }}>
      <div style={lbl({ fontSize: 8, letterSpacing: 1.2, marginBottom: 5 })}>
        son sefer
      </div>
      {kalemler.length ? kalemler.map(([k, n]) => (
        <div key={k} style={{
          display: 'flex', justifyContent: 'space-between', gap: 14,
          fontFamily: FONT.ui, fontSize: 10.5, color: C.textDim, lineHeight: 1.65,
        }}>
          <span>{RES_AD[k] || k}</span>
          <span style={num({ color: C.iceSoft })}>{short(n)}</span>
        </div>
      )) : (
        <div style={{ fontFamily: FONT.ui, fontSize: 10.5, color: C.textMute }}>
          Ganimet yok
        </div>
      )}
      <div style={{
        marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.lineSoft}`,
        display: 'flex', justifyContent: 'space-between', gap: 14,
        fontFamily: FONT.ui, fontSize: 10.5,
        color: h.sonKayip ? C.danger : C.good,
      }}>
        <span>{h.sonKayip ? 'Kaybedilen asker' : 'Kayıp'}</span>
        <span style={num({ color: 'inherit' })}>{h.sonKayip || 'yok'}</span>
      </div>
      {h.sonDonus && (
        <div style={lbl({ fontSize: 8, letterSpacing: 1, marginTop: 5 })}>
          {new Date(h.sonDonus).toLocaleString('tr-TR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
          })}
        </div>
      )}
    </div>
  ), document.body);
}

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
  /*
    YOLDAKİ SEFERLER pakette zaten var (village.marches). Listeye ayrı
    bir "yolda mı" alanı eklemek, aynı gerçeği iki yerde tutmak olurdu.
  */
  marches = [],
}) {
  const [seciliId, setSeciliId] = useState(null);
  const [yeniAd, setYeniAd] = useState('');
  const [adDuzenle, setAdDuzenle] = useState(null);
  /* { slotKey, kutu } — kutu satırın EKRANDAKİ yeri (portal için) */
  const [acikRapor, setAcikRapor] = useState(null);

  /*
    HEDEF BAŞINA YOLDAKİ SEFER — GİDEN ÖNCELİKLİ.

    Aynı hedefe birden çok sefer yolda olabilir. Önce "en yakın varış"
    gösteriliyordu ve bu yanlıştı: dönüşe geçmiş bir sefer 3 dakika
    uzaktayken yeni yola çıkan saldırı 15 dakika uzakta oluyor, rozeti
    dönüş kazanıyor ve oyuncu saldırısının gittiğini göremiyordu
    (İlkan bildirdi).

    Oyuncunun sorduğu soru "ilk haber ne zaman gelecek" değil, "şu an
    saldırıyor muyum". Giden ordu bir KARAR, dönen ordu bir SONUÇ.
  */
  const seferler = new Map();
  for (const m of marches) {
    if (m.mode !== 'raid' || !m.toKey) continue;
    const onceki = seferler.get(m.toKey);
    const giden = (x) => x.phase !== 'return';
    const dahaIyi = !onceki
      || (giden(m) && !giden(onceki))
      || (giden(m) === giden(onceki) && (m.timeLeft ?? 1e9) < (onceki.timeLeft ?? 1e9));
    if (dahaIyi) seferler.set(m.toKey, { ...m, adet: (onceki?.adet || 0) + 1 });
    else seferler.set(m.toKey, { ...onceki, adet: (onceki.adet || 0) + 1 });
  }

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
            const sefer = seferler.get(h.slotKey) || null;
            const renk = SONUC_RENK[h.sonSonuc] || C.lineSoft;
            const secilenAsker = Object.values(h.birimler || {})
              .reduce((s, n) => s + (n || 0), 0);
            return (
              <div key={h.slotKey}
                onMouseEnter={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setAcikRapor({ slotKey: h.slotKey, kutu: r });
                }}
                onMouseLeave={() => setAcikRapor(null)}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  padding: '9px 12px', borderTop: `1px solid ${C.lineSoft}`,
                  borderLeft: `3px solid ${renk}`,
                  /*
                    KAYIP VARSA SATIR DA KIRMIZIYA ÇALIYOR. Sonuç şeridi
                    "dolu" diyip satır sakin görünürse, asker kaybettiren
                    bir hedef farkında olmadan tekrar tekrar vurulur.
                  */
                  background: h.sonKayip ? 'rgba(88,22,30,0.28)' : 'transparent',
                }}>
                <div style={{ minWidth: 150, flex: '0 0 auto' }}>
                  <div style={{ fontFamily: FONT.ui, fontSize: 12, color: C.frost }}>
                    {h.ad}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={num({ fontSize: 9, color: C.textMute })}>{h.slotKey}</span>
                    {/*
                      YOLDAKİ SEFER — dönüş ayağı da gösteriliyor: "ordum
                      nerede" sorusunun cevabı seferin yönüne göre değişiyor.
                    */}
                    {sefer && (
                      <span style={{
                        fontFamily: FONT.ui, fontSize: 8.5, letterSpacing: 0.6,
                        padding: '1px 5px', borderRadius: 3,
                        color: sefer.phase === 'return' ? C.iceSoft : C.warn,
                        background: sefer.phase === 'return'
                          ? 'rgba(143,220,255,0.12)' : 'rgba(224,168,74,0.14)',
                      }}>
                        {sefer.phase === 'return' ? 'DÖNÜYOR' : 'SALDIRIYOR'}
                        {sefer.timeLeft > 0 ? ` ${fmtTime(sefer.timeLeft)}` : ''}
                        {/*
                          KAÇ SEFER — "saldırıyorum" ile "üç koldan
                          saldırıyorum" aynı şey değil.
                        */}
                        {sefer.adet > 1 ? ` ×${sefer.adet}` : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 220 }}>
                  <BirimSecici army={army} unitDefs={unitDefs} birimler={h.birimler}
                    onDegis={(birimler) => socket?.emit('yagma_hedef_guncelle', {
                      listeId: secili.id, slotKey: h.slotKey, birimler,
                    })} />
                </div>

                <div style={{ minWidth: 118, textAlign: 'right', position: 'relative' }}>
                  {/* Üstüne gelince son seferin dökümü */}
                  {acikRapor?.slotKey === h.slotKey && h.sonSonuc && (
                    <SonRapor h={h} kutu={acikRapor.kutu} />
                  )}
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
                      {h.sonKayip > 0 && (
                        <div style={num({ fontSize: 9.5, color: C.danger })}>
                          −{h.sonKayip} asker
                        </div>
                      )}
                    </>
                  ) : h.sonGonderim ? (
                    /*
                      GÖNDERİLDİ AMA SONUÇ YOK — sefer daha varmadı.
                      "Henüz gidilmedi" demek yanlıştı: ordu yolda.
                    */
                    <div style={{ fontFamily: FONT.ui, fontSize: 10, color: C.warn }}>
                      sonuç bekleniyor
                    </div>
                  ) : (
                    <div style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textMute }}>
                      henüz gidilmedi
                    </div>
                  )}
                </div>

                <div style={num({ fontSize: 11, color: secilenAsker ? C.iceSoft : C.danger, minWidth: 42, textAlign: 'right' })}>
                  {secilenAsker || '0'}
                </div>

                {/*
                  TEK SATIRI GÖNDER. Asker seçilmemişse kapalı: "0 asker
                  yolla" sessizce başarısız olan bir sefer olurdu.
                */}
                <button type="button" title="yalnız bu hedefe gönder"
                  disabled={!secilenAsker}
                  onClick={() => socket?.emit('yagma_toplu_gonder', {
                    listeId: secili.id, filtre: 'hepsi', slotKey: h.slotKey,
                  })}
                  style={btn('good', {
                    padding: '4px 9px', fontSize: 9,
                    opacity: secilenAsker ? 1 : 0.4,
                  })}>GÖNDER</button>

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
