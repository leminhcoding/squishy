# Squishy Studio

Web 3D độc lập với 20 mẫu squishy, 5 kiểu chất liệu, biến dạng tại điểm chạm và âm thanh Foley thu thật. Chạy hoàn toàn trong trình duyệt. Không cần backend, tài khoản ChatGPT, API key hay dịch vụ Sites.

Bộ sưu tập gồm mèo, thỏ, ếch, ma, đào, bánh mì sữa, croissant, bánh bao, donut, dâu tây, dưa hấu, hộp sữa, kem ốc quế, pancake, bàn chân mèo, cơm nắm, sushi trứng, vịt, khối thạch và burger. Có bộ lọc theo nhóm và tìm kiếm tiếng Việt không dấu.

## Chạy trên máy

Cần Node.js 20 trở lên. Không có dependency cần cài đặt.

```sh
git clone https://github.com/leminhcoding/squishy.git
cd squishy
npm run dev
```

Mở http://localhost:4173. Nếu dùng workspace hiện tại, chạy `npm run dev` trong thư mục `squishy-studio`; không cần clone lại. Đổi cổng bằng `PORT=4174 npm run dev`.

```sh
npm test
npm run build
```

`build` kiểm tra cú pháp, tài nguyên âm thanh và cấu hình; `dist/` đã chứa toàn bộ web, không cần biên dịch hay tải Three.js từ CDN.

## Deploy Vercel

### Từ GitHub

1. Mã nguồn nằm tại [leminhcoding/squishy](https://github.com/leminhcoding/squishy).
2. Trong Vercel, chọn **Add New → Project → Import** repo này, giữ **Root Directory: .**.
3. Chọn **Framework Preset: Other**. File `vercel.json` đã đặt **Build Command: npm run build**, **Output Directory: dist**.
4. Nhấn **Deploy**. Không cần environment variables.

Nếu repo chứa cả thư mục cha `squishy/`, chọn **Root Directory: squishy-studio**. Nếu dùng nguyên workspace, file `vercel.json` ở thư mục cha cũng hỗ trợ deploy từ đó.

### Từ terminal

Chạy bên trong thư mục `squishy-studio`:

```sh
npx vercel
# Sau khi kiểm tra bản preview:
npx vercel --prod
```

Vercel CLI sẽ hướng dẫn đăng nhập và chọn tài khoản/project của bạn. Cấu hình theo [tài liệu Vercel](https://vercel.com/docs/project-configuration/vercel-json).

## Chơi

- Nhấn giữ lên bề mặt: tạo vết lún tại điểm chạm. Giữ lâu để thấy độ lún tăng dần.
- Kéo khi đang giữ: nắn/kéo vùng đó. Kéo xuống sâu hơn để tăng lực bóp.
- Thả tay: foam giữ vết lún rồi hồi chậm; mochi hồi nhanh; gel phản ứng chắc hơn với thao tác nhanh.
- Chọn **Xoay** rồi kéo, hoặc kéo vùng trống. Lăn chuột để zoom.
- **Space**: bóp; **← / →**: xoay; **1–9**: chọn nhanh 9 mẫu đầu; **B / R**: chuyển chế độ. Dùng bộ sưu tập để chọn đủ 20 mẫu.
- Lọc theo nhóm hoặc gõ tên, ví dụ `banh mi`, `dau tay`, `dao`. Nút ngẫu nhiên chọn trong nhóm/kết quả đang hiển thị.
- Chọn chất liệu độc lập với nhân vật. Điều chỉnh độ mềm, tốc độ hồi, màu và âm lượng.
- Âm thanh cần một tương tác đầu tiên để trình duyệt cho phép phát. Giữ yên sẽ im dần; kéo/nén/hồi hình mới tạo âm thanh.

## Mã nguồn

| File | Chức năng |
| --- | --- |
| `dist/index.html`, `dist/style.css` | Giao diện tiếng Việt, responsive |
| `dist/app.js` | Nhân vật, dựng cảnh, ánh sáng, thao tác và picking bề mặt đã biến dạng |
| `dist/catalog.js` | Danh mục 20 mẫu, nhóm, bảng màu và tìm kiếm không dấu |
| `dist/shop-models.js` | Dựng 15 mẫu mới quen thuộc ở tiệm squishy bằng hình học 3D |
| `dist/physics.js` | Đàn hồi nhớt với thành phần hồi nhanh, lưu vết lún, creep và lực cản theo tốc độ |
| `dist/profiles.js` | Các thông số có thể chỉnh cho từng chất liệu |
| `dist/surface.js` | Shader lỗ xốp nhỏ, độ nhám và bề mặt mịn/bóng theo chất liệu |
| `dist/audio.js`, `dist/audio/` | Phát các đoạn Foley ngắn theo vận tốc biến dạng; không dùng oscillator |
| `test/physics.test.js` | Kiểm tra hồi hình, hướng lực, ổn định, giữ im lặng và lực cản của gel |
| `docs/material-research.md` | Nguồn tham khảo, video đã xem, mốc thời gian và giới hạn mô phỏng |
| `THIRD_PARTY.md` | Nguồn và giấy phép của âm thanh, Three.js |

Các preset là mô phỏng thị giác lấy cảm hứng từ chất liệu thực tế, không phải bản sao vật lý đã đo đạc của một thương hiệu. Xem chi tiết trong tài liệu nghiên cứu. Hiện hỗ trợ một điểm chạm đang điều khiển và tối đa bốn vết lún đang hồi; chưa hỗ trợ bóp hai tay đa chạm.

## Âm thanh và tài nguyên

Ba file WAV được đóng gói sẵn. Chúng được cắt, chuyển mono, lọc tiếng ù và cân mức từ các bản ghi CC0 về bọt biển, cao su và âm thanh ướt; đây là Foley thay thế, không phải bản thu trực tiếp của iBLOOM/NeeDoh/Mellojoy. Không lấy audio hoặc hình ảnh của video thương hiệu vào sản phẩm.

Three.js được lưu sẵn trong `dist/vendor/`. Google Fonts có font dự phòng nếu offline. Để tái tạo file âm thanh, xem nguồn và các đoạn cắt trong `THIRD_PARTY.md` và `scripts/prepare-audio.py`.
