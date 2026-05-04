// Health tips database with sources from reputable medical websites
// Format: 1 sentence per tip

const DEFAULT_HEALTH_TIPS = [
  'Tay bẩn thấy rõ thì xà phòng + nước là lựa chọn tốt nhất, vì nó rửa trôi bụi bẩn và vi sinh vật.',
  'Hand sanitizer hợp nhất khi tay không thấy bẩn và cần sát khuẩn nhanh; nên chọn loại có ít nhất 60% alcohol.',
  'CT cũng dùng tia X như X-quang, còn MRI không dùng tia X mà dùng từ trường và sóng radio.',
  'MRI mạnh nhất ở mô mềm như não, tủy sống, dây chằng và cơ.',
  'X-quang nhanh và rẻ, nhưng ảnh 2D nên dễ bị chồng cấu trúc.',
  'CT chi tiết hơn X-quang và hay dùng trong cấp cứu, nhưng có liều tia cao hơn.',
];

// Additional tips from health websites (WHO, CDC, Mayo Clinic, etc.)
const EXTERNAL_HEALTH_TIPS = [
  'Uống đủ nước mỗi ngày (khoảng 2-3 lít) giúp cơ thể duy trì cân bằng chất lỏng và hỗ trợ các chức năng sinh lý.',
  'Ngủ đủ 7-9 tiếng mỗi đêm là rất quan trọng để cơ thể phục hồi và tăng cường hệ miễn dịch.',
  'Tập thể dục ít nhất 150 phút mỗi tuần (như đi bộ nhanh) giúp giảm nguy cơ các bệnh mãn tính.',
  'Ăn cân bằng giữa rau, trái cây, protein và ngũ cốc nguyên hạt để cung cấp đủ chất dinh dưỡng.',
  'Giảm tiêu thụ muối và đường để ngăn ngừa tăng huyết áp và tiểu đường type 2.',
  'Rửa tay thường xuyên đặc biệt trước ăn và sau khi vệ sinh để phòng chống các bệnh truyền nhiễm.',
  'Tiêm chủng đầy đủ theo khuyến cáo của nhà chức trách giúp bảo vệ bản thân và cộng đồng.',
  'Bỏ thuốc lá giảm nguy cơ ung thư, bệnh tim và các vấn đề hô hấp.',
  'Hạn chế rượu và bia để bảo vệ gan, tim và giảm nguy cơ ung thư.',
  'Duy trì trọng lượng lành mạnh bằng cách cân bằng dinh dưỡng và vận động.',
  'Kiểm tra sức khỏe định kỳ để phát hiện sớm các vấn đề sức khỏe.',
  'Giám sát huyết áp, cholesterol và đường huyết định kỳ nếu có yếu tố nguy cơ.',
  'Sử dụng kem chống nắng SPF 30+ hằng ngày để bảo vệ da khỏi tia UV.',
  'Tránh tiếp xúc với khí độc, bụi công nghiệp và các tác nhân gây hại khác.',
  'Quản lý căng thẳng thông qua thiền, yoga hoặc các hoạt động yêu thích để cải thiện sức khỏe tinh thần.',
  'Các triệu chứng cúm bao gồm sốt, ho, mệt mỏi và người nên về nhà, nghỉ ngơi và uống nhiều nước.',
  'Dấu hiệu của cơn đau tim bao gồm đau ngực, khó thở và đau ở cánh tay trái - gọi cấp cứu ngay.',
  'Mỗi người nên biết cách sơ cứu cơ bản như hô hấp nhân tạo và cấp cứu chảy máu.',
  'Thực hiện tự sờ vú hàng tháng và khám tầm soát ung thư theo khuyến cáo của bác sĩ.',
  'Sức khỏe tự do cơn panic bao gồm việc kiểm soát nhịp thở sâu, tìm kiếm sự hỗ trợ và liệp pháp hành vi.',
  'Các bệnh mãn tính như tiểu đường có thể quản lý hiệu quả bằng thuốc, chế độ ăn và lối sống.',
  'Caffeine có thể cải thiện tập trung và năng suất nhưng nên hạn chế dưới 400mg mỗi ngày.',
  'Chia sẻ dụng cụ cá nhân như bàn chải đánh răng, dao cạo hoặc trang riêng tư có thể lây truyền bệnh.',
  'Các enzyme tiêu hóa giúp cơ thể phân hủy thức ăn, vì vậy nhai kỹ càng là quan trọng.',
  'Các vi khuẩn tốt trong ruột (probiotics) hỗ trợ tiêu hóa và miễn dịch - có trong sữa chua và kefir.',
];

const STORAGE_KEY = 'chronos_health_tips';

export interface HealthTipsStorage {
  default: string[];
  custom: string[];
  lastUpdated: number;
}

export const healthTipsManager = {
  /**
   * Get all health tips (default + custom)
   */
  getAllTips: (): string[] => {
    const stored = healthTipsManager.getStoredTips();
    return [...stored.default, ...stored.custom];
  },

  /**
   * Get stored health tips from localStorage
   */
  getStoredTips: (): HealthTipsStorage => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load health tips', e);
    }
    return {
      default: DEFAULT_HEALTH_TIPS,
      custom: [],
      lastUpdated: Date.now(),
    };
  },

  /**
   * Add new tips (append only, don't replace)
   */
  addNewTips: (newTips: string[]): void => {
    const stored = healthTipsManager.getStoredTips();
    // Only add tips that don't already exist
    const uniqueNewTips = newTips.filter(
      tip => ![...stored.default, ...stored.custom].includes(tip)
    );
    stored.custom.push(...uniqueNewTips);
    stored.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  },

  /**
   * Get tips from external sources (simulated with local data)
   * In production, this would fetch from real APIs like WHO, CDC, Mayo Clinic, etc.
   */
  fetchExternalTips: async (limit: number = 5): Promise<string[]> => {
    // Check if online
    if (!navigator.onLine) {
      throw new Error('No internet connection');
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const stored = healthTipsManager.getStoredTips();
    const allExternalTips = EXTERNAL_HEALTH_TIPS.filter(
      tip => ![...stored.default, ...stored.custom].includes(tip)
    );

    // Return random tips from external sources
    const shuffled = [...allExternalTips].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  },

  /**
   * Add tips from external sources
   */
  addExternalTips: async (limit: number = 5): Promise<string[]> => {
    try {
      const tips = await healthTipsManager.fetchExternalTips(limit);
      healthTipsManager.addNewTips(tips);
      return tips;
    } catch (error) {
      console.error('Failed to fetch external tips:', error);
      throw error;
    }
  },

  /**
   * Reset to default tips (useful for debugging)
   */
  resetToDefault: (): void => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        default: DEFAULT_HEALTH_TIPS,
        custom: [],
        lastUpdated: Date.now(),
      })
    );
  },

  /**
   * Get count of new tips available from external sources
   */
  getAvailableNewTipsCount: (): number => {
    const stored = healthTipsManager.getStoredTips();
    const existingTips = new Set([...stored.default, ...stored.custom]);
    return EXTERNAL_HEALTH_TIPS.filter(tip => !existingTips.has(tip)).length;
  },
};