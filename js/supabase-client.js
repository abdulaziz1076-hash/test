import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { APP_CONFIG } from './config.js';

export const supabase = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey);

// دوال مساعدة للتعامل مع الجداول
export const db = {
  async getProjects(filters = {}) {
    let query = supabase.from('projects').select('*');
    if (filters.emirate && filters.emirate !== 'all') 
      query = query.eq('emirate', filters.emirate);
    if (filters.category && filters.category !== 'all') 
      query = query.eq('category_ar', filters.category);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getProducts(projectId) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('project_id', projectId);
    if (error) throw error;
    return data;
  },

  async getDeals(projectId) {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('project_id', projectId);
    if (error) throw error;
    return data;
  },

  async getContacts(projectId) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('project_id', projectId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || {};
  }
};
