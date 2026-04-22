-- جدول المشاريع (الأسر المنتجة)
CREATE TABLE projects (
  id BIGINT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  emirate TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  long_description_ar TEXT,
  long_description_en TEXT,
  image TEXT,
  adra_license BOOLEAN DEFAULT false,
  coverage TEXT DEFAULT 'الإمارة فقط',
  is_paid BOOLEAN DEFAULT false,
  category_ar TEXT,
  category_en TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول المنتجات
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  long_description_ar TEXT,
  long_description_en TEXT,
  main_image TEXT,
  images TEXT[],
  details_ar TEXT[],
  details_en TEXT[],
  category_ar TEXT,
  category_en TEXT
);

-- جدول العروض (deals)
CREATE TABLE deals (
  id TEXT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  image TEXT,
  images TEXT[],
  badge_ar TEXT,
  badge_en TEXT,
  expiry_date TEXT
);

-- جدول بيانات التواصل (مصادر البائع)
CREATE TABLE contacts (
  project_id BIGINT PRIMARY KEY REFERENCES projects(id),
  whatsapp TEXT,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  telegram TEXT,
  snapchat TEXT,
  tiktok TEXT,
  facebook TEXT,
  twitter TEXT,
  website TEXT
);

-- تفعيل Row Level Security (اختياري – للمشاريع العامة يمكن تركه مفتوحاً)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- سياسة عامة:任何人都可以读取
CREATE POLICY "Public read access" ON projects FOR SELECT USING (true);
CREATE POLICY "Public read access" ON products FOR SELECT USING (true);
CREATE POLICY "Public read access" ON deals FOR SELECT USING (true);
CREATE POLICY "Public read access" ON contacts FOR SELECT USING (true);