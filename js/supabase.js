import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { APP_CONFIG } from './config.js';

export const supabase = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey);

/**
 * جلب جميع المشاريع مع المنتجات والعروض وجهات الاتصال
 * @returns {Promise<Array>} المصفوفة المحولة إلى نفس شكل familiesData القديم
 */
export async function fetchAllProjects() {
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      products (*),
      deals (*),
      contacts (*)
    `);
  if (error) throw error;
  
  // تحويل البيانات إلى الشكل الذي يتوقعه الكود القديم (مثل familiesData)
  return projects.map(project => ({
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
    category: project.category_ar,
    categoryEn: project.category_en,
    products: (project.products || []).map(p => ({
      id: p.id,
      name: p.name_ar,
      nameEn: p.name_en,
      description: p.description_ar,
      descriptionEn: p.description_en,
      longDescription: p.long_description_ar,
      longDescriptionEn: p.long_description_en,
      mainImage: p.main_image,
      images: p.images || [],
      details: p.details_ar || [],
      detailsEn: p.details_en || [],
      category: p.category_ar,
      categoryEn: p.category_en
    })),
    deals: (project.deals || []).map(d => ({
      id: d.id,
      title: d.title_ar,
      titleEn: d.title_en,
      description: d.description_ar,
      descriptionEn: d.description_en,
      image: d.image,
      images: d.images || [],
      badge: d.badge_ar,
      badgeEn: d.badge_en,
      expiry: d.expiry_date
    })),
    whatsapp: project.contacts?.whatsapp || null,
    phone: project.contacts?.phone || null,
    email: project.contacts?.email || null,
    sell_points: buildSellPoints(project.contacts)
  }));
}

// دالة مساعدة لتحويل بيانات التواصل إلى مصفوفة sell_points
function buildSellPoints(contacts) {
  if (!contacts) return [];
  const points = [];
  if (contacts.instagram) points.push({ type: 'instagram', value: contacts.instagram });
  if (contacts.telegram) points.push({ type: 'telegram', value: contacts.telegram });
  if (contacts.snapchat) points.push({ type: 'snapchat', value: contacts.snapchat });
  if (contacts.tiktok) points.push({ type: 'tiktok', value: contacts.tiktok });
  if (contacts.facebook) points.push({ type: 'facebook', value: contacts.facebook });
  if (contacts.twitter) points.push({ type: 'twitter', value: contacts.twitter });
  if (contacts.website) points.push({ type: 'website', value: contacts.website });
  return points;
}
