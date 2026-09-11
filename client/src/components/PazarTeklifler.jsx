/**
 * PAZAR — OYUNCULAR ARASI TEKLİFLER.
 *
 * Üç iş bir arada: teklif aç, açık teklifleri gez, kendi tekliflerini ve
 * yoldaki gönderilerini izle.
 *
 * ORAN SERBEST. NPC takasının sabit oranı var (2:1, 4:1); burada fiyatı
 * oyuncu koyuyor. "2000 odun veririm, 6000 kereste isterim" diyebilir;
 * beğenen kabul eder. Pazarın anlamı bu — NPC'den pahalıya satmakla
 * NPC'den ucuza almak arasındaki boşlukta ticaret var.
 *
 * MAL VE TÜCCAR TEKLİF AÇILIRKEN AYRILIR (bkz. server/index.js ·
 * pazar_teklif_ac): aynı malla on teklif açılmasın diye.
 */
import { useEffect, useMemo, useState } from 'react';
import { C, FONT, btn, label as lbl, num, short } from '../theme';
import { RES_LABEL } from '../flows';
import { RES_COLOR } from '../theme';
import Icon from './Icons';

const YENILE_MS = 12000;

/** Kaynak seçici — simgeler BÜYÜK, pazarda mal seçmek asıl iş */
function MalSecici({ deger, onSec, kaynaklar, resources, boyut = 22 }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {kaynaklar.map((r) => {
        const secili = deger === r;
        const elde = resources ? Math.floor(resources[r] || 0) : null;
        return (
          <button key={r} type="button" onClick={() => onSec(r)}
            title={`${RES_LABEL[r] || r}${elde != null ? ` · elinde ${elde}` : ''}`}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              padding: '5px 6px', borderRadius: 5, cursor: 'pointer',
              background: secili ? 'rgba(143,220,255,0.16)' : 'rgba(8,14,24,0.5)',
              border: `1px solid ${secili ? C.lineBright : C.line}`,
            }}>
            <Icon name={r} size={boyut} color={RES_COLOR[r] || C.iceSoft}
              style={{ opacity: secili ? 1 : 0.72 }} />
            {elde != null && (
              <span style={num({ fontSize: 8.5, color: secili ? C.frost : C.textMute })}>
                {short(elde)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Bir malın simgesi + miktarı — listelerde tekrar eden parça */
function Mal({ kaynak, miktar, renk = C.frost, boyut = 22 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {/* Simge KAYNAK renginde, sayı bağlam renginde (veren/alan) */}
      <Icon name={kaynak} size={boyut} color={RES_COLOR[kaynak] || renk} />
      <span style={num({ fontSize: 13, color: renk })}>{short(miktar)}</span>
    </span>
  );
}

export default function PazarTeklifler({
  socket, pazar, resources = {}, onAc, onIptal, onKabul,
}) {
  const [liste, setListe] = useState([]);
  const [veren, setVeren] = useState('odun');
  const [alan, setAlan] = useState('kereste');
  const [verenMiktar, setVerenMiktar] = useState(2000);
  const [alanMiktar, setAlanMiktar] = useState(6000);

  const kaynaklar = pazar?.kaynaklar || [];

  /*
    Liste TALEP ÜZERİNE geliyor: bütün köyleri taramak her tick'te
    yapılacak iş değil. Panel açıkken periyodik tazeleniyor.
  */
  useEffect(() => {
    if (!socket) return undefined;
    const onListe = (d) => setListe(d?.teklifler || []);
    socket.on('pazar_teklif_listesi', onListe);
    socket.emit('pazar_teklifleri');
    const iv = setInterval(() => socket.emit('pazar_teklifleri'), YENILE_MS);
    return () => { socket.off('pazar_teklif_listesi', onListe); clearInterval(iv); };
  }, [socket]);

  const benim = pazar?.teklifler || [];
  const gonderiler = pazar?.gonderiler || [];
  const bosTuccar = pazar?.tuccarBos ?? 0;
  const kapasite = pazar?.tuccarKapasitesi || 2000;

  const gerekenTuccar = Math.ceil(Math.max(0, verenMiktar) / kapasite) || 0;
  const elde = Math.floor(resources[veren] || 0);
  const acilabilir = veren !== alan && verenMiktar > 0 && alanMiktar > 0
    && verenMiktar <= elde && gerekenTuccar <= bosTuccar;

  /** Başkalarının teklifleri — kendiminkiler ayrı bölümde */
  const digerleri = useMemo(() => liste.filter((t) => !t.benimMi), [liste]);

  const sayiKutu = {
    width: 96, padding: '5px 8px', borderRadius: 4,
    background: 'rgba(6,11,18,0.8)', color: C.frost,
    border: `1px solid ${C.line}`, fontFamily: FONT.num, fontSize: 12,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {/* ── Teklif aç ── */}
      <div style={{
        background: 'rgba(8,14,22,0.5)', border: `1px solid ${C.line}`,
        borderRadius: 7, padding: 10,
      }}>
        <div style={lbl({ fontSize: 8, marginBottom: 7 })}>Satışa çıkar</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={lbl({ fontSize: 7.5, marginBottom: 4, color: C.warn })}>VERECEĞİM</div>
            <MalSecici deger={veren} onSec={setVeren} kaynaklar={kaynaklar}
              resources={resources} />
            <input type="number" min={1} value={verenMiktar}
              onChange={(e) => setVerenMiktar(Math.max(0, Number(e.target.value) || 0))}
              style={{ ...sayiKutu, marginTop: 6 }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={lbl({ fontSize: 7.5, marginBottom: 4, color: C.good })}>İSTEDİĞİM</div>
            <MalSecici deger={alan} onSec={setAlan} kaynaklar={kaynaklar} />
            <input type="number" min={1} value={alanMiktar}
              onChange={(e) => setAlanMiktar(Math.max(0, Number(e.target.value) || 0))}
              style={{ ...sayiKutu, marginTop: 6 }} />
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 9, marginTop: 9, flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>
            {gerekenTuccar} tüccar gerekiyor · {bosTuccar} boşta
          </span>
          <span style={{ flex: 1 }} />
          <button type="button" disabled={!acilabilir}
            onClick={() => onAc?.({ veren, alan, verenMiktar, alanMiktar })}
            style={btn(acilabilir ? 'primary' : 'disabled', { fontSize: 10 })}>
            {veren === alan ? 'Aynı kaynak olmaz'
              : verenMiktar > elde ? 'Yetersiz kaynak'
                : gerekenTuccar > bosTuccar ? 'Tüccar yetmiyor'
                  : 'Satışa çıkar'}
          </button>
        </div>
      </div>

      {/* ── Açık teklifler ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <span style={lbl({ fontSize: 8 })}>Açık teklifler</span>
          <span style={num({ fontSize: 10, color: digerleri.length ? C.iceSoft : C.textMute })}>
            {digerleri.length}
          </span>
        </div>
        {digerleri.length === 0 ? (
          <div style={{ fontFamily: FONT.ui, fontSize: 10, color: C.textMute, padding: '4px 2px' }}>
            Şu an satışta bir şey yok.
          </div>
        ) : (
          <div className="tn-scroll" style={{
            display: 'flex', flexDirection: 'column', gap: 5,
            maxHeight: 190, overflowY: 'auto', paddingRight: 2,
          }}>
            {digerleri.map((t) => {
              const gerek = Math.ceil(t.alanMiktar / kapasite);
              const malVar = (resources[t.alan] || 0) >= t.alanMiktar;
              const varMi = malVar && gerek <= bosTuccar;
              return (
                <div key={`${t.slotKey}#${t.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  padding: '7px 9px', borderRadius: 6,
                  background: 'rgba(8,17,28,0.6)', border: `1px solid ${C.lineSoft}`,
                }}>
                  <Mal kaynak={t.veren} miktar={t.verenMiktar} renk={C.good} />
                  <Icon name="artis" size={11} color={C.textMute}
                    style={{ transform: 'rotate(90deg)' }} />
                  <Mal kaynak={t.alan} miktar={t.alanMiktar} renk={C.warn} />
                  <span style={{ flex: 1, minWidth: 40 }} />
                  <span style={{
                    fontFamily: FONT.ui, fontSize: 9, color: C.textFaint,
                    whiteSpace: 'nowrap',
                  }}>
                    {t.saticiSahip || t.satici} · {gerek} tüccar
                  </span>
                  <button type="button" disabled={!varMi}
                    onClick={() => onKabul?.({ slotKey: t.slotKey, id: t.id })}
                    title={varMi ? 'Kabul et'
                      : !malVar ? 'İstediği kaynak sende yok' : 'Yeterli tüccarın yok'}
                    style={btn(varMi ? 'good' : 'disabled', { fontSize: 9.5, padding: '3px 10px' })}>
                    KABUL
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Kendi tekliflerim ── */}
      {benim.length > 0 && (
        <div>
          <div style={lbl({ fontSize: 8, marginBottom: 6 })}>Benim tekliflerim</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {benim.map((t) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                padding: '7px 9px', borderRadius: 6,
                background: 'rgba(143,220,255,0.07)', border: `1px solid ${C.line}`,
              }}>
                <Mal kaynak={t.veren} miktar={t.verenMiktar} renk={C.warn} />
                <Icon name="artis" size={11} color={C.textMute}
                  style={{ transform: 'rotate(90deg)' }} />
                <Mal kaynak={t.alan} miktar={t.alanMiktar} renk={C.good} />
                <span style={{ flex: 1, minWidth: 30 }} />
                <span style={{ fontFamily: FONT.ui, fontSize: 9, color: C.textFaint }}>
                  {t.tuccar} tüccar bağlı
                </span>
                <button type="button" onClick={() => onIptal?.({ id: t.id })}
                  title="Teklifi geri çek — mal ve tüccar iade edilir"
                  style={btn('danger', { fontSize: 9.5, padding: '3px 10px' })}>
                  GERİ ÇEK
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Yoldaki gönderiler ── */}
      {gonderiler.length > 0 && (
        <div>
          <div style={lbl({ fontSize: 8, marginBottom: 6 })}>Yoldaki kervanlar</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {gonderiler.map((g) => (
              <div key={g.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 9px', borderRadius: 6,
                background: 'rgba(8,17,28,0.5)', border: `1px solid ${C.lineSoft}`,
              }}>
                <Icon name={g.faz === 'gidis' ? 'yukari' : 'asagi'} size={11}
                  color={g.faz === 'gidis' ? C.warn : C.iceSoft} strokeWidth={2.3} />
                <Mal kaynak={g.kaynak} miktar={g.miktar} renk={C.iceSoft} boyut={18} />
                <span style={{ fontFamily: FONT.ui, fontSize: 9.5, color: C.textMute }}>
                  {g.faz === 'gidis' ? `→ ${g.hedefAd}` : 'dönüyor'}
                </span>
                <span style={{ flex: 1 }} />
                <span style={num({ fontSize: 10.5, color: C.good })}>
                  {Math.max(0, Math.round(g.kalanSn))} sn
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
