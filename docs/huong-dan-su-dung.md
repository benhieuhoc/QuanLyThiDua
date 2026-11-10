V# Hướng dẫn sử dụng — Quản lý lớp học (chấm điểm thi đua)

Tài liệu mô tả các thao tác trên giao diện web chấm điểm thi đua các lớp theo tuần, gồm hai phần **Nề nếp** và **Học tập**.

## Mục lục

1. [Đăng nhập và loại tài khoản](#1-đăng-nhập-và-loại-tài-khoản)
2. [Bố cục giao diện](#2-bố-cục-giao-diện)
3. [Thiết lập ban đầu (dành cho Quản lý nề nếp)](#3-thiết-lập-ban-đầu-dành-cho-quản-lý-nề-nếp)
4. [Tổng quan](#4-tổng-quan)
5. [Chấm điểm](#5-chấm-điểm)
6. [Xếp hạng](#6-xếp-hạng)
7. [Điểm lớp](#7-điểm-lớp)
8. [Năm học & tuần](#8-năm-học--tuần)
9. [Phân hiệu](#9-phân-hiệu)
10. [Giáo viên](#10-giáo-viên)
11. [Lớp học](#11-lớp-học)
12. [Học sinh](#12-học-sinh)
13. [Tài khoản](#13-tài-khoản)
14. [Đổi mật khẩu, đăng xuất](#14-đổi-mật-khẩu-đăng-xuất)
15. [Thông báo và lỗi thường gặp](#15-thông-báo-và-lỗi-thường-gặp)

---

## 1. Đăng nhập và loại tài khoản

Mở trang web, nhập **Tên đăng nhập** và **Mật khẩu**, bấm **Đăng nhập**. Nếu sai, thông báo lỗi hiện ngay trong form.

Phiên đăng nhập hết hạn sau khoảng **30 phút**. Khi hết hạn, hệ thống tự đưa về trang đăng nhập.

Có 3 loại tài khoản:

| Loại | Được vào | Được làm |
|---|---|---|
| **Quản lý nề nếp** (admin) | Mọi trang | Toàn quyền: cấu hình trường, chấm điểm mọi lớp, sửa/xóa mọi lượt chấm, khóa/mở tuần, quản lý tài khoản |
| **GVCN** (giáo viên chủ nhiệm) | Mọi trang trừ *Tài khoản* | Chỉ xem. Không chấm điểm, không sửa cấu hình |
| **Cờ đỏ** (học sinh) | *Tổng quan* và *Chấm điểm* | Chấm điểm các lớp được phân công; chỉ sửa/xóa lượt chấm do chính mình nhập |

Menu bên trái chỉ hiện các trang mà tài khoản được vào. Nút thêm/sửa/xóa cũng bị ẩn khi không có quyền.

## 2. Bố cục giao diện

- **Thanh bên trái** (màn hình rộng) chia hai nhóm:
  - **Thi đua**: Tổng quan, Chấm điểm, Xếp hạng, Điểm lớp.
  - **Cấu hình**: Năm học & tuần, Phân hiệu, Giáo viên, Lớp học, Học sinh, Tài khoản.
- **Thanh trên cùng**: tiêu đề trang và menu tài khoản (góc phải). Trên điện thoại, bấm nút **☰ (Mở menu)** để mở danh sách trang.
- Mọi thao tác ghi (thêm, sửa, xóa, khóa tuần...) đều hiện thông báo nhỏ ở góc màn hình: thành công hoặc lý do lỗi. Dữ liệu trên mọi bảng tự cập nhật sau khi lưu.
- Thao tác xóa luôn có hộp thoại xác nhận.

## 3. Thiết lập ban đầu (dành cho Quản lý nề nếp)

Làm lần lượt theo thứ tự sau trước khi bắt đầu chấm điểm:

1. **Phân hiệu** — tạo các phân hiệu, mỗi phân hiệu một mã chữ cái (A, B, C...).
2. **Giáo viên** — thêm giáo viên cho từng phân hiệu.
3. **Lớp học** — tạo lớp theo khối + phân hiệu, gán GVCN.
4. **Học sinh** — dán danh sách học sinh vào từng lớp.
5. **Năm học & tuần** — tạo năm học; hệ thống tự sinh các tuần.
6. **Tài khoản** — tạo tài khoản GVCN, cờ đỏ và phân công lớp chấm cho cờ đỏ.

## 4. Tổng quan

Trang chủ (`/`) hiện tình hình của **tuần hiện tại**:

- Số lớp đã chấm / chưa chấm, số lượt chấm trong tuần, lớp dẫn đầu.
- **Top 5** lớp có điểm cao nhất.
- Danh sách **lớp chưa chấm** trong tuần.
- Số lượng dữ liệu cấu hình (phân hiệu, giáo viên, lớp).

Quản lý nề nếp và GVCN thấy thêm các liên kết nhanh sang trang Xếp hạng, Năm học...

## 5. Chấm điểm

Trang chính của hệ thống (`/cham-diem`).

### 5.1. Chọn tuần

Ở đầu trang, chọn **Năm học** và **Tuần**. Mặc định là tuần chứa ngày hôm nay (nếu hôm nay không thuộc tuần nào thì lấy tuần gần nhất đã bắt đầu). Bên cạnh có nhãn **Đã khóa / Đang mở** của tuần.

Quản lý nề nếp có nút **Khóa tuần / Mở khóa tuần** ngay ở đầu trang.

### 5.2. Chọn lớp

- Bên trái là danh sách lớp kèm điểm và hạng trong tuần. Lọc theo **Phân hiệu** và **Khối**; hạng hiển thị luôn là **hạng toàn trường**.
- Lớp chưa có lượt chấm hiện nhãn **Chưa chấm**.
- Với cờ đỏ: ô **Chỉ lớp tôi được chấm** (mặc định bật) chỉ hiện các lớp được phân công. Bỏ chọn để xem điểm các lớp khác.
- Bấm vào một lớp để mở bảng chấm của lớp đó.

### 5.3. Bảng chấm của lớp

Hiển thị cho từng phần **Nề nếp** và **Học tập**: điểm gốc, tổng điểm cộng, tổng điểm trừ; cùng tổng điểm và hạng của lớp. Nút **Chi tiết lớp** mở trang [Điểm lớp](#7-điểm-lớp) (không hiện với cờ đỏ).

### 5.4. Thêm lượt chấm

Trong khung **Thêm lượt chấm**:

1. **Phần**: chọn *Nề nếp* hoặc *Học tập*.
2. **Nội dung**: mô tả ngắn (ví dụ "Đi trễ 2 bạn", "Tiết học tốt").
3. **Học sinh** *(không bắt buộc)*: gõ tên hoặc mã HS để tìm, bấm (hoặc dùng phím mũi tên + Enter) để chọn. Có thể chọn nhiều học sinh; bấm dấu × để bỏ.
4. Chọn **Trừ** hoặc **Cộng**, nhập **Điểm** (số dương).
5. Bấm **Thêm**.

Sau khi thêm, form giữ nguyên phần và dấu Cộng/Trừ, xóa nội dung để nhập lượt tiếp theo nhanh hơn. Khi đổi sang lớp khác, danh sách học sinh đã chọn tự xóa.

Khung thêm chỉ hiện khi tài khoản được chấm lớp đó. Nếu không, hiện dòng **Chỉ xem** kèm lý do. GVCN không có khung này.

> Cờ đỏ chưa được phân công lớp sẽ thấy thông báo: *"Bạn chưa được phân công lớp chấm điểm, liên hệ giáo viên quản lý nề nếp."*

### 5.5. Sửa, xóa lượt chấm

Danh sách lượt chấm của lớp chia theo hai phần. Mỗi lượt hiện nội dung, điểm, tên học sinh (nếu có) và **Người nhập**.

- Bấm biểu tượng **bút chì** để sửa (phần, nội dung, học sinh, điểm) rồi bấm **Lưu**.
- Bấm biểu tượng **thùng rác** → xác nhận **Xóa lượt chấm?**.

Quản lý nề nếp sửa/xóa được mọi lượt; cờ đỏ chỉ sửa/xóa lượt do chính mình nhập ở lớp còn được phân công.

### 5.6. Tuần đã khóa

Khi tuần đã khóa, khung thêm và các nút sửa/xóa bị ẩn. Quản lý nề nếp bấm **Mở khóa tuần** nếu cần chỉnh sửa.

## 6. Xếp hạng

Trang `/tong-hop` (Quản lý nề nếp, GVCN).

1. Chọn **Năm học**.
2. Chọn kiểu xếp hạng: **Tuần**, **Tháng**, **Học kỳ** hoặc **Khoảng tuần**.
3. Chọn khoảng cụ thể (ví dụ tuần 5, tháng 10, học kỳ 1). Khoảng chưa bắt đầu bị làm mờ, không chọn được. Với *Khoảng tuần*, chọn **Từ tuần** … **đến** **Đến tuần**.
4. Lọc theo **Phân hiệu** / **Khối** nếu cần (hạng được tính trong phạm vi lọc).

Bảng hiện hạng (top 3 được tô màu), điểm từng phần kèm số cộng/trừ, tổng điểm và số lượt chấm. Nếu khoảng chưa kết thúc, có nhãn **Đã tính X/Y tuần**.

Bấm vào một dòng để xem **điểm từng tuần** của lớp; trong hộp thoại có nút **Xem điểm chi tiết** để sang trang Điểm lớp.

## 7. Điểm lớp

Trang `/diem-lop` (Quản lý nề nếp, GVCN): xem chi tiết một lớp.

1. Chọn **lớp** và **khoảng thời gian**: cả năm học, học kỳ, tháng hoặc tuần.
2. Các thẻ số liệu: **Hạng toàn trường**, **Tổng điểm** (kèm trung bình/tuần), **Điểm cộng**, **Điểm trừ**.
3. **Biểu đồ cột** chênh lệch điểm so với điểm gốc theo từng tuần (cột trên = được cộng nhiều hơn, cột dưới = bị trừ nhiều hơn). Rê chuột vào cột để xem chi tiết tuần.
4. **Danh sách lượt chấm** trong khoảng đã chọn, lọc *Tất cả / Trừ / Cộng*.
5. Hai bảng **Học sinh vi phạm** (theo số lần bị trừ) và **Học sinh phấn đấu tốt** (theo số lần được cộng). Bấm vào một học sinh để lọc danh sách lượt chấm theo học sinh đó; bấm **Bỏ lọc học sinh** để trở lại.

## 8. Năm học & tuần

Trang `/nam-hoc`. GVCN chỉ xem.

### Tạo năm học

Bấm **Tạo năm học**, nhập:

- **Tên năm học** dạng `2027-2028` (năm sau = năm trước + 1).
- **Ngày bắt đầu**, **Số tuần** (1–60).
- **Gốc Nề nếp**, **Gốc Học tập**: điểm gốc mỗi tuần (mặc định 100).
- **Tuần bắt đầu học kỳ 2**: để trống thì hệ thống tự tính (khoảng giữa năm).

Hệ thống tự sinh các tuần, mỗi tuần 7 ngày. Không được trùng thời gian với năm học khác.

### Sửa / xóa năm học

- **Sửa**: đổi tên, số tuần, tuần bắt đầu HK2. Tăng số tuần sẽ sinh thêm tuần; giảm số tuần sẽ xóa các tuần cuối (không được nếu các tuần đó đã có điểm).
- **Xóa**: chỉ được khi năm học chưa có điểm thi đua (xóa luôn các tuần).

### Bảng tuần

Chọn một năm học để xem danh sách tuần: ngày, điểm gốc, số lượt chấm, trạng thái.

- **Sửa điểm gốc** của một tuần; tích **Áp dụng cho các tuần sau chưa khóa** để đổi luôn các tuần sau.
- **Khóa tuần** khi đã chấm xong: tuần khóa không thể chấm thêm hay đổi điểm gốc. **Mở khóa tuần** để sửa lại.

## 9. Phân hiệu

Trang `/phan-hieu`. Bảng hiện tên, mã, số giáo viên và số lớp.

- **Thêm phân hiệu**: nhập **Tên phân hiệu** và **Mã** (một chữ cái, ví dụ `C`). Mã dùng trong tên lớp (6**A**1).
- **Sửa**: đổi mã sẽ đổi tên mọi lớp của phân hiệu.
- **Xóa**: chỉ được khi phân hiệu không còn giáo viên và lớp.

## 10. Giáo viên

Trang `/giao-vien`.

- Tìm theo tên; lọc theo phân hiệu và trạng thái **Đã chủ nhiệm / Chưa chủ nhiệm**.
- **Thêm giáo viên**: chọn phân hiệu, nhập **Danh sách tên**, mỗi dòng một giáo viên (thêm nhiều người cùng lúc).
- **Sửa**: đổi tên hoặc phân hiệu (không đổi phân hiệu được khi đang chủ nhiệm lớp).
- **Xóa**: không được khi giáo viên đang chủ nhiệm.

## 11. Lớp học

Trang `/lop-hoc`. Tên lớp gồm khối, mã phân hiệu và số thứ tự, ví dụ **6A1**.

- **Tạo lớp**: chọn **Khối**, **Phân hiệu**, rồi chọn các **Giáo viên chủ nhiệm** — mỗi giáo viên được chọn tạo thành một lớp (thứ tự chọn = thứ tự số lớp). Dùng nút **+ / −** ở mục **Lớp chưa có GVCN** để tạo thêm lớp chưa gán giáo viên. Bấm **Tạo N lớp**.
- **Đổi chủ nhiệm**: chọn giáo viên khác cùng phân hiệu, chưa chủ nhiệm lớp nào, hoặc chọn **Không gắn giáo viên** để bỏ phân công.
- Bấm vào **tên lớp** để xem danh sách học sinh của lớp.
- **Xóa**: chỉ được khi lớp chưa có học sinh và chưa có điểm thi đua.

## 12. Học sinh

Trang `/hoc-sinh`.

- Lọc theo **Phân hiệu**, **Khối**, **Lớp**; tìm theo tên hoặc mã HS. Bảng chia trang 50 học sinh, dùng nút mũi tên **‹ / ›** (trang trước / trang sau) để chuyển trang.
- **Thêm học sinh**: chọn **Lớp**, dán danh sách vào ô **Danh sách học sinh**, mỗi dòng một học sinh theo thứ tự:

  ```
  Mã HS, Họ tên, Giới tính, Ngày sinh
  ```

  Có thể dán trực tiếp từ Excel (các cột cách nhau bằng tab), hoặc dùng dấu phẩy / chấm phẩy. Giới tính (`Nam`/`Nữ`) và ngày sinh (`dd/mm/yyyy` hoặc `yyyy-mm-dd`) có thể để trống. Mã HS phải duy nhất toàn trường; dòng lỗi được báo kèm số dòng.
- **Sửa**: đổi mã, họ tên, giới tính, ngày sinh; đổi **Lớp** để chuyển lớp.
- **Lịch sử chấm điểm**: xem các lượt chấm có gắn học sinh này.
- **Xóa**: không được khi học sinh đã có trong lượt chấm điểm.

## 13. Tài khoản

Trang `/tai-khoan` (chỉ Quản lý nề nếp). Bảng hiện tên đăng nhập, loại, người gắn, lớp chấm và trạng thái; tìm theo tên đăng nhập/họ tên, lọc theo loại.

- **Tạo tài khoản**: chọn **Loại tài khoản**:
  - *Quản lý nề nếp*: gắn giáo viên không bắt buộc.
  - *GVCN*: chọn giáo viên.
  - *Cờ đỏ*: chọn lớp rồi chọn học sinh.

  Giáo viên/học sinh đã có tài khoản không chọn được. **Tên đăng nhập** gồm 3–50 ký tự chữ thường, số, `.`, `_`, `-` (ví dụ `gvcn.6a1`); **Mật khẩu** tối thiểu 6 ký tự.
- **Sửa tài khoản**: đổi tên đăng nhập hoặc đặt lại mật khẩu mới.
- **Phân công lớp chấm** (chỉ cờ đỏ): tích các lớp mà cờ đỏ được chấm rồi bấm **Lưu**. Lớp của chính học sinh đó không chọn được.
- **Khóa / Mở khóa tài khoản**: tài khoản bị khóa không đăng nhập được. Cờ đỏ hết nhiệm kỳ nên **khóa** thay vì xóa.
- **Xóa**: lượt chấm đã nhập vẫn được giữ nhưng mất tên người nhập.

Không thể khóa hoặc xóa chính tài khoản đang đăng nhập.

## 14. Đổi mật khẩu, đăng xuất

Bấm vào tên tài khoản ở góc phải thanh trên cùng:

- **Đổi mật khẩu**: nhập *Mật khẩu hiện tại*, *Mật khẩu mới*, *Nhập lại mật khẩu mới*.
- **Đăng xuất**: quay về trang đăng nhập.

> Bản demo hiện nhãn **Bản demo · Chỉ xem** thay cho menu tài khoản; mọi thao tác ghi đều bị chặn.

## 15. Thông báo và lỗi thường gặp

| Tình huống | Cách xử lý |
|---|---|
| "Không kết nối được máy chủ" kèm nút **Thử lại** | Kiểm tra mạng / máy chủ, rồi bấm Thử lại |
| Không thấy nút thêm/sửa/xóa | Tài khoản không có quyền với thao tác đó |
| Không chấm được trong tuần | Tuần đã khóa — nhờ Quản lý nề nếp mở khóa |
| "Năm học chưa có tuần" / "Chưa có năm học" | Quản lý nề nếp tạo năm học ở trang Năm học & tuần |
| Không xóa được phân hiệu, giáo viên, lớp, học sinh, năm học | Dữ liệu đang được dùng (còn lớp, đang chủ nhiệm, còn học sinh, đã có điểm...) — đọc thông báo để biết lý do |
| Bị đưa về trang đăng nhập | Phiên hết hạn hoặc tài khoản bị khóa — đăng nhập lại |
