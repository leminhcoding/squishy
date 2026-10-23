const palettes={
  warm:['#e6b16c','#edc794','#dba2a8','#b6c99e','#bdafd7'],
  cream:['#f3e5cb','#e9bcc9','#cfbddf','#bad3bd','#e8cc92'],
  pink:['#eaa1b4','#c6b4dd','#b5d6c1','#edc386','#b6cddd'],
};
const item=(name,type,category,color,material,note,extra={})=>{
  const {palette:paletteKey='cream',...options}=extra;
  return {name,type,category,color,material,note,tag:{foam:'Foam hồi chậm',marshmallow:'Foam marshmallow',mochi:'Mochi đàn hồi',silicone:'Silicone dẻo',gel:'Gel đặc'}[material],palette:[color,...palettes[paletteKey].filter(c=>c!==color)].slice(0,5),softness:75,bounce:55,...options};
};
export const categories=[{id:'all',label:'Tất cả'},{id:'food',label:'Tiệm bánh & món ngon'},{id:'fruit',label:'Trái cây'},{id:'friends',label:'Bạn nhỏ'},{id:'objects',label:'Đồ vật'}];
export const catalog=[
  item('Mèo quýt','cat','friends','#efad65','foam','Một cục nắng nhỏ, mềm như mochi.'),
  item('Thỏ mây','bunny','friends','#f2dfd8','marshmallow','Xốp nhẹ, lún sâu. Cứ chậm rãi mà chơi.',{softness:90,bounce:40}),
  item('Ếch matcha','frog','friends','#aebd83','mochi','Miết nhẹ để nắn. Thả tay để hồi hình.',{softness:65,bounce:80}),
  item('Ma khoai môn','ghost','friends','#beb0d7','silicone','Dẻo mềm, kéo được, chẳng vội trở về.',{softness:85,bounce:50}),
  item('Đào mochi','peach','fruit','#eeb2a6','gel','Bóp chậm thôi. Bạn nhỏ thích được nâng niu.',{softness:80}),
  item('Bánh mì sữa','toast','food','#f0d6a7','foam','Viền bánh vàng ươm, ruột mềm xốp. Một chiếc toast thật quen.',{palette:'warm'}),
  item('Croissant bơ','croissant','food','#dfa15b','foam','Từng lớp bánh cong cong, bóp một chút là thấy mềm lòng.',{palette:'warm',pressPoint:[0,.05,.4]}),
  item('Bánh bao ú','bao','food','#f4e8d5','marshmallow','Tròn ú, nếp gấp nhỏ, mềm như vừa ra khỏi xửng.',{softness:90,bounce:40}),
  item('Donut dâu','donut','food','#eaa1b4','foam','Một vòng bánh phủ đường hồng và cốm màu tí hon.',{palette:'pink',pressPoint:[0,-.58,.3]}),
  item('Dâu tây','strawberry','fruit','#dc777e','foam','Hạt vàng li ti, lá xanh xinh, đỏ hồng như ở tiệm.',{palette:'pink'}),
  item('Miếng dưa hấu','watermelon','fruit','#e48788','mochi','Vỏ xanh, ruột hồng. Một lát mùa hè trong lòng bàn tay.',{softness:80,pressPoint:[0,-.15,.4]}),
  item('Hộp sữa dâu','milk','objects','#edb5c4','foam','Chiếc hộp sữa pastel nhỏ, cầm lên là muốn bóp.',{palette:'pink',pressPoint:[0,0,.48]}),
  item('Kem ốc quế','icecream','food','#f0bfd0','marshmallow','Một viên kem bông xốp. Bóp thoải mái, chẳng lo tan.',{softness:85,bounce:40,pressPoint:[0,.45,.6]}),
  item('Pancake mật ong','pancake','food','#e2b379','foam','Ba lớp bánh mềm, thêm một miếng bơ vàng nho nhỏ.',{palette:'warm',pressPoint:[0,-.1,.7]}),
  item('Bàn chân mèo','paw','friends','#f0ded3','silicone','Đệm thịt hồng hồng, mềm dẻo đúng kiểu paw squishy.',{softness:90,bounce:50}),
  item('Cơm nắm','onigiri','food','#f3ead9','mochi','Một chiếc onigiri ú nu với áo rong biển tí xíu.',{softness:70,bounce:75,pressPoint:[0,-.05,.5]}),
  item('Sushi trứng','sushi','food','#eed189','foam','Trứng vàng, cơm trắng, thêm một chiếc đai rong biển.',{pressPoint:[0,-.05,.55]}),
  item('Vịt vàng','duck','friends','#efd27d','mochi','Mỏ cam, bụng tròn. Bạn vịt béo mềm của tiệm đồ chơi.',{softness:70,bounce:80}),
  item('Khối thạch','cube','objects','#a4cbd6','gel','Bóp chậm để lún sâu, kéo nhẹ để thấy khối thạch phồng lên.',{softness:70,bounce:45,pressPoint:[0,0,.7]}),
  item('Burger mini','burger','food','#dda363','foam','Bánh mè, xà lách, phô mai. Một chiếc burger để bóp thật đã.',{palette:'warm',pressPoint:[0,0,.75]}),
];

export function matchingIndices(category='all',query=''){
  const normalize=value=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').trim();
  const search=normalize(query);
  return catalog.flatMap((model,i)=>(category==='all'||model.category===category)&&normalize(model.name+' '+model.tag).includes(search)?[i]:[]);
}
