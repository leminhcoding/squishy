// Artistic presets informed by the sources in docs/material-research.md.
// Recovery times are simulation targets, not manufacturer measurements.
export const profiles = {
  foam: { label:'Foam hồi chậm', description:'Bề mặt mịn lì · Lún sâu · Hồi hình chậm', recovery:1.45, memory:.84, creep:.38, stiffness:160, damping:27, bulge:.12, radius:.67, rateResistance:.06, roughness:.88, coat:.015, grain:.065, audio:'foam', audioGain:.56, highpass:460, lowpass:4200 },
  marshmallow: { label:'Foam marshmallow', description:'Xốp nhẹ · Nếp gấp nhỏ · Hồi hình rất chậm', recovery:2, memory:.9, creep:.5, stiffness:130, damping:25, bulge:.08, radius:.76, rateResistance:.04, roughness:.94, coat:0, grain:.085, audio:'foam', audioGain:.45, highpass:650, lowpass:5200 },
  mochi: { label:'Mochi đàn hồi', description:'Mịn hơi bóng · Phồng sang bên · Hồi nhanh', recovery:.22, memory:.18, creep:.16, stiffness:230, damping:24, bulge:.78, radius:.73, rateResistance:.12, roughness:.48, coat:.32, grain:.008, audio:'rubber', audioGain:.2, highpass:160, lowpass:1700 },
  silicone: { label:'Silicone dẻo', description:'Mịn mượt · Kéo dẻo · Hồi từ từ', recovery:.8, memory:.65, creep:.3, stiffness:150, damping:25, bulge:.62, radius:.72, rateResistance:.1, roughness:.58, coat:.18, grain:.012, audio:'squelch', audioGain:.26, highpass:160, lowpass:2200 },
  gel: { label:'Gel đặc', description:'Mọng bóng · Bóp nhanh thấy chắc · Bóp chậm lún sâu', recovery:1.05, memory:.73, creep:.7, stiffness:155, damping:27, bulge:.92, radius:.8, rateResistance:.85, roughness:.29, coat:.65, grain:.004, audio:'squelch', audioGain:.3, highpass:100, lowpass:1900 },
};
