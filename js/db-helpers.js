// تحويل بيانات المشروع من شكل Supabase إلى شكل familiesData القديم
export function convertProject(project) {
  return {
    id: project.id,
    name: project.name_ar,
    nameEn: project.name_en,
    is_paid: project.is_paid,
    emirate: project.emirate,
    description: project.description_ar,
    descriptionEn: project.description_en,
    longDescription: project.long_description_ar,
    longDescriptionEn: project.long_description_en,
    image: project.image,
    adra_license: project.adra_license ? "نعم" : "لا",
    coverage: project.coverage,
    badges: [], // يمكن ملؤها لاحقاً
    badgesEn: [],
    category: project.category_ar,
    categoryEn: project.category_en,
    deals: [], // سيتم جلبها من جدول منفصل
    products: [] // سيتم جلبها من جدول products
  };
}
