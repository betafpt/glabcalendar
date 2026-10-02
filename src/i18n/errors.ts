export function localizeErrorMessage(message: string | null | undefined, locale: "vi" | "en") {
  if (!message || locale === "en") return message ?? "";

  const exact: Record<string, string> = {
    "Project data is invalid.": "Dữ liệu dự án chưa hợp lệ.",
    "Project name is required.": "Vui lòng nhập tên dự án.",
    "End date cannot be before start date.": "Ngày kết thúc không thể trước ngày bắt đầu.",
    "Project not found.": "Không tìm thấy dự án.",
    "Crew member data is invalid.": "Dữ liệu nhân sự chưa hợp lệ.",
    "Crew member name is required.": "Vui lòng nhập tên nhân sự.",
    "Enter a valid email address.": "Vui lòng nhập địa chỉ email hợp lệ.",
    "Equipment data is invalid.": "Dữ liệu thiết bị chưa hợp lệ.",
    "Equipment name is required.": "Vui lòng nhập tên thiết bị.",
    "Shoot data is invalid.": "Dữ liệu buổi quay chưa hợp lệ.",
    "Shoot title is required.": "Vui lòng nhập tên buổi quay.",
    "End time must be after start time.": "Giờ kết thúc phải sau giờ bắt đầu.",
    "Use a JPG, PNG, or WebP image.": "Vui lòng dùng ảnh JPG, PNG hoặc WebP.",
    "Image is too large. Please choose a smaller image.": "Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn.",
    "Crew assignment data is invalid.": "Thông tin phân công nhân sự chưa hợp lệ.",
    "Crew member is already scheduled for an overlapping shoot.": "Nhân sự này đã có lịch ở một buổi quay bị trùng thời gian.",
    "Equipment booking data is invalid.": "Thông tin đặt thiết bị chưa hợp lệ.",
    "Equipment is already booked for an overlapping shoot.": "Thiết bị này đã được đặt cho một buổi quay bị trùng thời gian.",
    "Shoot not found.": "Không tìm thấy buổi quay.",
    "Equipment item not found.": "Không tìm thấy thiết bị.",
    "Crew member not found.": "Không tìm thấy nhân sự.",
    "Unable to load calendar.": "Không thể tải lịch lúc này.",
    "Unable to load crew.": "Không thể tải danh sách nhân sự lúc này.",
    "Unable to load equipment.": "Không thể tải danh sách thiết bị lúc này.",
    "Unable to load projects right now.": "Không thể tải danh sách dự án lúc này.",
    "Unable to load shoots right now.": "Không thể tải danh sách buổi quay lúc này.",
    "Unable to load project right now.": "Không thể tải thông tin dự án lúc này.",
    "Unable to load shoot details right now.": "Không thể tải chi tiết buổi quay lúc này.",
    "Unable to load crew member details.": "Không thể tải chi tiết nhân sự lúc này.",
    "Unable to load equipment details.": "Không thể tải chi tiết thiết bị lúc này.",
    "Unable to load today's schedule.": "Không thể tải lịch hôm nay lúc này.",
  };

  return exact[message] ?? (/^[A-Za-z]/.test(message) ? "Đã xảy ra lỗi. Vui lòng thử lại." : message);
}
